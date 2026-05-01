import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import http from "node:http";
import express from "express";

// ---------------------------------------------------------------------------
// End-to-end shape contract for POST /admin/tests/move.
//
// The unit tests in `artifacts/churchill-ai/src/lib/moveUndo.test.ts` lock
// down the *payload* `computeMove` produces (the `slug`, `targetSectionId`,
// `targetSlugs`, `sourceSlugs` quartet) and the auto-clear timer for the
// Undo toast. They do NOT exercise the real Express handler, so a rename
// or a new required field on the server would silently break admins.
//
// This spec spins up the actual `listeningAdminRouter`, swaps in an
// in-memory `moveTestToSection` that mirrors the real store's contract,
// and issues two HTTP POSTs:
//
//   1. Forward move  — alpha (section 1, sortOrder 0) lands in section 2
//      before delta. Asserts a 200 response and the moved row's new
//      sectionId/sortOrder.
//   2. Inverse move  — the captured undo payload restores alpha to
//      section 1 at its original sortOrder.
//
// If the route ever stops parsing one of the four required fields the
// in-memory store throws a validation error and the test fails loudly.
// The same fixture data is used as the unit tests above so the two
// suites stay in lock-step.
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
  title: string;
  description: string;
  questions: unknown[];
  transcript: unknown[];
  createdAt: Date;
  updatedAt: Date;
}

// Shared in-memory "table" the mock store mutates. Re-seeded in beforeEach.
const store: { rows: FakeRow[] } = { rows: [] };

