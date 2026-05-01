import { beforeEach, describe, expect, it, vi } from "vitest";
import express from "express";

// ---------------------------------------------------------------------------
// Backend regression test for the admin reading-item upsert validator,
// specifically the new-question-type branches in `parseItemPayload`
// (see artifacts/api-server/src/routes/reading.ts, lines 471-482).
//
// While Skimming + Scanning were being added, the validator was
// extended to enforce `mcqOptions.length === 4` for both types. The
// existing test suite did not pin that rule, so a future refactor
// could quietly drop the per-type length check and admins would only
// notice when a 3- or 5-option item silently shipped to students.
//
// We mount the real `readingAdminRouter` against a stubbed admin auth
// + stubbed store, then drive POST /admin/items end-to-end to assert
// the 4-option contract for skimming and scanning, plus a sanity
// happy-path so a future change that turns the 400 into "always
// reject" is also caught.
//
// Like routes/listening.test.ts, we mock every module that
// reading.ts imports for side effects so that loading the router is
// import-time safe (no real DB call, no real init of the item bank).
// ---------------------------------------------------------------------------

vi.mock("@workspace/lexo-intro-db", () => ({
  db: {
    execute: vi.fn().mockResolvedValue(undefined),
    select: vi.fn(),
    insert: vi.fn(),
  },
}));

vi.mock("@workspace/lexo-intro-db/schema", () => ({
  readingAttempts: {},
  students: {},
}));

const createItemMock = vi.fn();
const updateItemMock = vi.fn();
const deleteItemMock = vi.fn();
const loadAllItemRowsMock = vi.fn();
const loadItemRowBySlugMock = vi.fn();

vi.mock("../reading/store", () => ({
  initReadingItems: vi.fn().mockResolvedValue(undefined),
  loadAllItems: vi.fn().mockResolvedValue([]),
  loadAllItemRows: (...args: unknown[]) => loadAllItemRowsMock(...args),
  loadItemRowBySlug: (...args: unknown[]) => loadItemRowBySlugMock(...args),
  loadItemBySlug: vi.fn().mockResolvedValue(null),
  loadItemsByLevelAndType: vi.fn().mockResolvedValue([]),
  createItem: (...args: unknown[]) => createItemMock(...args),
  updateItem: (...args: unknown[]) => updateItemMock(...args),
  deleteItem: (...args: unknown[]) => deleteItemMock(...args),
}));

vi.mock("./auth", () => ({
  // The validator path we care about runs AFTER `requireAdmin` passes,
  // so always treat the request as an authenticated admin.
  getAdminToken: () => true,
  getStudentToken: () => null,
}));

// Importing the router triggers `ensureAttemptsTable()` and
// `initReadingItems()` (both mocked above), so this is now side-effect
// safe.
const { readingAdminRouter } = await import("./reading");

function buildApp(): express.Express {
  const app = express();
  app.use(express.json());
  // Minimal req.log shim — the route logs via req.log?.error?.
  app.use((req, _res, next) => {
    (req as unknown as { log: { info: () => void; error: () => void } }).log = {
      info: () => {},
      error: () => {},
    };
    next();
  });
  app.use(readingAdminRouter);
  return app;
}

interface PostResult {
  status: number;
  body: { error?: string; item?: unknown };
}

