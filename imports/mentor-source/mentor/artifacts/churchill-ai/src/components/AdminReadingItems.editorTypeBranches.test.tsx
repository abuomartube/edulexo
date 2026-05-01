// @vitest-environment jsdom
//
// Regression test that pins the per-question-type editor branches in
// AdminReadingItems.tsx — specifically the two surfaces that quietly
// broke while the Skimming + Scanning question types were being added:
//
//   1. The 4-option MCQ controls (the McqOptionsEditor block) used to
//      gate on `editing.type === "mcq"` only. When Skimming was
//      introduced (a 4-option MCQ under the hood), the editor rendered
//      with NO option inputs at all for that type, so an admin could
//      not author or edit the four A/B/C/D choices. Code review caught
//      this; nothing in the test suite did. We pin the fix by
//      asserting that opening a Skimming item in the editor shows the
//      McqOptionsEditor with the four option inputs (placeholders
//      "Option A".."Option D").
//
//   2. The free-text canonical-answer + acceptable-alternates block
//      (the `isCompletion` branch in AdminReadingItems.tsx, lines
//      547-556) was wired to a HARD-CODED list of completion-style
//      types. The bug class is: when a new completion-style type is
//      added, an author can forget to extend that list, and the
//      editor silently drops the canonical-answer field for the new
//      type. We pin every completion type CURRENTLY in the
//      `isCompletion` list so a future regression that drops any one
//      of them — e.g. removing "short_answer" — fails loudly. The
//      next time someone adds a completion-style type, this same
//      table is the one place to extend.
//
// Note on scanning: in the current codebase scanning is wired as a
// 4-option MCQ end-to-end (validator at routes/reading.ts L478-479
// rejects scanning payloads that don't have exactly 4 mcqOptions, the
// answer-key parser at L368 treats the value as a numeric MCQ index,
// and every scanning item in the bank uses mcqOptions). Asserting
// either "scanning shows MCQ" or "scanning shows canonical-answer" in
// this test would couple the suite to a specific UX choice for that
// type that lives outside this file. Instead the canonical-answer
// regression is covered by exhaustively testing every completion-type
// listed in `isCompletion` — which is the actual surface the bug
// class lives on.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import AdminReadingItems from "./AdminReadingItems";