// Track the calls the route makes so the test can assert it really did
// hit `moveTestToSection` with the four-arg shape it expects.
const moveCalls: Array<{
  slug: string;
  targetSectionId: number;
  targetSlugs: string[];
  sourceSlugs: string[];
}> = [];

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
    reorderTestsInSection: vi.fn(),
    // The real signature is the four-arg form the route passes — keep it
    // exact so a future drift (e.g. wrapping in an object) blows up here.
    moveTestToSection: async (
      slug: string,
      targetSectionId: number,
      targetSlugs: string[],
      sourceSlugs: string[],
    ) => {
      moveCalls.push({ slug, targetSectionId, targetSlugs, sourceSlugs });

      // Mirror the real store's validation so tests built with bad
      // payloads fail loudly instead of silently passing.
      if (typeof slug !== "string" || !slug) {
        throw new FakeMoveValidationError("slug must be a non-empty string");
      }
      if (![1, 2, 3, 4].includes(targetSectionId)) {
        throw new FakeMoveValidationError("targetSectionId out of range");
      }
      if (!Array.isArray(targetSlugs) || !Array.isArray(sourceSlugs)) {
        throw new FakeMoveValidationError(
          "targetSlugs and sourceSlugs must be arrays",
        );
      }
      if (!targetSlugs.includes(slug)) {
        throw new FakeMoveValidationError(
          "targetSlugs must include the moved slug",
        );
      }
      if (sourceSlugs.includes(slug)) {
        throw new FakeMoveValidationError(
          "sourceSlugs must not include the moved slug",
        );
      }

      const moving = store.rows.find((r) => r.slug === slug);
      if (!moving) throw new FakeMoveTestNotFoundError(slug);
      const sourceSectionId = moving.sectionId;
      if (sourceSectionId === targetSectionId) {
        throw new FakeMoveValidationError(
          "Cross-section move requires source and target sections to differ",
        );
      }

      const sourceCount = store.rows.filter(
        (r) => r.sectionId === sourceSectionId,
      ).length;
      if (sourceCount - 1 !== sourceSlugs.length) {
        throw new FakeReorderIncompleteError(
          sourceCount - 1,
          sourceSlugs.length,
        );
      }
      const targetCount = store.rows.filter(
        (r) => r.sectionId === targetSectionId,
      ).length;
      if (targetCount + 1 !== targetSlugs.length) {
        throw new FakeReorderIncompleteError(
          targetCount + 1,
          targetSlugs.length,
        );
      }

      // Apply the move + the rewritten sortOrders for both sections.
      const now = new Date();
      moving.sectionId = targetSectionId;
      moving.updatedAt = now;
      const missingTarget: string[] = [];
      for (let i = 0; i < targetSlugs.length; i++) {
        const r = store.rows.find(
          (r) => r.slug === targetSlugs[i] && r.sectionId === targetSectionId,
        );
        if (!r) missingTarget.push(targetSlugs[i]);
        else {
          r.sortOrder = i;
          r.updatedAt = now;
        }
      }
      if (missingTarget.length > 0) {
        throw new FakeReorderSlugMismatchError(missingTarget);
      }
      const missingSource: string[] = [];
      for (let i = 0; i < sourceSlugs.length; i++) {
        const r = store.rows.find(
          (r) => r.slug === sourceSlugs[i] && r.sectionId === sourceSectionId,
        );
        if (!r) missingSource.push(sourceSlugs[i]);
        else {
          r.sortOrder = i;
          r.updatedAt = now;
        }
      }
      if (missingSource.length > 0) {
        throw new FakeReorderSlugMismatchError(missingSource);
      }

      const reloaded = store.rows.find((r) => r.slug === slug)!;
      return {
        row: {
          id: reloaded.id,
          slug: reloaded.slug,
          sectionId: reloaded.sectionId,
          title: reloaded.title,
          description: reloaded.description,
          transcript: reloaded.transcript,
          questions: reloaded.questions,
          answerKey: {},
          sortOrder: reloaded.sortOrder,
          createdAt: reloaded.createdAt,
          updatedAt: reloaded.updatedAt,
        },
        sourceSectionId,
        targetUpdated: targetSlugs.length,
        sourceUpdated: sourceSlugs.length,
      };
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
  // Same fixture used by `moveUndo.test.ts` so the two specs evolve
  // together. Mixed sortOrders catch off-by-one assumptions.
  store.rows = [
    {
      id: 10,
      slug: "alpha",
      sectionId: 1,
      sortOrder: 0,
      title: "Alpha",
      description: "",
      questions: [],
      transcript: [],
      createdAt: new Date("2024-01-01T00:00:00Z"),
      updatedAt: new Date("2024-01-01T00:00:00Z"),
    },
    {
      id: 11,
      slug: "bravo",
      sectionId: 1,
      sortOrder: 1,
      title: "Bravo",
      description: "",
      questions: [],
      transcript: [],
      createdAt: new Date("2024-01-01T00:00:00Z"),
      updatedAt: new Date("2024-01-01T00:00:00Z"),
    },
    {
      id: 20,
      slug: "charlie",
      sectionId: 2,
      sortOrder: 0,
      title: "Charlie",
      description: "",
      questions: [],
      transcript: [],
      createdAt: new Date("2024-01-01T00:00:00Z"),
      updatedAt: new Date("2024-01-01T00:00:00Z"),
    },
    {
      id: 21,
      slug: "delta",
      sectionId: 2,
      sortOrder: 1,
      title: "Delta",
      description: "",
      questions: [],
      transcript: [],
      createdAt: new Date("2024-01-01T00:00:00Z"),
      updatedAt: new Date("2024-01-01T00:00:00Z"),
    },
    {
      id: 22,
      slug: "echo",
      sectionId: 2,
      sortOrder: 2,
      title: "Echo",
      description: "",
      questions: [],
      transcript: [],
      createdAt: new Date("2024-01-01T00:00:00Z"),
      updatedAt: new Date("2024-01-01T00:00:00Z"),
    },
  ];
  moveCalls.length = 0;
});

afterAll(async () => {
  await Promise.all(
    openServers.map(
      (s) => new Promise<void>((resolve) => s.close(() => resolve())),
    ),
  );
});

