import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import http from "node:http";
import express from "express";

// ---------------------------------------------------------------------------
// `routes/listening.ts` runs `ensureTable()` and `initListeningTests()` at
// module-load time and pulls in db, schema, OpenAI, Object Storage, etc.
// We mock all of those so importing the router is side-effect free and the
// test only exercises the bit we care about: the cancel wiring on
// POST /admin/prime-audio.
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

const primeAllTestsMock = vi.fn();
const loadAllTestsMock = vi.fn();

vi.mock("../listening/audioCache", async () => {
  const actual =
    await vi.importActual<typeof import("../listening/audioCache")>(
      "../listening/audioCache",
    );
  return {
    ...actual,
    primeAllTests: (...args: unknown[]) => primeAllTestsMock(...args),
  };
});

vi.mock("../listening/testStore", () => ({
  initListeningTests: vi.fn().mockResolvedValue(undefined),
  loadAllTests: () => loadAllTestsMock(),
  loadAllTestRows: vi.fn().mockResolvedValue([]),
  loadTestBySlug: vi.fn(),
  loadTestRowBySlug: vi.fn(),
  createTest: vi.fn(),
  updateTest: vi.fn(),
  deleteTest: vi.fn(),
  reorderTestsInSection: vi.fn(),
  moveTestToSection: vi.fn(),
  ReorderSlugMismatchError: class extends Error {},
  ReorderIncompleteError: class extends Error {},
  MoveValidationError: class extends Error {},
  MoveTestNotFoundError: class extends Error {},
}));

vi.mock("../listening/primeAfterSave", () => ({
  cleanupReplacedSegments: vi.fn(),
  primeListeningTestAudioInBackground: vi.fn(),
}));

vi.mock("./auth", () => ({
  getStudentToken: () => null,
  // Always treat the request as an authenticated admin so the cancel test
  // can hit POST /admin/prime-audio without setting up a real session.
  getAdminToken: () => true,
}));

process.env.PUBLIC_OBJECT_SEARCH_PATHS = "/test-bucket/public";