async function postItem(payload: unknown): Promise<PostResult> {
  const app = buildApp();
  // Use express's built-in test driver via supertest-style raw fetch:
  // spin up a one-shot server, POST, and read the response.
  const http = await import("node:http");
  const server = http.createServer(app);
  await new Promise<void>((resolve) =>
    server.listen(0, "127.0.0.1", () => resolve()),
  );
  try {
    const addr = server.address();
    if (!addr || typeof addr === "string") throw new Error("no address");
    const port = addr.port;
    const res = await fetch(`http://127.0.0.1:${port}/admin/items`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const text = await res.text();
    let body: { error?: string; item?: unknown } = {};
    try {
      body = text ? JSON.parse(text) : {};
    } catch {
      body = { error: text };
    }
    return { status: res.status, body };
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

// Builds a syntactically-valid skimming/scanning payload. Tests then
// override `mcqOptions` to drive the per-length branches we care about.
function payloadForType(
  type: "skimming" | "scanning",
  mcqOptions: string[],
): Record<string, unknown> {
  return {
    slug: `a2-${type}-test`,
    level: "a2",
    type,
    title: `${type} test`,
    instructions: "Read the passage and choose A, B, C or D.",
    passage: "A short passage used for the validator regression test.",
    paragraphs: [],
    options: [],
    questions: [
      {
        id: "q1",
        prompt: "Which option is correct?",
        mcqOptions,
      },
    ],
    answerKey: {
      q1: { value: 0, explanation: "It is in the passage." },
    },
  };
}

// Builds a syntactically-valid matching-headings payload. Tests
// override the `paragraphs` and `options` fields to drive the two
// item-level rules at reading.ts L457-465 (paragraphs required,
// options list required).
function matchingHeadingsPayload(
  paragraphs: { label: string; text: string }[],
  options: string[],
): Record<string, unknown> {
  return {
    slug: "a2-matching-headings-test",
    level: "a2",
    type: "matching_headings",
    title: "matching headings test",
    instructions: "Choose the correct heading for each paragraph.",
    passage: "A short passage used for the validator regression test.",
    paragraphs,
    options,
    questions: [
      { id: "q1", prompt: "Paragraph A heading?" },
    ],
    answerKey: {
      // Index 0 is in range whenever options.length >= 1; the
      // test cases below explicitly target the item-level rules,
      // not the per-question answer-range rule.
      q1: { value: 0, explanation: "Topic sentence of paragraph A." },
    },
  };
}

// Builds a syntactically-valid tfng/ynng payload. Tests override the
// per-question `answerKey.q1.value` to drive the allowed-set check
// in parseAnswerEntry (reading.ts L398-409).
function tripleChoicePayload(
  type: "tfng" | "ynng",
  value: unknown,
): Record<string, unknown> {
  return {
    slug: `a2-${type}-test`,
    level: "a2",
    type,
    title: `${type} test`,
    instructions: "Decide whether each statement matches the passage.",
    passage: "A short passage used for the validator regression test.",
    paragraphs: [],
    options: [],
    questions: [
      { id: "q1", prompt: "The author agrees with this claim." },
    ],
    answerKey: {
      q1: { value, explanation: "The passage states this directly." },
    },
  };
}

beforeEach(() => {
  createItemMock.mockReset();
  updateItemMock.mockReset();
  deleteItemMock.mockReset();
  loadAllItemRowsMock.mockReset();
  loadItemRowBySlugMock.mockReset();
});

describe("POST /admin/items — skimming / scanning option-count validator", () => {
  it("rejects a Skimming payload with 3 options (must be exactly 4)", async () => {
    const payload = payloadForType("skimming", ["A1", "A2", "A3"]);
    const res = await postItem(payload);

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/skimming requires exactly 4 options/i);
    // The validator runs before the store is touched.
    expect(createItemMock).not.toHaveBeenCalled();
  });

  it("rejects a Skimming payload with 5 options (must be exactly 4)", async () => {
    const payload = payloadForType("skimming", ["A1", "A2", "A3", "A4", "A5"]);
    const res = await postItem(payload);

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/skimming requires exactly 4 options/i);
    expect(createItemMock).not.toHaveBeenCalled();
  });

  it("rejects a Scanning payload with 3 options (must be exactly 4)", async () => {
    // Pinning the symmetric rule for Scanning. Scanning was the type
    // accidentally left out of the per-question-type branches in the
    // first round of the Skimming + Scanning rollout.
    const payload = payloadForType("scanning", ["A1", "A2", "A3"]);
    const res = await postItem(payload);

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/scanning.*exactly 4 options/i);
    expect(createItemMock).not.toHaveBeenCalled();
  });

  it("accepts a Skimming payload with exactly 4 options (happy path)", async () => {
    // The happy-path complement to the rejection tests: if a future
    // refactor inverts the comparison and rejects 4-option payloads
    // outright, the 400-only tests above would still pass. This case
    // pins that 4 options are the one valid count.
    createItemMock.mockResolvedValueOnce({
      id: 99,
      slug: "a2-skimming-test",
      level: "a2",
      type: "skimming",
      sortOrder: 0,
      title: "skimming test",
      instructions: "Read the passage and choose A, B, C or D.",
      passage: "A short passage used for the validator regression test.",
      paragraphs: [],
      options: [],
      questions: [
        {
          id: "q1",
          prompt: "Which option is correct?",
          mcqOptions: ["A1", "A2", "A3", "A4"],
        },
      ],
      answerKey: { q1: { value: 0, explanation: "It is in the passage." } },
    });

    const payload = payloadForType("skimming", ["A1", "A2", "A3", "A4"]);
    const res = await postItem(payload);

    expect(res.status).toBe(200);
    expect(res.body.item).toBeDefined();
    expect(createItemMock).toHaveBeenCalledTimes(1);
    // The store is invoked with the parsed payload; it must include
    // the four mcqOptions verbatim (they survived the validator).
    const passed = createItemMock.mock.calls[0][0] as {
      type: string;
      questions: { mcqOptions?: string[] }[];
    };
    expect(passed.type).toBe("skimming");
    expect(passed.questions[0].mcqOptions).toEqual(["A1", "A2", "A3", "A4"]);
  });
});

