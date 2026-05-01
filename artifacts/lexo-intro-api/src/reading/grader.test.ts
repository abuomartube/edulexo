import { describe, it, expect } from "vitest";
import { gradeItem } from "./grader";
import type { ReadingItem } from "./itemBank";

// ---------------------------------------------------------------------------
// Pinning tests for the reading grader.
//
// The grader handles 10 IELTS reading question types with subtle scoring
// rules (case/punctuation normalization, "ng"/"not given" aliases,
// `acceptable[]` alternates, numeric vs string indexes for matching). It is
// shared by every reading attempt, so a silent regression here would
// miscount answers across thousands of student attempts.
//
// Each test below builds a minimal `ReadingItem` (mirroring the shapes in
// `itemBank.ts`) and exercises one type with a correct + incorrect example
// plus the known edge cases. New behavior should add a test here; changes
// to existing behavior should update the assertion deliberately.
// ---------------------------------------------------------------------------

function baseItem<T extends ReadingItem>(item: T): T {
  return item;
}

describe("gradeItem", () => {
  // -----------------------------------------------------------------------
  // mcq — answerKey.value is the integer index into sub.mcqOptions
  // -----------------------------------------------------------------------
  describe("mcq", () => {
    const item = baseItem<ReadingItem>({
      slug: "mcq-1",
      level: "a2",
      type: "mcq",
      sortOrder: 0,
      title: "MCQ",
      instructions: "",
      passage: "p",
      questions: [
        {
          id: "q1",
          prompt: "Pick one",
          mcqOptions: ["alpha", "beta", "gamma"],
        },
      ],
      answerKey: {
        q1: { value: 1, explanation: "beta is correct" },
      },
    });

    it("marks the correct option as correct and resolves the human-readable answer", () => {
      const out = gradeItem(item, { q1: 1 });
      expect(out.score).toBe(1);
      expect(out.total).toBe(1);
      expect(out.percent).toBe(100);
      expect(out.results[0].isCorrect).toBe(true);
      expect(out.results[0].correctAnswer).toBe("beta");
      expect(out.results[0].studentAnswer).toBe("beta");
      expect(out.results[0].explanation).toBe("beta is correct");
    });

    it("marks a wrong option as incorrect", () => {
      const out = gradeItem(item, { q1: 0 });
      expect(out.score).toBe(0);
      expect(out.percent).toBe(0);
      expect(out.results[0].isCorrect).toBe(false);
      expect(out.results[0].studentAnswer).toBe("alpha");
    });

    it("normalizes a numeric-string index ('1') to the same answer as the number 1", () => {
      const out = gradeItem(item, { q1: "1" });
      expect(out.results[0].isCorrect).toBe(true);
      expect(out.results[0].studentAnswer).toBe("beta");
    });

    it("treats a missing answer as incorrect with a null student answer", () => {
      const out = gradeItem(item, {});
      expect(out.results[0].isCorrect).toBe(false);
      expect(out.results[0].studentAnswer).toBeNull();
    });

    it("treats a non-numeric answer as incorrect and echoes the raw value back", () => {
      const out = gradeItem(item, { q1: "beta" });
      expect(out.results[0].isCorrect).toBe(false);
      // Non-index values fall through to the raw payload in the readable
      // student answer.
      expect(out.results[0].studentAnswer).toBe("beta");
    });
  });

  // -----------------------------------------------------------------------
  // tfng — true / false / ng with "not given" aliases
  // -----------------------------------------------------------------------
  describe("tfng", () => {
    const item = baseItem<ReadingItem>({
      slug: "tfng-1",
      level: "a2",
      type: "tfng",
      sortOrder: 0,
      title: "TFNG",
      instructions: "",
      passage: "p",
      questions: [
        { id: "q1", prompt: "s1" },
        { id: "q2", prompt: "s2" },
        { id: "q3", prompt: "s3" },
      ],
      answerKey: {
        q1: { value: "true", explanation: "" },
        q2: { value: "false", explanation: "" },
        q3: { value: "ng", explanation: "" },
      },
    });

    it("accepts case-insensitive matches for true / false / ng", () => {
      const out = gradeItem(item, { q1: "TRUE", q2: "False", q3: "NG" });
      expect(out.score).toBe(3);
      expect(out.results.map((r) => r.isCorrect)).toEqual([true, true, true]);
      expect(out.results.map((r) => r.correctAnswer)).toEqual([
        "TRUE",
        "FALSE",
        "NOT GIVEN",
      ]);
    });

    it("accepts 'not given' and 'notgiven' as aliases for ng", () => {
      const a = gradeItem(item, { q1: "true", q2: "false", q3: "Not Given" });
      expect(a.score).toBe(3);
      expect(a.results[2].studentAnswer).toBe("NOT GIVEN");

      const b = gradeItem(item, { q1: "true", q2: "false", q3: "notgiven" });
      expect(b.score).toBe(3);
      expect(b.results[2].studentAnswer).toBe("NOT GIVEN");
    });

    it("marks empty / missing / wrong values as incorrect", () => {
      const out = gradeItem(item, { q1: "", q2: undefined, q3: "true" });
      expect(out.score).toBe(0);
      expect(out.results.map((r) => r.isCorrect)).toEqual([false, false, false]);
      expect(out.results[1].studentAnswer).toBeNull();
    });
  });

  // -----------------------------------------------------------------------
  // ynng — yes / no / ng with "not given" aliases
  // -----------------------------------------------------------------------
  describe("ynng", () => {
    const item = baseItem<ReadingItem>({
      slug: "ynng-1",
      level: "a2",
      type: "ynng",
      sortOrder: 0,
      title: "YNNG",
      instructions: "",
      passage: "p",
      questions: [
        { id: "q1", prompt: "s1" },
        { id: "q2", prompt: "s2" },
        { id: "q3", prompt: "s3" },
      ],
      answerKey: {
        q1: { value: "yes", explanation: "" },
        q2: { value: "no", explanation: "" },
        q3: { value: "ng", explanation: "" },
      },
    });

    it("accepts case-insensitive matches for yes / no / ng", () => {
      const out = gradeItem(item, { q1: "Yes", q2: "NO", q3: "ng" });
      expect(out.score).toBe(3);
      expect(out.results.map((r) => r.correctAnswer)).toEqual([
        "YES",
        "NO",
        "NOT GIVEN",
      ]);
    });

    it("accepts 'not given' as an alias for ng", () => {
      const out = gradeItem(item, { q1: "yes", q2: "no", q3: "not given" });
      expect(out.score).toBe(3);
      expect(out.results[2].studentAnswer).toBe("NOT GIVEN");
    });

    it("marks the wrong polarity as incorrect", () => {
      const out = gradeItem(item, { q1: "no", q2: "yes", q3: "yes" });
      expect(out.score).toBe(0);
      expect(out.results.map((r) => r.isCorrect)).toEqual([false, false, false]);
    });
  });

  // -----------------------------------------------------------------------
  // matching_headings — answerKey.value is an index into item.options
  // -----------------------------------------------------------------------
  describe("matching_headings", () => {
    const item = baseItem<ReadingItem>({
      slug: "mh-1",
      level: "a2",
      type: "matching_headings",
      sortOrder: 0,
      title: "MH",
      instructions: "",
      passage: "",
      options: ["Heading One", "Heading Two", "Heading Three"],
      questions: [
        { id: "q1", prompt: "Paragraph A" },
        { id: "q2", prompt: "Paragraph B" },
      ],
      answerKey: {
        q1: { value: 2, explanation: "" },
        q2: { value: 0, explanation: "" },
      },
    });

    it("marks correct indexes as correct and resolves the heading text", () => {
      const out = gradeItem(item, { q1: 2, q2: 0 });
      expect(out.score).toBe(2);
      expect(out.results[0].correctAnswer).toBe("Heading Three");
      expect(out.results[0].studentAnswer).toBe("Heading Three");
      expect(out.results[1].correctAnswer).toBe("Heading One");
    });

    it("normalizes a numeric-string index to the same answer as the number", () => {
      const out = gradeItem(item, { q1: "2", q2: "0" });
      expect(out.score).toBe(2);
      expect(out.results[0].studentAnswer).toBe("Heading Three");
    });

    it("marks wrong indexes as incorrect", () => {
      const out = gradeItem(item, { q1: 0, q2: 2 });
      expect(out.score).toBe(0);
      expect(out.results.map((r) => r.isCorrect)).toEqual([false, false]);
    });
  });

  // -----------------------------------------------------------------------
  // matching_features — same shape as matching_headings
  // -----------------------------------------------------------------------
  describe("matching_features", () => {
    const item = baseItem<ReadingItem>({
      slug: "mf-1",
      level: "a2",
      type: "matching_features",
      sortOrder: 0,
      title: "MF",
      instructions: "",
      passage: "p",
      options: ["Star", "Moon", "Sun"],
      questions: [
        { id: "q1", prompt: "fast" },
        { id: "q2", prompt: "cheap" },
      ],
      answerKey: {
        q1: { value: 2, explanation: "" },
        q2: { value: 0, explanation: "" },
      },
    });

    it("marks correct feature picks as correct", () => {
      const out = gradeItem(item, { q1: 2, q2: 0 });
      expect(out.score).toBe(2);
      expect(out.results[0].correctAnswer).toBe("Sun");
      expect(out.results[1].studentAnswer).toBe("Star");
    });

    it("accepts numeric-string answers", () => {
      const out = gradeItem(item, { q1: "2", q2: "0" });
      expect(out.score).toBe(2);
    });

    it("marks wrong picks as incorrect", () => {
      const out = gradeItem(item, { q1: 1, q2: 1 });
      expect(out.score).toBe(0);
    });
  });

  // -----------------------------------------------------------------------
  // String-completion family — sentence / note / table / flow chart / short
  // answer all share the same default branch in the grader. Each gets its
  // own test so a regression that affects only one type is still surfaced.
  // -----------------------------------------------------------------------
  function completionItem(type: ReadingItem["type"]): ReadingItem {
    return baseItem<ReadingItem>({
      slug: `${type}-1`,
      level: "a2",
      type,
      sortOrder: 0,
      title: "C",
      instructions: "",
      passage: "p",
      questions: [
        { id: "q1", prompt: "blank" },
        { id: "q2", prompt: "blank with alts" },
      ],
      answerKey: {
        q1: { value: "minutes", explanation: "" },
        q2: { value: "sugar", acceptable: ["milk"], explanation: "" },
      },
    });
  }

  describe("sentence_completion", () => {
    const item = completionItem("sentence_completion");

    it("matches a literal correct string", () => {
      const out = gradeItem(item, { q1: "minutes", q2: "sugar" });
      expect(out.score).toBe(2);
      expect(out.results.map((r) => r.isCorrect)).toEqual([true, true]);
    });

    it("normalizes case, surrounding whitespace, and trailing punctuation", () => {
      const out = gradeItem(item, { q1: "  Minutes.  ", q2: "Sugar!" });
      expect(out.score).toBe(2);
    });

    it("accepts any value listed in acceptable[]", () => {
      const out = gradeItem(item, { q1: "minutes", q2: "milk" });
      expect(out.score).toBe(2);
      expect(out.results[1].isCorrect).toBe(true);
    });

    it("marks wrong words as incorrect", () => {
      const out = gradeItem(item, { q1: "hours", q2: "salt" });
      expect(out.score).toBe(0);
    });

    it("treats an empty string as incorrect (does not collapse to a match)", () => {
      const out = gradeItem(item, { q1: "", q2: "" });
      expect(out.score).toBe(0);
      expect(out.results.map((r) => r.isCorrect)).toEqual([false, false]);
    });

    it("treats a non-string answer as incorrect", () => {
      // Completion answers must be strings; any other shape should miss.
      const out = gradeItem(item, { q1: 5, q2: ["sugar"] });
      expect(out.score).toBe(0);
    });
  });

  describe("note_completion", () => {
    const item = completionItem("note_completion");
    it("grades correct + incorrect answers", () => {
      const out = gradeItem(item, { q1: "MINUTES", q2: "ketchup" });
      expect(out.results[0].isCorrect).toBe(true);
      expect(out.results[1].isCorrect).toBe(false);
    });
  });

  describe("table_completion", () => {
    const item = completionItem("table_completion");
    it("grades correct + incorrect answers", () => {
      const out = gradeItem(item, { q1: "minutes", q2: "salt" });
      expect(out.results[0].isCorrect).toBe(true);
      expect(out.results[1].isCorrect).toBe(false);
    });
  });

  describe("flow_chart_completion", () => {
    const item = completionItem("flow_chart_completion");
    it("accepts a correct answer (including the listed alternate)", () => {
      const out = gradeItem(item, { q1: "minutes", q2: "milk" });
      // q2 should accept the alternate value
      expect(out.score).toBe(2);
      expect(out.results.map((r) => r.isCorrect)).toEqual([true, true]);
    });
    it("marks wrong words as incorrect", () => {
      const out = gradeItem(item, { q1: "hours", q2: "salt" });
      expect(out.score).toBe(0);
      expect(out.results.map((r) => r.isCorrect)).toEqual([false, false]);
    });
  });

  // -----------------------------------------------------------------------
  // skimming — same grader path as mcq (numeric index into mcqOptions),
  // but exercised explicitly so the next person who refactors the type
  // union sees the contract.
  // -----------------------------------------------------------------------
  describe("skimming", () => {
    const item = baseItem<ReadingItem>({
      slug: "skim-1",
      level: "a2",
      type: "skimming",
      sortOrder: 0,
      title: "Skim",
      instructions: "",
      passage: "p",
      questions: [
        {
          id: "q1",
          prompt: "Main idea?",
          mcqOptions: ["wrong-a", "right-b", "wrong-c", "wrong-d"],
        },
      ],
      answerKey: {
        q1: { value: 1, explanation: "B is the main idea" },
      },
    });

    it("grades a correct numeric index and resolves the option text", () => {
      const out = gradeItem(item, { q1: 1 });
      expect(out.score).toBe(1);
      expect(out.results[0].isCorrect).toBe(true);
      expect(out.results[0].correctAnswer).toBe("right-b");
      expect(out.results[0].studentAnswer).toBe("right-b");
    });

    it("grades a wrong numeric index as incorrect", () => {
      const out = gradeItem(item, { q1: 0 });
      expect(out.score).toBe(0);
      expect(out.results[0].isCorrect).toBe(false);
      expect(out.results[0].studentAnswer).toBe("wrong-a");
    });

    it("accepts a numeric-string index just like mcq", () => {
      const out = gradeItem(item, { q1: "1" });
      expect(out.results[0].isCorrect).toBe(true);
      expect(out.results[0].studentAnswer).toBe("right-b");
    });
  });

  // -----------------------------------------------------------------------
  // scanning is polymorphic per question:
  //   - A2 items use MCQ-shape (mcqOptions present, numeric value).
  //   - B1 items use fill-in-the-blank (no mcqOptions, string value +
  //     optional acceptable[] alternatives — same path as short_answer).
  // -----------------------------------------------------------------------
  describe("scanning (A2 MCQ shape)", () => {
    const item = baseItem<ReadingItem>({
      slug: "scan-mcq-1",
      level: "a2",
      type: "scanning",
      sortOrder: 0,
      title: "Scan",
      instructions: "",
      passage: "p",
      questions: [
        { id: "q1", prompt: "Year?", mcqOptions: ["1850", "1889", "1900", "1920"] },
        { id: "q2", prompt: "City?", mcqOptions: ["London", "Paris", "Rome", "Berlin"] },
        { id: "q3", prompt: "Color?", mcqOptions: ["red", "green", "blue", "yellow"] },
      ],
      answerKey: {
        q1: { value: 1, explanation: "1889 is in the text" },
        q2: { value: 1, explanation: "Paris is in the text" },
        q3: { value: 2, explanation: "blue is in the text" },
      },
    });

    it("grades all-correct numeric indices", () => {
      const out = gradeItem(item, { q1: 1, q2: 1, q3: 2 });
      expect(out.score).toBe(3);
      expect(out.results.every((r) => r.isCorrect)).toBe(true);
      expect(out.results[0].correctAnswer).toBe("1889");
    });

    it("accepts numeric-string indices like mcq", () => {
      const out = gradeItem(item, { q1: "1", q2: "1", q3: "2" });
      expect(out.score).toBe(3);
    });

    it("marks wrong indices as incorrect", () => {
      const out = gradeItem(item, { q1: 0, q2: 1, q3: 0 });
      expect(out.score).toBe(1);
      expect(out.results.map((r) => r.isCorrect)).toEqual([false, true, false]);
    });
  });

  describe("scanning (B1 fill-in-the-blank shape)", () => {
    const item = baseItem<ReadingItem>({
      slug: "scan-blank-1",
      level: "b1",
      type: "scanning",
      sortOrder: 0,
      title: "Scan blank",
      instructions: "",
      passage: "p",
      // No mcqOptions on any question — pure short-answer shape.
      questions: [
        { id: "q1", prompt: "Year?" },
        { id: "q2", prompt: "Husband's name?" },
        { id: "q3", prompt: "Element?" },
      ],
      answerKey: {
        q1: { value: "1903", acceptable: ["in 1903"], explanation: "" },
        q2: { value: "Pierre Curie", acceptable: ["Pierre"], explanation: "" },
        q3: { value: "radium", acceptable: ["Radium"], explanation: "" },
      },
    });

    it("grades all-correct string answers (canonical values)", () => {
      const out = gradeItem(item, { q1: "1903", q2: "Pierre Curie", q3: "radium" });
      expect(out.score).toBe(3);
      expect(out.results.every((r) => r.isCorrect)).toBe(true);
      // The "correct answer" surfaced to the student stays the canonical
      // string — it is NOT looked up against any options array.
      expect(out.results[0].correctAnswer).toBe("1903");
      expect(out.results[1].correctAnswer).toBe("Pierre Curie");
    });

    it("accepts case-insensitive + acceptable alternatives", () => {
      const out = gradeItem(item, { q1: "in 1903", q2: "pierre", q3: "RADIUM" });
      expect(out.score).toBe(3);
    });

    it("marks empty / wrong answers incorrect", () => {
      const out = gradeItem(item, { q1: "", q2: "wrong", q3: "polonium" });
      expect(out.results.map((r) => r.isCorrect)).toEqual([false, false, false]);
    });

    it("supports a mixed item with both MCQ and blank questions", () => {
      const mixed = baseItem<ReadingItem>({
        slug: "scan-mixed-1",
        level: "b1",
        type: "scanning",
        sortOrder: 0,
        title: "Mixed",
        instructions: "",
        passage: "p",
        questions: [
          { id: "q1", prompt: "Year?", mcqOptions: ["1903", "1911", "1920", "1930"] },
          { id: "q2", prompt: "Husband?" },
        ],
        answerKey: {
          q1: { value: 0, explanation: "" },
          q2: { value: "Pierre Curie", acceptable: ["pierre"], explanation: "" },
        },
      });
      const out = gradeItem(mixed, { q1: 0, q2: "PIERRE" });
      expect(out.score).toBe(2);
      expect(out.results[0].correctAnswer).toBe("1903");
      expect(out.results[1].correctAnswer).toBe("Pierre Curie");
    });
  });

  describe("short_answer", () => {
    const item = completionItem("short_answer");
    it("grades correct + incorrect answers", () => {
      const out = gradeItem(item, { q1: "Minutes", q2: "wrong" });
      expect(out.results[0].isCorrect).toBe(true);
      expect(out.results[1].isCorrect).toBe(false);
    });

    it("normalizes unicode dashes so 'two-thirds' style answers do not slip through", () => {
      const dashItem = baseItem<ReadingItem>({
        slug: "short_answer-dash",
        level: "b1",
        type: "short_answer",
        sortOrder: 0,
        title: "C",
        instructions: "",
        passage: "p",
        questions: [{ id: "q1", prompt: "fraction" }],
        answerKey: { q1: { value: "two-thirds", explanation: "" } },
      });
      // An en-dash (U+2013) in the student answer should still match the
      // ASCII hyphen in the key.
      const out = gradeItem(dashItem, { q1: "two\u2013thirds" });
      expect(out.results[0].isCorrect).toBe(true);
    });
  });

  // -----------------------------------------------------------------------
  // Cross-cutting behavior
  // -----------------------------------------------------------------------
  describe("aggregate scoring", () => {
    it("computes score / total / percent across a mixed item", () => {
      const item = baseItem<ReadingItem>({
        slug: "tfng-mixed",
        level: "a2",
        type: "tfng",
        sortOrder: 0,
        title: "Mixed",
        instructions: "",
        passage: "p",
        questions: [
          { id: "q1", prompt: "" },
          { id: "q2", prompt: "" },
          { id: "q3", prompt: "" },
        ],
        answerKey: {
          q1: { value: "true", explanation: "" },
          q2: { value: "false", explanation: "" },
          q3: { value: "ng", explanation: "" },
        },
      });
      const out = gradeItem(item, { q1: "true", q2: "true", q3: "ng" });
      expect(out.score).toBe(2);
      expect(out.total).toBe(3);
      // 2/3 = 66.666… -> rounded to 67
      expect(out.percent).toBe(67);
    });

    it("returns percent 0 when there are no questions instead of NaN", () => {
      const item = baseItem<ReadingItem>({
        slug: "empty",
        level: "a2",
        type: "mcq",
        sortOrder: 0,
        title: "Empty",
        instructions: "",
        passage: "p",
        questions: [],
        answerKey: {},
      });
      const out = gradeItem(item, {});
      expect(out.score).toBe(0);
      expect(out.total).toBe(0);
      expect(out.percent).toBe(0);
    });

    it("flags a missing answer-key entry as incorrect with the documented note", () => {
      const item = baseItem<ReadingItem>({
        slug: "mcq-broken-key",
        level: "a2",
        type: "mcq",
        sortOrder: 0,
        title: "Broken key",
        instructions: "",
        passage: "p",
        questions: [
          {
            id: "q1",
            prompt: "Pick one",
            mcqOptions: ["a", "b"],
          },
        ],
        // No q1 entry — defensive branch should fire.
        answerKey: {},
      });
      const out = gradeItem(item, { q1: 0 });
      expect(out.score).toBe(0);
      expect(out.results[0].isCorrect).toBe(false);
      expect(out.results[0].correctAnswer).toBeNull();
      expect(out.results[0].explanation).toBe(
        "No answer key was found for this question.",
      );
    });
  });
});
