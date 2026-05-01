import { describe, it, expect } from "vitest";
import { READING_ITEMS } from "./itemBank";

// ---------------------------------------------------------------------------
// Structural invariants for the reading item bank.
//
// `itemBank.ts` is ~2700 lines of hand-edited content. The grader tests pin
// scoring behavior, but a typo inside the bank itself — a missing
// `answerKey` entry, an mcq `value` index pointing past `mcqOptions`, a
// matching answer pointing past `options`, a stray "Not Given" instead of
// "ng", or a duplicate slug — would compile fine and only surface as a
// silently wrong score for a real student.
//
// This spec walks every item and asserts the invariants that the grader
// relies on. A regression here fails at boot (`pnpm test`) instead of in
// production.
// ---------------------------------------------------------------------------

describe("READING_ITEMS bank", () => {
  it("has unique slugs across the whole bank", () => {
    const seen = new Map<string, number>();
    for (const item of READING_ITEMS) {
      seen.set(item.slug, (seen.get(item.slug) ?? 0) + 1);
    }
    const duplicates = [...seen.entries()].filter(([, n]) => n > 1);
    expect(duplicates).toEqual([]);
  });

  describe.each(READING_ITEMS.map((item) => [item.slug, item] as const))(
    "%s",
    (_slug, item) => {
      it("has at least one question", () => {
        expect(item.questions.length).toBeGreaterThan(0);
      });

      it("has unique sub-question ids", () => {
        const ids = item.questions.map((q) => q.id);
        expect(new Set(ids).size).toBe(ids.length);
      });

      it("has an answerKey entry for every question id", () => {
        for (const q of item.questions) {
          expect(
            item.answerKey[q.id],
            `missing answerKey entry for question ${q.id}`,
          ).toBeDefined();
        }
      });

      it("answerKey values match the contract for this question type", () => {
        for (const q of item.questions) {
          const entry = item.answerKey[q.id];
          if (!entry) continue; // already reported above
          const value = entry.value;

          switch (item.type) {
            case "mcq":
            case "skimming": {
              expect(
                Array.isArray(q.mcqOptions),
                `${item.type} question ${q.id} is missing mcqOptions`,
              ).toBe(true);
              const opts = q.mcqOptions ?? [];
              expect(typeof value).toBe("number");
              expect(Number.isInteger(value)).toBe(true);
              expect(value as number).toBeGreaterThanOrEqual(0);
              expect(value as number).toBeLessThan(opts.length);
              break;
            }
            case "scanning": {
              // Scanning is polymorphic per question. A2 questions carry
              // mcqOptions and a numeric value; B1 questions are
              // fill-in-the-blank with a string value.
              if (q.mcqOptions && q.mcqOptions.length > 0) {
                expect(typeof value).toBe("number");
                expect(Number.isInteger(value)).toBe(true);
                expect(value as number).toBeGreaterThanOrEqual(0);
                expect(value as number).toBeLessThan(q.mcqOptions.length);
              } else {
                expect(
                  typeof value,
                  `scanning fill-in question ${q.id} value should be a string`,
                ).toBe("string");
                expect((value as string).length).toBeGreaterThan(0);
              }
              break;
            }
            case "matching_headings":
            case "matching_features": {
              expect(
                Array.isArray(item.options),
                `${item.type} item is missing options`,
              ).toBe(true);
              const opts = item.options ?? [];
              expect(typeof value).toBe("number");
              expect(Number.isInteger(value)).toBe(true);
              expect(value as number).toBeGreaterThanOrEqual(0);
              expect(value as number).toBeLessThan(opts.length);
              break;
            }
            case "tfng": {
              expect(["true", "false", "ng"]).toContain(value);
              break;
            }
            case "ynng": {
              expect(["yes", "no", "ng"]).toContain(value);
              break;
            }
            case "sentence_completion":
            case "note_completion":
            case "table_completion":
            case "flow_chart_completion":
            case "short_answer": {
              expect(typeof value).toBe("string");
              expect((value as string).length).toBeGreaterThan(0);
              break;
            }
          }
        }
      });
    },
  );
});