// ---------------------------------------------------------------------------
// Matching-headings has TWO item-level rules that nothing else in the
// validator pins (reading.ts L457-465):
//
//   1. "Matching headings questions require at least one paragraph" —
//      paragraphs are how students know which labelled chunk of text
//      each heading is supposed to apply to. An item with zero
//      paragraphs is unusable end-to-end.
//   2. "Matching questions require an options list" — the headings
//      themselves are the per-item options array; with zero options
//      the per-question "Correct option" select has nothing to bind
//      to.
//
// Both checks live in the same per-type branch as the skimming /
// scanning rules above and are vulnerable to the same shape of bug
// (a refactor that drops the type from the branch list would
// silently let through a payload that the editor cannot author).
// ---------------------------------------------------------------------------
describe("POST /admin/items — matching_headings item-level validator", () => {
  it("rejects a matching_headings payload with no paragraphs", async () => {
    const payload = matchingHeadingsPayload([], ["Heading one", "Heading two"]);
    const res = await postItem(payload);

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/matching headings.*at least one paragraph/i);
    expect(createItemMock).not.toHaveBeenCalled();
  });

  it("rejects a matching_headings payload with an empty options list", async () => {
    const payload = matchingHeadingsPayload(
      [{ label: "A", text: "First paragraph text." }],
      [],
    );
    const res = await postItem(payload);

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/matching questions require an options list/i);
    expect(createItemMock).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// True/False/Not-Given and Yes/No/Not-Given each restrict the
// per-question answer to a fixed three-element set
// (reading.ts L398-409, parseAnswerEntry):
//
//   tfng → "true" | "false" | "ng"
//   ynng → "yes"  | "no"    | "ng"
//
// If a future refactor drops either type from `parseAnswerEntry`'s
// branch list (the same bug class as the editor branches above), an
// admin could persist e.g. `"yes"` for a tfng item or arbitrary
// free-text values, and the runtime grader would mis-grade every
// student attempt against that item. The cross-set check below
// (yes/no submitted to a tfng item, true/false submitted to a ynng
// item) is the part that catches the worst-case outcome — a
// silently-accepted-but-wrong-shape value — which a generic
// "rejects gibberish" assertion would miss.
// ---------------------------------------------------------------------------
describe("POST /admin/items — tfng / ynng answer-value validator", () => {
  it.each([
    ["random gibberish", "maybe"],
    // The other type's allowed value — the worst-case bug, where
    // a tfng item silently stores a ynng answer.
    ["a ynng value (yes)", "yes"],
    ["a ynng value (no)", "no"],
    ["empty string", ""],
  ])("rejects a tfng payload whose answer is %s", async (_label, value) => {
    const payload = tripleChoicePayload("tfng", value);
    const res = await postItem(payload);

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/answer must be one of true \/ false \/ ng/i);
    expect(createItemMock).not.toHaveBeenCalled();
  });

  it.each([
    ["random gibberish", "maybe"],
    // Symmetric worst case — tfng values smuggled into a ynng item.
    ["a tfng value (true)", "true"],
    ["a tfng value (false)", "false"],
    ["empty string", ""],
  ])("rejects a ynng payload whose answer is %s", async (_label, value) => {
    const payload = tripleChoicePayload("ynng", value);
    const res = await postItem(payload);

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/answer must be one of yes \/ no \/ ng/i);
    expect(createItemMock).not.toHaveBeenCalled();
  });
});
