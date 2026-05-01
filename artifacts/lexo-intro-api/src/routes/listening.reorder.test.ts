import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import http from "node:http";
import express from "express";

// ---------------------------------------------------------------------------
// End-to-end shape contract for POST /admin/tests/reorder.
//
// `reorderTestsInSection` (the same-section drag-and-drop endpoint) is the
// sibling of /admin/tests/move. Its store-layer behaviour is covered by
// unit tests, but no test exercises the actual Express handler — so a
// rename or a new required field on the wire would silently break admins
// (the UI just shows a "Reorder failed" toast).
//
// This spec follows the exact pattern of `listening.move.test.ts`:
// it spins up the real `listeningAdminRouter`, swaps in an in-memory
// `reorderTestsInSection` mirroring the real store contract, and issues
// real HTTP POSTs:
//
//   1. Forward reorder — section 2's [charlie, delta, echo] becomes
//      [delta, charlie, echo]. Asserts a 200 response and the new
//      sortOrders.
//   2. Inverse reorder — restoring the original order leaves the table
//      byte-for-byte where it started.
//
// Negative tests confirm the route rejects payloads missing `sectionId` or
// `slugs` (or with the wrong shape) BEFORE invoking the store, so a
// frontend that ever drops/renames either field fails CI loudly.
//
// The fixture mirrors `listening.move.test.ts` so the two specs share
// intent and evolve together.
// ---------------------------------------------------------------------------

vi.mock("@workspace/lexo-intro-db", () => ({
  db: {
    execute: vi.fn().mockResolvedValue(undefined),
    select: vi.fn(),
    insert: vi.fn(),
  },
}));

vi.mock("@workspace/lexo-intro-db/schema", () => ({
  listeningAttempts: {},
  listeningTests: {},
  students: {},
  settings: {},
  accessCodes: {},
}));

vi.mock("@workspace/lexo-intro-integrations-openai", () => ({
  openai: { chat: { completions: { create: vi.fn() } } },
}));

vi.mock("@workspace/lexo-intro-integrations-openai/audio", () => ({
  textToSpeech: vi.fn(),
}));

vi.mock("../lib/objectStorage", () => ({
  objectStorageClient: { bucket: vi.fn() },
  ObjectStorageService: class {
    getPublicObjectSearchPaths() {
      return ["/test-bucket/public"];
    }
  },
}));

vi.mock("../listening/audioCache", async () => {
  const actual =
    await vi.importActual<typeof import("../listening/audioCache")>(
      "../listening/audioCache",
    );
  return {
    ...actual,
    primeAllTests: vi.fn(),
  };
});

interface FakeRow {
  id: number;
  slug: string;
  sectionId: number;
  sortOrder: number;
}

// Shared in-memory "table" the mock store mutates. Re-seeded in beforeEach.
const store: { rows: FakeRow[] } = { rows: [] };

// Track every call the route makes so the test can assert it really did
// hit `reorderTestsInSection` with the two-arg shape it expects.
const reorderCalls: Array<{ sectionId: number; slugs: string[] }> = [];

class FakeReorderSlugMismatchError extends Error {
  constructor(public readonly missing: string[]) {
    super(`Some slugs do not belong to this section: ${missing.join(", ")}`);
    this.name = "ReorderSlugMismatchError";
  }
}
class FakeReorderIncompleteError extends Error {
  constructor(
    public readonly expected: number,
    public readonly received: number,
  ) {
    super(
      `Reorder must include all ${expected} tests in the section, got ${received}`,
    );
    this.name = "ReorderIncompleteError";
  }
}
class FakeMoveValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MoveValidationError";
  }
}
class FakeMoveTestNotFoundError extends Error {
  constructor(public readonly slug: string) {
    super(`Test "${slug}" not found`);
    this.name = "MoveTestNotFoundError";
  }
}

vi.mock("../listening/testStore", () => {
  return {
    initListeningTests: vi.fn().mockResolvedValue(undefined),
    loadAllTests: vi.fn().mockResolvedValue([]),
    loadAllTestRows: vi.fn().mockResolvedValue([]),
    loadTestBySlug: vi.fn(),
    loadTestRowBySlug: vi.fn(),
    createTest: vi.fn(),
    updateTest: vi.fn(),
    deleteTest: vi.fn(),
    moveTestToSection: vi.fn(),
    // The real signature is the two-arg form the route passes — keep it
    // exact so a future drift (e.g. wrapping in an object, or renaming
    // either positional arg) blows up here.
    reorderTestsInSection: async (sectionId: number, slugs: string[]) => {
      reorderCalls.push({ sectionId, slugs });

      // Mirror the real store's validation so tests built with bad
      // payloads fail loudly instead of silently passing.
      if (![1, 2, 3, 4].includes(sectionId)) {
        throw new FakeMoveValidationError("sectionId out of range");
      }
      if (!Array.isArray(slugs)) {
        throw new FakeMoveValidationError("slugs must be an array");
      }

      const sectionRows = store.rows.filter((r) => r.sectionId === sectionId);
      if (sectionRows.length !== slugs.length) {
        throw new FakeReorderIncompleteError(sectionRows.length, slugs.length);
      }

      const now = new Date();
      const missing: string[] = [];
      let updated = 0;
      for (let i = 0; i < slugs.length; i++) {
        const r = store.rows.find(
          (row) => row.slug === slugs[i] && row.sectionId === sectionId,
        );
        if (!r) {
          missing.push(slugs[i]);
        } else {
          r.sortOrder = i;
          // Mirror the real store touching updatedAt on every row written.
          (r as FakeRow & { updatedAt?: Date }).updatedAt = now;
          updated += 1;
        }
      }
      if (missing.length > 0) {
        throw new FakeReorderSlugMismatchError(missing);
      }
      return updated;
    },
    ReorderSlugMismatchError: FakeReorderSlugMismatchError,
    ReorderIncompleteError: FakeReorderIncompleteError,
    MoveValidationError: FakeMoveValidationError,
    MoveTestNotFoundError: FakeMoveTestNotFoundError,
  };
});

