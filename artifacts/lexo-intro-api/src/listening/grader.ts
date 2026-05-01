import type { Question, ListeningTest } from "./testBank";

export interface PerQuestionResult {
  id: string;
  type: Question["type"];
  prompt: string;
  studentAnswer: unknown;
  correctAnswer: unknown;
  isCorrect: boolean;
  points: number;
  maxPoints: number;
}

export interface GradeResult {
  score: number;
  total: number;
  percent: number;
  results: PerQuestionResult[];
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

function isCompletionMatch(student: string, canonical: string, acceptable: string[]): boolean {
  const sn = normalize(student);
  if (!sn) return false;
  const candidates = [canonical, ...acceptable].map(normalize).filter(Boolean);
  return candidates.includes(sn);
}

export function gradeTest(test: ListeningTest, answers: Record<string, unknown>): GradeResult {
  const results: PerQuestionResult[] = [];
  let score = 0;
  let total = 0;

  for (const q of test.questions) {
    total += 1;
    let isCorrect = false;
    let correctAnswer: unknown;
    const studentAnswer = answers?.[q.id];

    let displayStudentAnswer: unknown = studentAnswer ?? null;

    if (q.type === "mcq") {
      correctAnswer = q.options[q.answer];
      const sn = typeof studentAnswer === "number" ? studentAnswer : Number(studentAnswer);
      isCorrect = Number.isFinite(sn) && sn === q.answer;
      displayStudentAnswer = Number.isFinite(sn) && sn >= 0 && sn < q.options.length ? q.options[sn] : null;
    } else if (q.type === "matching") {
      const correct = q.answers.map((idx) => q.options[idx]);
      correctAnswer = correct;
      if (Array.isArray(studentAnswer) && studentAnswer.length === q.answers.length) {
        isCorrect = q.answers.every((target, i) => {
          const s = studentAnswer[i];
          const sn = typeof s === "number" ? s : Number(s);
          return Number.isFinite(sn) && sn === target;
        });
        displayStudentAnswer = studentAnswer.map((s) => {
          const sn = typeof s === "number" ? s : Number(s);
          return Number.isFinite(sn) && sn >= 0 && sn < q.options.length ? q.options[sn] : null;
        });
      } else {
        displayStudentAnswer = null;
      }
    } else {
      // completion / short answer
      correctAnswer = q.answer;
      isCorrect = isCompletionMatch(typeof studentAnswer === "string" ? studentAnswer : "", q.answer, q.acceptable);
      displayStudentAnswer = typeof studentAnswer === "string" ? studentAnswer : null;
    }

    if (isCorrect) score += 1;
    results.push({
      id: q.id,
      type: q.type,
      prompt: q.prompt,
      studentAnswer: displayStudentAnswer,
      correctAnswer,
      isCorrect,
      points: isCorrect ? 1 : 0,
      maxPoints: 1,
    });
  }

  return {
    score,
    total,
    percent: total === 0 ? 0 : Math.round((score / total) * 100),
    results,
  };
}

export function buildAnalysisFallback(test: ListeningTest, grade: GradeResult): string {
  const byType: Record<string, { correct: number; total: number }> = {};
  for (const r of grade.results) {
    const k = r.type;
    if (!byType[k]) byType[k] = { correct: 0, total: 0 };
    byType[k].total += 1;
    if (r.isCorrect) byType[k].correct += 1;
  }
  const labelOf: Record<string, string> = {
    mcq: "multiple choice",
    matching: "matching",
    note_completion: "note completion",
    sentence_completion: "sentence completion",
    short_answer: "short answer",
  };
  const strengths: string[] = [];
  const weaknesses: string[] = [];
  for (const [type, agg] of Object.entries(byType)) {
    const pct = agg.correct / agg.total;
    if (pct >= 0.75) strengths.push(labelOf[type] || type);
    else if (pct <= 0.34) weaknesses.push(labelOf[type] || type);
  }
  const lines: string[] = [];
  lines.push(`You scored ${grade.score} out of ${grade.total} (${grade.percent}%) on "${test.title}".`);
  if (strengths.length) lines.push(`Strengths: you did well on ${strengths.join(", ")} questions.`);
  if (weaknesses.length) lines.push(`Focus area: practise more ${weaknesses.join(", ")} questions — these were the hardest for you in this test.`);
  if (!strengths.length && !weaknesses.length) {
    lines.push(`Your performance was even across the question types. Keep practising to push your accuracy higher.`);
  }
  lines.push(`Tip: when listening, try to predict the answer before you hear it — note keywords from the question first.`);
  return lines.join(" ");
}
