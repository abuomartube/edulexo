import type { AnswerEntry, ReadingItem } from "./itemBank";

export interface PerSubResult {
  id: string;
  prompt: string;
  studentAnswer: unknown;
  correctAnswer: unknown;          // human-readable form, suitable for display
  isCorrect: boolean;
  explanation: string;
}

export interface ReadingGradeResult {
  score: number;
  total: number;
  percent: number;
  results: PerSubResult[];
}

function normalize(s: unknown): string {
  if (typeof s !== "string") return "";
  return s
    .trim()
    .toLowerCase()
    .replace(/[.,!?'`"`]+/g, "")
    .replace(/[‐‑‒–—−]/g, "-")
    .replace(/\s+/g, " ");
}

function isStringMatch(student: string, key: AnswerEntry): boolean {
  const sn = normalize(student);
  if (!sn) return false;
  const candidates = [key.value, ...(key.acceptable ?? [])]
    .map((c) => normalize(typeof c === "number" ? String(c) : (c ?? "")))
    .filter(Boolean);
  return candidates.includes(sn);
}

function pickIndex(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function readableHumanAnswer(item: ReadingItem, qid: string, key: AnswerEntry): unknown {
  // Scanning is polymorphic: A2 items are MCQ-shape (per-question mcqOptions
  // present, numeric value), B1 items are short-answer-shape (no mcqOptions,
  // string value). Dispatch per-question based on the presence of mcqOptions.
  if (item.type === "scanning") {
    const sub = item.questions.find((q) => q.id === qid);
    if (sub?.mcqOptions && sub.mcqOptions.length > 0) {
      const idx = typeof key.value === "number" ? key.value : Number(key.value);
      return Number.isInteger(idx) && idx >= 0 && idx < sub.mcqOptions.length
        ? sub.mcqOptions[idx]
        : key.value;
    }
    return key.value;
  }
  switch (item.type) {
    case "mcq":
    case "skimming": {
      const sub = item.questions.find((q) => q.id === qid);
      const opts = sub?.mcqOptions ?? [];
      const idx = typeof key.value === "number" ? key.value : Number(key.value);
      return Number.isInteger(idx) && idx >= 0 && idx < opts.length ? opts[idx] : key.value;
    }
    case "matching_headings":
    case "matching_features": {
      const opts = item.options ?? [];
      const idx = typeof key.value === "number" ? key.value : Number(key.value);
      return Number.isInteger(idx) && idx >= 0 && idx < opts.length ? opts[idx] : key.value;
    }
    case "tfng": {
      const v = String(key.value).toLowerCase();
      return v === "true" ? "TRUE" : v === "false" ? "FALSE" : "NOT GIVEN";
    }
    case "ynng": {
      const v = String(key.value).toLowerCase();
      return v === "yes" ? "YES" : v === "no" ? "NO" : "NOT GIVEN";
    }
    default:
      return key.value;
  }
}

function readableStudentAnswer(item: ReadingItem, qid: string, raw: unknown): unknown {
  if (raw === undefined || raw === null || raw === "") return null;
  // Scanning is polymorphic — see readableHumanAnswer for the full rationale.
  if (item.type === "scanning") {
    const sub = item.questions.find((q) => q.id === qid);
    if (sub?.mcqOptions && sub.mcqOptions.length > 0) {
      const idx = pickIndex(raw);
      return idx !== null && idx >= 0 && idx < sub.mcqOptions.length
        ? sub.mcqOptions[idx]
        : raw;
    }
    return raw;
  }
  switch (item.type) {
    case "mcq":
    case "skimming": {
      const sub = item.questions.find((q) => q.id === qid);
      const opts = sub?.mcqOptions ?? [];
      const idx = pickIndex(raw);
      return idx !== null && idx >= 0 && idx < opts.length ? opts[idx] : raw;
    }
    case "matching_headings":
    case "matching_features": {
      const opts = item.options ?? [];
      const idx = pickIndex(raw);
      return idx !== null && idx >= 0 && idx < opts.length ? opts[idx] : raw;
    }
    case "tfng": {
      const v = String(raw).toLowerCase().trim();
      if (v === "true") return "TRUE";
      if (v === "false") return "FALSE";
      if (v === "ng" || v === "not given" || v === "notgiven") return "NOT GIVEN";
      return raw;
    }
    case "ynng": {
      const v = String(raw).toLowerCase().trim();
      if (v === "yes") return "YES";
      if (v === "no") return "NO";
      if (v === "ng" || v === "not given" || v === "notgiven") return "NOT GIVEN";
      return raw;
    }
    default:
      return raw;
  }
}

export function gradeItem(item: ReadingItem, answers: Record<string, unknown>): ReadingGradeResult {
  const results: PerSubResult[] = [];
  let score = 0;
  let total = 0;

  for (const sub of item.questions) {
    total += 1;
    const key = item.answerKey[sub.id];
    if (!key) {
      // Defensive: missing answer key entry — treat as incorrect with note.
      results.push({
        id: sub.id,
        prompt: sub.prompt,
        studentAnswer: answers[sub.id] ?? null,
        correctAnswer: null,
        isCorrect: false,
        explanation: "No answer key was found for this question.",
      });
      continue;
    }

    const studentRaw = answers[sub.id];
    let isCorrect = false;

    switch (item.type) {
      case "mcq":
      case "skimming":
      case "matching_headings":
      case "matching_features": {
        const target = typeof key.value === "number" ? key.value : Number(key.value);
        const got = pickIndex(studentRaw);
        isCorrect = got !== null && Number.isFinite(target) && got === target;
        break;
      }
      case "scanning": {
        // Per-question dispatch: A2 questions carry mcqOptions and grade
        // numerically; B1 questions are fill-in-the-blank and grade as a
        // string match against value + acceptable[] alternatives.
        if (sub.mcqOptions && sub.mcqOptions.length > 0) {
          const target = typeof key.value === "number" ? key.value : Number(key.value);
          const got = pickIndex(studentRaw);
          isCorrect = got !== null && Number.isFinite(target) && got === target;
        } else {
          isCorrect = isStringMatch(typeof studentRaw === "string" ? studentRaw : "", key);
        }
        break;
      }
      case "tfng":
      case "ynng": {
        const target = String(key.value).toLowerCase().trim();
        const got = String(studentRaw ?? "").toLowerCase().trim();
        // accept "not given" or "notgiven" in addition to "ng"
        const norm = got === "not given" || got === "notgiven" ? "ng" : got;
        isCorrect = !!norm && norm === target;
        break;
      }
      default: {
        // sentence_completion / note_completion / table_completion / flow_chart_completion / short_answer
        isCorrect = isStringMatch(typeof studentRaw === "string" ? studentRaw : "", key);
        break;
      }
    }

    if (isCorrect) score += 1;
    results.push({
      id: sub.id,
      prompt: sub.prompt,
      studentAnswer: readableStudentAnswer(item, sub.id, studentRaw),
      correctAnswer: readableHumanAnswer(item, sub.id, key),
      isCorrect,
      explanation: key.explanation,
    });
  }

  const percent = total === 0 ? 0 : Math.round((score / total) * 100);
  return { score, total, percent, results };
}