vi.mock("../listening/primeAfterSave", () => ({
  cleanupReplacedSegments: vi.fn(),
  primeListeningTestAudioInBackground: vi.fn(),
}));

vi.mock("./auth", () => ({
  getStudentToken: () => null,
  getAdminToken: () => true,
}));

process.env.PUBLIC_OBJECT_SEARCH_PATHS = "/test-bucket/public";

const { listeningAdminRouter } = await import("./listening");

function buildApp(): express.Express {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    (req as unknown as { log: { info: () => void; error: () => void } }).log = {
      info: () => {},
      error: () => {},
    };
    next();
  });
  app.use(listeningAdminRouter);
  return app;
}

async function listen(app: express.Express): Promise<{
  server: http.Server;
  port: number;
}> {
  const server = http.createServer(app);
  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve());
  });
  const addr = server.address();
  if (!addr || typeof addr === "string") throw new Error("no address");
  return { server, port: addr.port };
}

const openServers: http.Server[] = [];

interface JsonResponse {
  status: number;
  body: unknown;
}

async function postJson(
  port: number,
  path: string,
  payload: unknown,
): Promise<JsonResponse> {
  const data = JSON.stringify(payload);
  return await new Promise<JsonResponse>((resolve, reject) => {
    const req = http.request(
      {
        host: "127.0.0.1",
        port,
        path,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(data),
        },
      },
      (res) => {
        let body = "";
        res.setEncoding("utf-8");
        res.on("data", (chunk) => (body += chunk));
        res.on("end", () => {
          let parsed: unknown = body;
          try {
            parsed = body.length > 0 ? JSON.parse(body) : null;
          } catch {
            // leave as raw string
          }
          resolve({ status: res.statusCode ?? 0, body: parsed });
        });
      },
    );
    req.on("error", reject);
    req.write(data);
    req.end();
  });
}

beforeEach(() => {
  // Same fixture used by `listening.move.test.ts` so the two specs share
  // intent. Mixed sortOrders catch off-by-one assumptions.
  store.rows = [
    { id: 10, slug: "alpha", sectionId: 1, sortOrder: 0 },
    { id: 11, slug: "bravo", sectionId: 1, sortOrder: 1 },
    { id: 20, slug: "charlie", sectionId: 2, sortOrder: 0 },
    { id: 21, slug: "delta", sectionId: 2, sortOrder: 1 },
    { id: 22, slug: "echo", sectionId: 2, sortOrder: 2 },
  ];
  reorderCalls.length = 0;
});

afterAll(async () => {
  await Promise.all(
    openServers.map(
      (s) => new Promise<void>((resolve) => s.close(() => resolve())),
    ),
  );
});