const { listeningAdminRouter } = await import("./listening");

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (v: T) => void;
  reject: (err: unknown) => void;
}
function defer<T>(): Deferred<T> {
  let resolve!: (v: T) => void;
  let reject!: (err: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function buildApp(): express.Express {
  const app = express();
  app.use(express.json());
  // Minimal req.log shim — the route logs via req.log.info / req.log.error.
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

beforeEach(() => {
  primeAllTestsMock.mockReset();
  loadAllTestsMock.mockReset();
  loadAllTestsMock.mockResolvedValue([
    { id: "t1", title: "T1", segments: [{ voice: "alloy", text: "x" }] },
  ]);
});

afterAll(async () => {
  await Promise.all(
    openServers.map(
      (s) => new Promise<void>((resolve) => s.close(() => resolve())),
    ),
  );
});

describe("POST /admin/prime-audio cancellation wiring", () => {
  it("aborts the AbortSignal passed to primeAllTests when the client closes the connection", async () => {
    let capturedSignal: AbortSignal | undefined;
    const primingStarted = defer<void>();
    const primingFinished = defer<void>();

    primeAllTestsMock.mockImplementation(
      async (
        tests: Array<{ id: string }>,
        opts: {
          signal?: AbortSignal;
          onProgress?: (ev: Record<string, unknown>) => void;
        },
      ) => {
        capturedSignal = opts.signal;
        // Emit one progress event so the response body has flushed and the
        // client-side request is fully established before we abort it.
        opts.onProgress?.({ kind: "start", testsTotal: tests.length });
        primingStarted.resolve();
        // Wait until the server's `req.on("close")` handler aborts us.
        await new Promise<void>((resolve) => {
          if (opts.signal?.aborted) {
            resolve();
            return;
          }
          opts.signal?.addEventListener("abort", () => resolve(), {
            once: true,
          });
        });
        primingFinished.resolve();
        return {
          testsPrimed: 0,
          testsTotal: tests.length,
          segmentsUploaded: 0,
          segmentsSkipped: 0,
          segmentsFailed: 0,
          perTest: [],
          cancelled: true,
        };
      },
    );

    const app = buildApp();
    const { server, port } = await listen(app);
    openServers.push(server);

    // Use raw http so we can destroy the underlying socket — that's what
    // a real browser/fetch abort looks like to the server.
    const req = http.request({
      host: "127.0.0.1",
      port,
      path: "/admin/prime-audio",
      method: "POST",
      headers: { "Content-Length": "0" },
    });
    const responseDeferred = defer<http.IncomingMessage>();
    req.on("response", (res) => responseDeferred.resolve(res));
    req.on("error", () => {
      // Aborting will reject the underlying client request — that's fine,
      // we don't depend on a clean close from the client side.
    });
    req.end();

    const res = await responseDeferred.promise;
    // Drain at least one chunk so we know the route is mid-stream and
    // primeAllTests is already running.
    await new Promise<void>((resolve) => {
      res.once("data", () => resolve());
    });
    await primingStarted.promise;
    expect(capturedSignal).toBeDefined();
    expect(capturedSignal!.aborted).toBe(false);

    // Simulate the admin clicking "Cancel": destroy the connection. The
    // server should observe req/res "close" and abort the controller it
    // passed to primeAllTests.
    req.destroy();

    await Promise.race([
      primingFinished.promise,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("server never aborted prime")), 2000),
      ),
    ]);

    expect(capturedSignal!.aborted).toBe(true);
    expect(primeAllTestsMock).toHaveBeenCalledTimes(1);
  });

  it("does NOT abort the signal when the request completes normally", async () => {
    let capturedSignal: AbortSignal | undefined;

    primeAllTestsMock.mockImplementation(
      async (tests: Array<{ id: string }>, opts: { signal?: AbortSignal }) => {
        capturedSignal = opts.signal;
        return {
          testsPrimed: tests.length,
          testsTotal: tests.length,
          segmentsUploaded: 0,
          segmentsSkipped: tests.length,
          segmentsFailed: 0,
          perTest: tests.map((t) => ({
            testId: t.id,
            title: "T",
            segmentCount: 1,
            uploaded: 0,
            skipped: 1,
            failed: 0,
            errors: [],
          })),
          cancelled: false,
        };
      },
    );

    const app = buildApp();
    const { server, port } = await listen(app);
    openServers.push(server);

    const responseBody = await new Promise<string>((resolve, reject) => {
      const req = http.request(
        {
          host: "127.0.0.1",
          port,
          path: "/admin/prime-audio",
          method: "POST",
          headers: { "Content-Length": "0" },
        },
        (res) => {
          let body = "";
          res.setEncoding("utf-8");
          res.on("data", (chunk) => (body += chunk));
          res.on("end", () => resolve(body));
        },
      );
      req.on("error", reject);
      req.end();
    });

    expect(capturedSignal).toBeDefined();
    // The request finished cleanly — the close handler must not have
    // tripped the controller (the route gates the abort on a `finished`
    // flag).
    expect(capturedSignal!.aborted).toBe(false);
    // Sanity: a full ndjson stream with a `summary` event was written.
    expect(responseBody).toContain('"kind":"summary"');
    expect(responseBody).toContain('"cancelled":false');
  });

  it("rejects unauthenticated requests without invoking primeAllTests", async () => {
    // Override the auth mock just for this test so getAdminToken returns
    // false. We can't easily re-mock at this stage, so we drive the same
    // negative path by inspecting that the production guard (`requireAdmin`
    // -> `getAdminToken`) returns 401 and never calls priming.
    // Easiest signal: assert primeAllTests was NOT called even when an
    // unauthorised-style request arrives. We force the negative path by
    // re-requiring the handler with auth flipped via doMock + isolate.
    vi.resetModules();
    vi.doMock("./auth", () => ({
      getStudentToken: () => null,
      getAdminToken: () => false,
    }));
    const { listeningAdminRouter: guardedRouter } = await import("./listening");

    const app = express();
    app.use(express.json());
    app.use((req, _res, next) => {
      (
        req as unknown as { log: { info: () => void; error: () => void } }
      ).log = { info: () => {}, error: () => {} };
      next();
    });
    app.use(guardedRouter);
    const { server, port } = await listen(app);
    openServers.push(server);

    const status = await new Promise<number | undefined>((resolve, reject) => {
      const req = http.request(
        {
          host: "127.0.0.1",
          port,
          path: "/admin/prime-audio",
          method: "POST",
          headers: { "Content-Length": "0" },
        },
        (res) => {
          res.resume();
          res.on("end", () => resolve(res.statusCode));
        },
      );
      req.on("error", reject);
      req.end();
    });

    expect(status).toBe(401);
    expect(primeAllTestsMock).not.toHaveBeenCalled();
  });
});