// The component prefixes every fetch with `import.meta.env.BASE_URL`
// trimmed of its trailing slash. In jsdom under vitest BASE_URL is
// undefined, so the prefix is "" and the URLs end up looking like
// `/api/churchill/reading/admin/...`. We match on the path suffix to
// stay robust to future BASE_URL changes.
const LIST_PATH = "/api/churchill/reading/admin/items";
const DETAIL_RE = /\/api\/churchill\/reading\/admin\/items\/([^/?#]+)$/;

interface ServerSummary {
  id: number;
  slug: string;
  level: "a2" | "b1";
  type: string;
  title: string;
  sortOrder: number;
  questionCount: number;
  createdAt: string;
  updatedAt: string;
}

interface ServerItem {
  id: number;
  slug: string;
  level: "a2" | "b1";
  type: string;
  sortOrder: number;
  title: string;
  instructions: string;
  passage: string;
  paragraphs: { label: string; text: string }[];
  options: string[];
  questions: { id: string; prompt: string; mcqOptions?: string[] }[];
  answerKey: Record<
    string,
    { value: string | number; acceptable?: string[]; explanation: string }
  >;
}

function summary(slug: string, type: string, title: string, questionCount: number): ServerSummary {
  return {
    id: slug.length, // arbitrary; never read by the editor
    slug,
    level: "a2",
    type,
    title,
    sortOrder: 0,
    questionCount,
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
  };
}

// A 4-option MCQ-style item, used to drive the MCQ branch.
function mcqStyleItem(slug: string, type: string): ServerItem {
  return {
    id: 1,
    slug,
    level: "a2",
    type,
    sortOrder: 0,
    title: `${type} item`,
    instructions: "Read the passage and choose A, B, C or D.",
    passage: "A short reading passage used for this regression test.",
    paragraphs: [],
    options: [],
    questions: [
      {
        id: "q1",
        prompt: "Which option is correct?",
        mcqOptions: [
          "First option text",
          "Second option text",
          "Third option text",
          "Fourth option text",
        ],
      },
    ],
    answerKey: {
      q1: { value: 1, explanation: "Because the passage says so." },
    },
  };
}

// A free-text completion-style item — used to verify the
// canonical-answer + acceptable-alternates block renders for each
// type in the `isCompletion` list.
function completionItem(slug: string, type: string): ServerItem {
  return {
    id: 2,
    slug,
    level: "a2",
    type,
    sortOrder: 0,
    title: `${type} item`,
    instructions: "Answer the question with one word from the text.",
    passage: "A short reading passage used for this regression test.",
    paragraphs: [],
    options: [],
    questions: [{ id: "q1", prompt: "What word fits the gap?" }],
    answerKey: {
      q1: {
        value: "answer",
        acceptable: ["answers", "Answer"],
        explanation: "It is the literal word in the text.",
      },
    },
  };
}

// A True/False/Not-Given or Yes/No/Not-Given item — the answer key
// holds a short string ("true" / "false" / "ng" or "yes" / "no" /
// "ng"). No mcqOptions, no item-level options, no paragraphs.
function tripleChoiceItem(slug: string, type: "tfng" | "ynng", value: string): ServerItem {
  return {
    id: 3,
    slug,
    level: "a2",
    type,
    sortOrder: 0,
    title: `${type} item`,
    instructions: "Decide whether each statement matches the passage.",
    passage: "A short reading passage used for this regression test.",
    paragraphs: [],
    options: [],
    questions: [{ id: "q1", prompt: "The author agrees with this claim." }],
    answerKey: {
      q1: { value, explanation: "The passage states this directly." },
    },
  };
}

// A matching-headings item exercises three controls at once: the
// paragraph list (item-level), the headings/options list
// (item-level), and the per-question "Correct option" select that
// indexes into those options. This is the only place those three
// controls are wired together.
function matchingHeadingsItem(slug: string): ServerItem {
  return {
    id: 4,
    slug,
    level: "a2",
    type: "matching_headings",
    sortOrder: 0,
    title: "matching_headings item",
    instructions: "Choose the correct heading for each paragraph.",
    passage: "A short reading passage used for this regression test.",
    paragraphs: [
      { label: "A", text: "First paragraph text." },
      { label: "B", text: "Second paragraph text." },
    ],
    options: ["Heading one", "Heading two", "Heading three"],
    questions: [
      { id: "q1", prompt: "Paragraph A heading?" },
      { id: "q2", prompt: "Paragraph B heading?" },
    ],
    answerKey: {
      q1: { value: 0, explanation: "Topic sentence of paragraph A." },
      q2: { value: 2, explanation: "Topic sentence of paragraph B." },
    },
  };
}

// Backs the two endpoints AdminReadingItems calls during the open-editor
// flow: GET /admin/items (the bucket-grouped list) and GET
// /admin/items/<slug> (the detail load that primes the editor).
function buildFetchMock(items: ServerItem[]) {
  const itemBySlug = new Map(items.map((it) => [it.slug, it]));
  const summaries = items.map((it) =>
    summary(it.slug, it.type, it.title, it.questions.length),
  );
  const fetchMock = vi.fn(async (input: RequestInfo | URL): Promise<Response> => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : (input as Request).url;

    const detailMatch = url.match(DETAIL_RE);
    if (detailMatch) {
      const slug = decodeURIComponent(detailMatch[1]);
      const found = itemBySlug.get(slug);
      if (!found) {
        return new Response(JSON.stringify({ error: "not found" }), {
          status: 404,
          headers: { "content-type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ item: found }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    if (url.endsWith(LIST_PATH)) {
      return new Response(
        JSON.stringify({
          // The component renders one bucket per known type; we have
          // to include every type our test fixtures use so the
          // open-editor row is mounted in the list view.
          types: [
            { id: "skimming", label: "Skimming", tagline: "" },
            { id: "scanning", label: "Scanning", tagline: "" },
            { id: "mcq", label: "MCQ", tagline: "" },
            { id: "tfng", label: "TFNG", tagline: "" },
            { id: "ynng", label: "YNNG", tagline: "" },
            { id: "matching_headings", label: "Matching headings", tagline: "" },
            { id: "matching_features", label: "Matching features", tagline: "" },
            { id: "sentence_completion", label: "Sentence completion", tagline: "" },
            { id: "note_completion", label: "Note completion", tagline: "" },
            { id: "table_completion", label: "Table completion", tagline: "" },
            { id: "flow_chart_completion", label: "Flow chart completion", tagline: "" },
            { id: "short_answer", label: "Short answer", tagline: "" },
          ],
          items: summaries,
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }

    throw new Error(`Unhandled fetch in test: ${url}`);
  });
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  return { fetchMock };
}

const originalFetch = globalThis.fetch;

beforeEach(() => {
  // jsdom doesn't ship confirm(); the editor's delete flow calls it,
  // but no test below triggers delete — still, stub it defensively so
  // an accidental click never blocks the test runner.
  (globalThis as unknown as { confirm: () => boolean }).confirm = () => false;
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  globalThis.fetch = originalFetch;
});

// Open the editor for a specific summary by clicking its row in the
// list view. Each summary row is a button labelled with the item's
// title (see the list view in AdminReadingItems.tsx). Returns once
// the editor surface is mounted (signalled by the "Edit reading
// item" heading, which is unique to the editor view).
async function openEditorFor(title: string) {
  const row = await waitFor(() => screen.getByText(title));
  fireEvent.click(row);
  await waitFor(() => {
    expect(screen.getByText("Edit reading item")).toBeTruthy();
  });
}

describe("AdminReadingItems editor — per-type control branches", () => {
  it("renders the 4-option MCQ controls for a Skimming item", async () => {
    buildFetchMock([mcqStyleItem("a2-skimming-1", "skimming")]);
    render(<AdminReadingItems onLogout={async () => {}} />);
    await openEditorFor("skimming item");

    // The McqOptionsEditor renders one input per option with
    // placeholder "Option A", "Option B", etc. Skimming items are
    // pinned to exactly 4 options by the backend validator, so we
    // expect exactly four such inputs.
    for (const letter of ["A", "B", "C", "D"]) {
      expect(
        screen.getByPlaceholderText(`Option ${letter}`),
        `Skimming editor should render the "Option ${letter}" input`,
      ).toBeTruthy();
    }

    // And the "click radio to mark the correct one" field label is
    // unique to the McqOptionsEditor — its presence proves the whole
    // MCQ block (not just stray inputs from elsewhere) was rendered.
    expect(
      screen.getByText("Options (click radio to mark the correct one)"),
    ).toBeTruthy();
  });

  // Every type listed in `isCompletion` must render the canonical
  // free-text answer block. This is the regression net for "a future
  // refactor drops a type from the hard-coded `isCompletion` list" —
  // the bug class that drove this task. Adding a new completion-style
  // type? Add a row here.
  describe.each([
    ["sentence_completion"],
    ["note_completion"],
    ["table_completion"],
    ["flow_chart_completion"],
    ["short_answer"],
  ] as const)(
    "renders canonical-answer + acceptable-alternates for %s items",
    (type) => {
      it("shows both fields when an item of this type is opened", async () => {
        const slug = `a2-${type}-1`;
        buildFetchMock([completionItem(slug, type)]);
        render(<AdminReadingItems onLogout={async () => {}} />);
        await openEditorFor(`${type} item`);

        // Canonical answer: free-text input wrapped in a Field
        // labelled "Canonical answer", with a distinctive
        // placeholder we anchor on without depending on the input's
        // value.
        expect(
          screen.getByText("Canonical answer"),
          `${type} editor should render the "Canonical answer" field`,
        ).toBeTruthy();
        expect(
          screen.getByPlaceholderText("The exact word/phrase from the text"),
          `${type} editor should render the canonical-answer input`,
        ).toBeTruthy();

        // Acceptable alternatives: a StringList rendered immediately
        // after the canonical-answer field, anchored on its label —
        // unique to this branch in the editor.
        expect(
          screen.getByText("Acceptable alternatives (optional)"),
          `${type} editor should render the acceptable-alternatives list`,
        ).toBeTruthy();

        // And the McqOptionsEditor must NOT render for a completion
        // type — its presence here would mean the two branches got
        // crossed.
        expect(
          screen.queryByPlaceholderText("Option A"),
          `${type} editor should not render the MCQ option inputs`,
        ).toBeNull();
        expect(
          screen.queryByText("Options (click radio to mark the correct one)"),
          `${type} editor should not render the MCQ options heading`,
        ).toBeNull();
      });
    },
  );

  // True/False/Not-Given pins its own per-type select with three
  // fixed labels — TRUE / FALSE / NOT GIVEN. If a future refactor
  // drops `tfng` from the per-type branch list (the same shape of
  // bug that broke skimming + scanning), an admin opening a tfng
  // item would see the prompt with no way to set the answer. The
  // McqOptionsEditor and the canonical-answer block must NOT render
  // for this type.
  it("renders the TRUE / FALSE / NOT GIVEN select for a tfng item", async () => {
    buildFetchMock([tripleChoiceItem("a2-tfng-1", "tfng", "true")]);
    render(<AdminReadingItems onLogout={async () => {}} />);
    await openEditorFor("tfng item");

    // Each <option> in the select renders its label as visible text;
    // anchoring on the three exact labels proves the tfng branch fired.
    expect(screen.getByText("TRUE")).toBeTruthy();
    expect(screen.getByText("FALSE")).toBeTruthy();
    // "NOT GIVEN" appears in both tfng and ynng, but TRUE+FALSE are
    // unique to tfng — together they pin the right branch.
    expect(screen.getByText("NOT GIVEN")).toBeTruthy();

    // No MCQ option inputs and no canonical-answer field.
    expect(screen.queryByPlaceholderText("Option A")).toBeNull();
    expect(screen.queryByText("Canonical answer")).toBeNull();
    expect(
      screen.queryByPlaceholderText("The exact word/phrase from the text"),
    ).toBeNull();
  });

  // Symmetrical pin for Yes/No/Not-Given — same bug class, separate
  // hard-coded type branch.
  it("renders the YES / NO / NOT GIVEN select for a ynng item", async () => {
    buildFetchMock([tripleChoiceItem("a2-ynng-1", "ynng", "yes")]);
    render(<AdminReadingItems onLogout={async () => {}} />);
    await openEditorFor("ynng item");

    expect(screen.getByText("YES")).toBeTruthy();
    expect(screen.getByText("NO")).toBeTruthy();
    expect(screen.getByText("NOT GIVEN")).toBeTruthy();
    // TRUE/FALSE belong to the tfng branch; their absence here
    // confirms the ynng branch fired (not the tfng one).
    expect(screen.queryByText("TRUE")).toBeNull();
    expect(screen.queryByText("FALSE")).toBeNull();

    expect(screen.queryByPlaceholderText("Option A")).toBeNull();
    expect(screen.queryByText("Canonical answer")).toBeNull();
  });

  // Matching headings is the heaviest per-type branch: it renders
  // three controls that no other type uses together — the paragraph
  // list, the item-level options list (labelled "Headings
  // (options)"), and the per-question "Correct option" select that
  // indexes into those options. If any one of these silently drops
  // out of the editor an admin can no longer author a matching
  // headings item end-to-end, so each is pinned individually.
  it("renders the paragraph list, options list and Correct option select for a matching_headings item", async () => {
    buildFetchMock([matchingHeadingsItem("a2-matching-headings-1")]);
    render(<AdminReadingItems onLogout={async () => {}} />);
    await openEditorFor("matching_headings item");

    // Paragraph list — its Field label is unique to ParagraphList,
    // and the per-paragraph textarea has placeholder "Paragraph
    // text". Two paragraphs in the fixture means we expect two such
    // textareas.
    expect(screen.getByText("Paragraphs (each labelled A, B, C…)")).toBeTruthy();
    expect(screen.getAllByPlaceholderText("Paragraph text").length).toBe(2);

    // Item-level options list — for matching_headings the StringList
    // is labelled "Headings (options)" (matching_features uses a
    // different label, "Items / options").
    expect(screen.getByText("Headings (options)")).toBeTruthy();
    expect(screen.getAllByPlaceholderText("Enter an option").length).toBe(3);

    // Per-question "Correct option" select — one per sub-question.
    // The fixture has two sub-questions, so there must be two
    // Field labels with this text.
    expect(screen.getAllByText("Correct option").length).toBe(2);

    // And the wrong branches must NOT render for matching_headings:
    // no MCQ option inputs, no canonical-answer field, no
    // tfng/ynng selects.
    expect(screen.queryByPlaceholderText("Option A")).toBeNull();
    expect(screen.queryByText("Canonical answer")).toBeNull();
    expect(screen.queryByText("TRUE")).toBeNull();
    expect(screen.queryByText("YES")).toBeNull();
  });
});