describe("POST /admin/tests/reorder — request body shape contract", () => {
  it("forward reorder + inverse undo round-trip restores the original ordering", async () => {
    const app = buildApp();
    const { server, port } = await listen(app);
    openServers.push(server);

    // Forward payload: drag delta to the front of section 2 — the new
    // ordering becomes [delta, charlie, echo]. Mirrors what
    // `computeMove(initial, 2, "delta", 2, "charlie")` produces in
    // `moveUndo.ts`'s same-section branch.
    const forwardPayload = {
      sectionId: 2,
      slugs: ["delta", "charlie", "echo"],
    };

    const fwd = await postJson(port, "/admin/tests/reorder", forwardPayload);
    expect(fwd.status).toBe(200);
    const fwdBody = fwd.body as { ok: boolean; updated: number };
    expect(fwdBody.ok).toBe(true);
    expect(fwdBody.updated).toBe(3);

    // The route must have called the store with the exact two-arg shape.
    expect(reorderCalls).toHaveLength(1);
    expect(reorderCalls[0]).toEqual({
      sectionId: 2,
      slugs: ["delta", "charlie", "echo"],
    });

    // Verify the in-memory section now reflects the new order.
    const sec2After = store.rows
      .filter((r) => r.sectionId === 2)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((r) => ({ slug: r.slug, sortOrder: r.sortOrder }));
    expect(sec2After).toEqual([
      { slug: "delta", sortOrder: 0 },
      { slug: "charlie", sortOrder: 1 },
      { slug: "echo", sortOrder: 2 },
    ]);

    // Section 1 must be untouched.
    const sec1After = store.rows
      .filter((r) => r.sectionId === 1)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((r) => ({ slug: r.slug, sortOrder: r.sortOrder }));
    expect(sec1After).toEqual([
      { slug: "alpha", sortOrder: 0 },
      { slug: "bravo", sortOrder: 1 },
    ]);

    // Inverse payload: this is what the admin UI re-POSTs when the user
    // hits Undo for a same-section reorder — the original slug order.
    const undoPayload = {
      sectionId: 2,
      slugs: ["charlie", "delta", "echo"],
    };

    const back = await postJson(port, "/admin/tests/reorder", undoPayload);
    expect(back.status).toBe(200);
    const backBody = back.body as { ok: boolean; updated: number };
    expect(backBody.ok).toBe(true);
    expect(backBody.updated).toBe(3);

    // Verify the entire in-memory table is byte-for-byte back where it
    // started, not just the moved row.
    const finalState = store.rows
      .map((r) => ({
        slug: r.slug,
        sectionId: r.sectionId,
        sortOrder: r.sortOrder,
      }))
      .sort(
        (a, b) =>
          a.sectionId - b.sectionId ||
          a.sortOrder - b.sortOrder ||
          a.slug.localeCompare(b.slug),
      );
    expect(finalState).toEqual([
      { slug: "alpha", sectionId: 1, sortOrder: 0 },
      { slug: "bravo", sectionId: 1, sortOrder: 1 },
      { slug: "charlie", sectionId: 2, sortOrder: 0 },
      { slug: "delta", sectionId: 2, sortOrder: 1 },
      { slug: "echo", sectionId: 2, sortOrder: 2 },
    ]);

    // Both POSTs hit the store with the two-arg shape.
    expect(reorderCalls).toHaveLength(2);
    expect(reorderCalls[1]).toEqual({
      sectionId: 2,
      slugs: ["charlie", "delta", "echo"],
    });
  });

  it("rejects a payload missing `sectionId` with 400 (no rename allowed)", async () => {
    const app = buildApp();
    const { server, port } = await listen(app);
    openServers.push(server);

    // If the frontend ever drops or renames `sectionId` (say to
    // `section`), this test catches it: the route's parser refuses the
    // call before reaching the store.
    const bad = await postJson(port, "/admin/tests/reorder", {
      slugs: ["charlie", "delta", "echo"],
      // sectionId intentionally omitted
    });
    expect(bad.status).toBe(400);
    expect(reorderCalls).toHaveLength(0);
  });

  it("rejects a payload that renames `sectionId` to `section` with 400", async () => {
    const app = buildApp();
    const { server, port } = await listen(app);
    openServers.push(server);

    const bad = await postJson(port, "/admin/tests/reorder", {
      section: 2,
      slugs: ["charlie", "delta", "echo"],
    });
    expect(bad.status).toBe(400);
    expect(reorderCalls).toHaveLength(0);
  });

  it("rejects a payload missing `slugs` with 400", async () => {
    const app = buildApp();
    const { server, port } = await listen(app);
    openServers.push(server);

    const bad = await postJson(port, "/admin/tests/reorder", {
      sectionId: 2,
      // slugs intentionally omitted
    });
    expect(bad.status).toBe(400);
    expect(reorderCalls).toHaveLength(0);
  });

  it("rejects a payload that renames `slugs` to `order` with 400", async () => {
    const app = buildApp();
    const { server, port } = await listen(app);
    openServers.push(server);

    const bad = await postJson(port, "/admin/tests/reorder", {
      sectionId: 2,
      order: ["charlie", "delta", "echo"],
    });
    expect(bad.status).toBe(400);
    expect(reorderCalls).toHaveLength(0);
  });

  it("rejects a payload where `slugs` is not an array with 400", async () => {
    const app = buildApp();
    const { server, port } = await listen(app);
    openServers.push(server);

    const bad = await postJson(port, "/admin/tests/reorder", {
      sectionId: 2,
      slugs: "charlie,delta,echo",
    });
    expect(bad.status).toBe(400);
    expect(reorderCalls).toHaveLength(0);
  });

  it("rejects a payload with an out-of-range `sectionId` with 400", async () => {
    const app = buildApp();
    const { server, port } = await listen(app);
    openServers.push(server);

    const bad = await postJson(port, "/admin/tests/reorder", {
      sectionId: 9,
      slugs: ["charlie", "delta", "echo"],
    });
    expect(bad.status).toBe(400);
    expect(reorderCalls).toHaveLength(0);
  });
});