describe("POST /admin/tests/move — request body shape contract", () => {
  it("forward move + inverse undo round-trip restores the original ordering", async () => {
    const app = buildApp();
    const { server, port } = await listen(app);
    openServers.push(server);

    // Forward payload: drag alpha (sec 1, sortOrder 0) into sec 2 before
    // delta. Mirrors `computeMove(initial, 1, "alpha", 2, "delta")` in
    // moveUndo.test.ts so the two specs share fixture intent.
    const forwardPayload = {
      slug: "alpha",
      sourceSectionId: 1,
      targetSectionId: 2,
      targetSlugs: ["charlie", "alpha", "delta", "echo"],
      sourceSlugs: ["bravo"],
    };

    const fwd = await postJson(port, "/admin/tests/move", forwardPayload);
    expect(fwd.status).toBe(200);
    const fwdBody = fwd.body as {
      ok: boolean;
      sourceSectionId: number;
      targetSectionId: number;
      test: { slug: string; sectionId: number; sortOrder: number };
    };
    expect(fwdBody.ok).toBe(true);
    expect(fwdBody.sourceSectionId).toBe(1);
    expect(fwdBody.targetSectionId).toBe(2);
    expect(fwdBody.test.slug).toBe("alpha");
    expect(fwdBody.test.sectionId).toBe(2);
    expect(fwdBody.test.sortOrder).toBe(1);

    // The route must have called the store with the exact four-arg shape.
    expect(moveCalls).toHaveLength(1);
    expect(moveCalls[0]).toEqual({
      slug: "alpha",
      targetSectionId: 2,
      targetSlugs: ["charlie", "alpha", "delta", "echo"],
      sourceSlugs: ["bravo"],
    });

    // Inverse payload: this is what `computeMove` captures into
    // `decision.undo` for the same drag — restoring alpha to section 1
    // at its original sortOrder.
    const undoPayload = {
      slug: "alpha",
      sourceSectionId: 2,
      targetSectionId: 1,
      targetSlugs: ["alpha", "bravo"],
      sourceSlugs: ["charlie", "delta", "echo"],
    };

    const back = await postJson(port, "/admin/tests/move", undoPayload);
    expect(back.status).toBe(200);
    const backBody = back.body as {
      ok: boolean;
      sourceSectionId: number;
      targetSectionId: number;
      test: { slug: string; sectionId: number; sortOrder: number };
    };
    expect(backBody.ok).toBe(true);
    expect(backBody.sourceSectionId).toBe(2);
    expect(backBody.targetSectionId).toBe(1);
    expect(backBody.test.slug).toBe("alpha");
    expect(backBody.test.sectionId).toBe(1);
    // ── The assertion the task explicitly calls out: ──
    // alpha is back in section 1 at its ORIGINAL sortOrder (0).
    expect(backBody.test.sortOrder).toBe(0);

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

    // Both POSTs hit the store with the four-arg shape.
    expect(moveCalls).toHaveLength(2);
    expect(moveCalls[1]).toEqual({
      slug: "alpha",
      targetSectionId: 1,
      targetSlugs: ["alpha", "bravo"],
      sourceSlugs: ["charlie", "delta", "echo"],
    });
  });

  it("rejects a payload missing `targetSlugs` with 400 (no rename allowed)", async () => {
    const app = buildApp();
    const { server, port } = await listen(app);
    openServers.push(server);

    // If the frontend ever drops or renames `targetSlugs` (say to
    // `targetOrder`), this test catches it: the route's parser will
    // refuse the call before reaching the store.
    const bad = await postJson(port, "/admin/tests/move", {
      slug: "alpha",
      targetSectionId: 2,
      sourceSlugs: ["bravo"],
      // targetSlugs intentionally omitted
    });
    expect(bad.status).toBe(400);
    expect(moveCalls).toHaveLength(0);
  });

  it("rejects a payload missing `sourceSlugs` with 400", async () => {
    const app = buildApp();
    const { server, port } = await listen(app);
    openServers.push(server);

    const bad = await postJson(port, "/admin/tests/move", {
      slug: "alpha",
      targetSectionId: 2,
      targetSlugs: ["charlie", "alpha", "delta", "echo"],
      // sourceSlugs intentionally omitted
    });
    expect(bad.status).toBe(400);
    expect(moveCalls).toHaveLength(0);
  });

  it("rejects a payload missing `slug` with 400", async () => {
    const app = buildApp();
    const { server, port } = await listen(app);
    openServers.push(server);

    const bad = await postJson(port, "/admin/tests/move", {
      targetSectionId: 2,
      targetSlugs: ["charlie", "alpha", "delta", "echo"],
      sourceSlugs: ["bravo"],
    });
    expect(bad.status).toBe(400);
    expect(moveCalls).toHaveLength(0);
  });

  it("rejects a payload missing `targetSectionId` with 400", async () => {
    const app = buildApp();
    const { server, port } = await listen(app);
    openServers.push(server);

    const bad = await postJson(port, "/admin/tests/move", {
      slug: "alpha",
      targetSlugs: ["charlie", "alpha", "delta", "echo"],
      sourceSlugs: ["bravo"],
    });
    expect(bad.status).toBe(400);
    expect(moveCalls).toHaveLength(0);
  });
});
