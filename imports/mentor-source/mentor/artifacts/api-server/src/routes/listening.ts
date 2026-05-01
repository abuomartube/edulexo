import { Router, type Request } from "express";
import { Readable } from "node:stream";
import { db } from "@workspace/db";
import { listeningAttempts } from "@workspace/db/schema";
import { and, desc, eq } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { openai } from "@workspace/integrations-openai-ai-server";
import { SECTIONS, type ListeningTest, type Segment } from "../listening/testBank";
import { gradeTest, buildAnalysisFallback, type GradeResult } from "../listening/grader";
import {
  buildAudioManifest,
  cleanupOrphanedSegments,
  collectReferencedHashes,
  countCachedSegments,
  deleteSegmentByHash,
  getOrCreateSegment,
  objectStorageService,
  primeAllTests,
} from "../listening/audioCache";
import {
  cleanupReplacedSegments,
  primeListeningTestAudioInBackground,
} from "../listening/primeAfterSave";
import {
  initListeningTests,
  loadAllTests,
  loadTestBySlug,
  loadAllTestRows,
  loadTestRowBySlug,
  createTest,
  updateTest,
  deleteTest,
  reorderTestsInSection,
  moveTestToSection,
  ReorderSlugMismatchError,
  ReorderIncompleteError,
  MoveValidationError,
  MoveTestNotFoundError,
  type PublicQuestion,
  type AnswerKey,
  type AnswerKeyEntry,
} from "../listening/testStore";
import { getStudentToken, getAdminToken } from "./auth";
import { findStaticAudio } from "../lib/staticAudio";

function studentIdFrom(req: Request): number | null {
  const tok = getStudentToken(req as { cookies?: Record<string, string> });
  return tok?.id ?? null;
}

function isPgUniqueViolation(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { code?: unknown }).code === "23505";
}

const router = Router();

async function ensureTable() {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS listening_attempts (
        id SERIAL PRIMARY KEY,
        student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
        test_id VARCHAR(64) NOT NULL,
        section_id INTEGER NOT NULL,
        answers JSONB NOT NULL,
        score INTEGER NOT NULL,
        total INTEGER NOT NULL,
        percent REAL NOT NULL,
        results JSONB NOT NULL,
        analysis TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      )
    `);
    await db.execute(sql`
      CREATE UNIQUE INDEX IF NOT EXISTS listening_attempts_student_test_uniq
      ON listening_attempts (student_id, test_id)
    `);
  } catch (err) {
    console.error("[listening] failed to ensure table:", err);
  }
}
ensureTable();
// Kick off listening_tests table creation + seed on boot.
initListeningTests().catch((err) => {
  console.error("[listening] init failed:", err);
});

function publicTest(test: ListeningTest) {
  return {
    id: test.id,
    sectionId: test.sectionId,
    title: test.title,
    description: test.description,
    questions: test.questions.map((q) => {
      if (q.type === "mcq") {
        return { id: q.id, type: q.type, prompt: q.prompt, options: q.options };
      }
      if (q.type === "matching") {
        return { id: q.id, type: q.type, prompt: q.prompt, items: q.items, options: q.options };
      }
      return { id: q.id, type: q.type, prompt: q.prompt, wordLimit: q.wordLimit, context: q.context };
    }),
  };
}

router.get("/sections", async (_req, res) => {
  res.json({ sections: SECTIONS });
});

router.get("/tests", async (req, res) => {
  const studentId = studentIdFrom(req);
  try {
    const tests = await loadAllTests();
    const completed = studentId
      ? await db
          .select({ testId: listeningAttempts.testId, score: listeningAttempts.score, total: listeningAttempts.total, percent: listeningAttempts.percent, createdAt: listeningAttempts.createdAt })
          .from(listeningAttempts)
          .where(eq(listeningAttempts.studentId, studentId))
      : [];
    const completedMap = new Map<string, { score: number; total: number; percent: number; createdAt: Date }>();
    for (const c of completed) {
      completedMap.set(c.testId, { score: c.score, total: c.total, percent: c.percent, createdAt: c.createdAt });
    }
    res.json({
      sections: SECTIONS,
      tests: tests.map((t) => ({
        id: t.id,
        sectionId: t.sectionId,
        title: t.title,
        description: t.description,
        questionCount: t.questions.length,
        completed: completedMap.has(t.id),
        result: completedMap.get(t.id) ?? null,
      })),
    });
  } catch (err) {
    req.log.error({ err }, "List listening tests error");
    res.status(500).json({ error: "list_failed" });
  }
});

router.get("/tests/:testId", async (req, res) => {
  const studentId = studentIdFrom(req);
  const test = await loadTestBySlug(req.params.testId);
  if (!test) {
    res.status(404).json({ error: "Test not found" });
    return;
  }
  try {
    if (studentId) {
      const [existing] = await db
        .select()
        .from(listeningAttempts)
        .where(and(eq(listeningAttempts.studentId, studentId), eq(listeningAttempts.testId, test.id)));
      if (existing) {
        res.json({
          test: publicTest(test),
          alreadyCompleted: true,
          attempt: {
            id: existing.id,
            answers: existing.answers,
            score: existing.score,
            total: existing.total,
            percent: existing.percent,
            results: existing.results,
            analysis: existing.analysis,
            createdAt: existing.createdAt,
          },
        });
        return;
      }
    }
    res.json({ test: publicTest(test), alreadyCompleted: false });
  } catch (err) {
    req.log.error({ err }, "Get listening test error");
    res.status(500).json({ error: "fetch_failed" });
  }
});

router.get("/tests/:testId/audio", async (req, res) => {
  const test = await loadTestBySlug(req.params.testId);
  if (!test) {
    res.status(404).json({ error: "Test not found" });
    return;
  }
  try {
    const segments = await buildAudioManifest(test.segments);
    res.json({ segments });
  } catch (err) {
    req.log.error({ err }, "Listening audio manifest error");
    res.status(500).json({ error: "audio_failed" });
  }
});

router.post("/tests/:testId/submit", async (req, res) => {
  const studentId = studentIdFrom(req);
  if (!studentId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  const test = await loadTestBySlug(req.params.testId);
  if (!test) {
    res.status(404).json({ error: "Test not found" });
    return;
  }
  try {
    const [existing] = await db
      .select()
      .from(listeningAttempts)
      .where(and(eq(listeningAttempts.studentId, studentId), eq(listeningAttempts.testId, test.id)));
    if (existing) {
      res.status(409).json({ error: "Test already completed", attempt: existing });
      return;
    }

    const body = req.body as { answers?: unknown };
    const answers = body.answers;
    if (!answers || typeof answers !== "object" || Array.isArray(answers)) {
      res.status(400).json({ error: "Missing answers" });
      return;
    }
    const answersRecord = answers as Record<string, unknown>;
    const grade = gradeTest(test, answersRecord);
    const analysis = await generateAnalysis(test, grade).catch(() => buildAnalysisFallback(test, grade));

    try {
      const [inserted] = await db
        .insert(listeningAttempts)
        .values({
          studentId,
          testId: test.id,
          sectionId: test.sectionId,
          answers: answersRecord,
          score: grade.score,
          total: grade.total,
          percent: grade.percent,
          results: grade.results,
          analysis,
        })
        .returning();
      res.json({
        attempt: {
          id: inserted.id,
          answers: answersRecord,
          score: inserted.score,
          total: inserted.total,
          percent: inserted.percent,
          results: inserted.results,
          analysis: inserted.analysis,
          createdAt: inserted.createdAt,
        },
      });
    } catch (err) {
      if (isPgUniqueViolation(err)) {
        // race: another request beat us to it; fetch and return that attempt.
        const [again] = await db
          .select()
          .from(listeningAttempts)
          .where(and(eq(listeningAttempts.studentId, studentId), eq(listeningAttempts.testId, test.id)));
        if (again) {
          res.status(409).json({ error: "Test already completed", attempt: again });
          return;
        }
      }
      throw err;
    }
  } catch (err) {
    req.log.error({ err }, "Submit listening test error");
    res.status(500).json({ error: "submit_failed" });
  }
});

router.get("/attempts", async (req, res) => {
  const studentId = studentIdFrom(req);
  if (!studentId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  try {
    const rows = await db
      .select({
        id: listeningAttempts.id,
        testId: listeningAttempts.testId,
        sectionId: listeningAttempts.sectionId,
        score: listeningAttempts.score,
        total: listeningAttempts.total,
        percent: listeningAttempts.percent,
        createdAt: listeningAttempts.createdAt,
      })
      .from(listeningAttempts)
      .where(eq(listeningAttempts.studentId, studentId))
      .orderBy(desc(listeningAttempts.createdAt));
    const titleById = new Map<string, { title: string; description: string }>();
    const tests = await loadAllTests();
    for (const t of tests) {
      titleById.set(t.id, { title: t.title, description: t.description });
    }
    res.json({
      sections: SECTIONS,
      attempts: rows.map((r) => ({
        id: r.id,
        testId: r.testId,
        sectionId: r.sectionId,
        score: r.score,
        total: r.total,
        percent: r.percent,
        createdAt: r.createdAt,
        title: titleById.get(r.testId)?.title ?? r.testId,
        description: titleById.get(r.testId)?.description ?? "",
      })),
    });
  } catch (err) {
    req.log.error({ err }, "List listening attempts error");
    res.status(500).json({ error: "list_failed" });
  }
});

router.get("/attempts/:testId", async (req, res) => {
  const studentId = studentIdFrom(req);
  if (!studentId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  try {
    const [existing] = await db
      .select()
      .from(listeningAttempts)
      .where(and(eq(listeningAttempts.studentId, studentId), eq(listeningAttempts.testId, req.params.testId)));
    if (!existing) {
      res.status(404).json({ error: "No attempt found" });
      return;
    }
    res.json({ attempt: existing });
  } catch (err) {
    req.log.error({ err }, "Get listening attempt error");
    res.status(500).json({ error: "fetch_failed" });
  }
});

async function generateAnalysis(test: ListeningTest, grade: GradeResult): Promise<string> {
  const byType: Record<string, { correct: number; total: number }> = {};
  for (const r of grade.results) {
    if (!byType[r.type]) byType[r.type] = { correct: 0, total: 0 };
    byType[r.type].total += 1;
    if (r.isCorrect) byType[r.type].correct += 1;
  }
  const breakdown = Object.entries(byType)
    .map(([k, v]) => `${k}: ${v.correct}/${v.total}`)
    .join(", ");

  const prompt = `You are an English listening tutor giving short, friendly feedback to an A2-level learner.
The student just finished an A2 listening test titled "${test.title}".
Score: ${grade.score}/${grade.total} (${grade.percent}%).
Per question type: ${breakdown}.

Write 3 short paragraphs (4-6 sentences total), simple language, no headings or markdown:
1) Quick honest summary of how they did.
2) The strongest question type(s) and why that's good.
3) The weakest question type(s) and ONE specific tip to improve.

Keep it warm, encouraging, and concrete. Do not use bullet points or asterisks.`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.5,
    max_tokens: 320,
    messages: [
      { role: "system", content: "You are a kind A2 English listening tutor giving short, simple feedback." },
      { role: "user", content: prompt },
    ],
  });
  const text = response.choices[0]?.message?.content?.trim() ?? "";
  return text || buildAnalysisFallback(test, grade);
}

export default router;

// ---------------------------------------------------------------------------
// Admin-only listening routes (no requireActiveStudent guard)
// ---------------------------------------------------------------------------
export const listeningAdminRouter = Router();

function requireAdmin(req: Request): boolean {
  return getAdminToken(req as { cookies?: Record<string, string> });
}

listeningAdminRouter.post("/admin/prime-audio", async (req, res) => {
  if (!requireAdmin(req)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  // Stream progress as newline-delimited JSON so the admin UI can show
  // live updates (current test, segments completed, per-test failures)
  // instead of staring at a spinner for minutes.
  res.status(200);
  res.setHeader("Content-Type", "application/x-ndjson; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("X-Accel-Buffering", "no");
  // Flush headers immediately so the client opens the stream.
  if (typeof (res as unknown as { flushHeaders?: () => void }).flushHeaders === "function") {
    (res as unknown as { flushHeaders: () => void }).flushHeaders();
  }

  const writeEvent = (event: Record<string, unknown>): void => {
    if (res.writableEnded) return;
    res.write(`${JSON.stringify(event)}\n`);
  };

  // When the admin clicks "Cancel" the client aborts its fetch, which
  // closes this request. Wire that into an AbortController so primeAllTests
  // stops between segments instead of grinding through every remaining
  // TTS call. We listen on BOTH req and res because some runtimes/proxies
  // surface client disconnect on only one of them.
  const cancelController = new AbortController();
  let finished = false;
  const onClientClose = () => {
    if (!finished) cancelController.abort();
  };
  req.on("close", onClientClose);
  res.on("close", onClientClose);

  try {
    const tests = await loadAllTests();
    writeEvent({ kind: "start", testsTotal: tests.length });

    const summary = await primeAllTests(tests, {
      signal: cancelController.signal,
      onProgress: (ev) => {
        writeEvent(ev);
      },
    });

    const baseMessage = `${summary.testsPrimed}/${summary.testsTotal} tests primed, ${summary.segmentsUploaded} segments uploaded, ${summary.segmentsSkipped} skipped${summary.segmentsFailed ? `, ${summary.segmentsFailed} failed` : ""}.`;
    const message = summary.cancelled ? `Cancelled. ${baseMessage}` : baseMessage;
    req.log.info(
      { testsPrimed: summary.testsPrimed, testsTotal: summary.testsTotal, segmentsUploaded: summary.segmentsUploaded, segmentsSkipped: summary.segmentsSkipped, segmentsFailed: summary.segmentsFailed, cancelled: summary.cancelled },
      `[listening] prime-audio: ${message}`,
    );
    writeEvent({ kind: "summary", message, summary });
    finished = true;
    res.end();
  } catch (err) {
    req.log.error({ err }, "Prime listening audio error");
    writeEvent({
      kind: "error",
      error: err instanceof Error ? err.message : "prime_failed",
    });
    finished = true;
    res.end();
  } finally {
    req.off("close", onClientClose);
    res.off("close", onClientClose);
  }
});

listeningAdminRouter.post("/admin/preview-segment", async (req, res) => {
  if (!requireAdmin(req)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const body = (req.body ?? {}) as { text?: unknown; voice?: unknown };
  const text = typeof body.text === "string" ? body.text.trim() : "";
  const voice = typeof body.voice === "string" ? body.voice : "";
  if (!text) {
    res.status(400).json({ error: "Text is required" });
    return;
  }
  if (voice !== "alloy" && voice !== "nova") {
    res.status(400).json({ error: "voice must be 'alloy' or 'nova'" });
    return;
  }
  try {
    const { url, uploaded } = await getOrCreateSegment(text, voice);
    res.json({ url, uploaded });
  } catch (err) {
    req.log.error({ err }, "Admin preview segment error");
    res.status(500).json({ error: "preview_failed" });
  }
});

// ----- Listening Test CRUD (admin) -----
const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/;
const VOICES = new Set(["alloy", "nova"]);
const COMPLETION_TYPES = new Set(["note_completion", "sentence_completion", "short_answer"]);

interface ParsedTestPayload {
  slug: string;
  sectionId: number;
  title: string;
  description: string;
  transcript: Segment[];
  questions: PublicQuestion[];
  answerKey: AnswerKey;
}

function parseTestPayload(body: unknown, opts: { requireSlug: boolean }): ParsedTestPayload {
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("Invalid payload");
  const b = body as Record<string, unknown>;

  const slug = typeof b.slug === "string" ? b.slug.trim().toLowerCase() : "";
  if (opts.requireSlug) {
    if (!slug || !SLUG_RE.test(slug)) {
      throw new Error("Slug is required (lowercase letters, numbers and hyphens only)");
    }
  }

  const sectionId = Number(b.sectionId);
  if (![1, 2, 3, 4].includes(sectionId)) throw new Error("sectionId must be 1, 2, 3 or 4");

  const title = typeof b.title === "string" ? b.title.trim() : "";
  if (!title) throw new Error("Title is required");

  const description = typeof b.description === "string" ? b.description.trim() : "";

  if (!Array.isArray(b.transcript) || b.transcript.length === 0) {
    throw new Error("Transcript must contain at least one segment");
  }
  const transcript: Segment[] = b.transcript.map((s, i) => {
    if (!s || typeof s !== "object") throw new Error(`Segment ${i + 1}: invalid`);
    const seg = s as Record<string, unknown>;
    const voice = typeof seg.voice === "string" ? seg.voice : "";
    const text = typeof seg.text === "string" ? seg.text.trim() : "";
    if (!VOICES.has(voice)) throw new Error(`Segment ${i + 1}: voice must be 'alloy' or 'nova'`);
    if (!text) throw new Error(`Segment ${i + 1}: text is required`);
    return { voice: voice as Segment["voice"], text };
  });

  if (!Array.isArray(b.questions) || b.questions.length === 0) {
    throw new Error("At least one question is required");
  }
  const answerKeyInput = (b.answerKey ?? {}) as Record<string, unknown>;
  if (typeof answerKeyInput !== "object" || answerKeyInput === null || Array.isArray(answerKeyInput)) {
    throw new Error("answerKey must be an object");
  }
  const seenIds = new Set<string>();
  const questions: PublicQuestion[] = [];
  const answerKey: AnswerKey = {};
  for (let i = 0; i < b.questions.length; i++) {
    const q = b.questions[i] as Record<string, unknown>;
    if (!q || typeof q !== "object") throw new Error(`Question ${i + 1}: invalid`);
    const id = typeof q.id === "string" ? q.id.trim() : "";
    const type = typeof q.type === "string" ? q.type : "";
    const prompt = typeof q.prompt === "string" ? q.prompt.trim() : "";
    if (!id) throw new Error(`Question ${i + 1}: id is required`);
    if (seenIds.has(id)) throw new Error(`Question ${i + 1}: duplicate id "${id}"`);
    seenIds.add(id);
    if (!prompt) throw new Error(`Question ${id}: prompt is required`);
    const akEntry = answerKeyInput[id] as Record<string, unknown> | undefined;
    if (!akEntry) throw new Error(`Question ${id}: missing answer key entry`);

    if (type === "mcq") {
      const options = Array.isArray(q.options) ? q.options.map((x) => String(x)) : [];
      if (options.length < 2) throw new Error(`Question ${id}: MCQ needs at least 2 options`);
      const answer = Number(akEntry.answer);
      if (!Number.isInteger(answer) || answer < 0 || answer >= options.length) {
        throw new Error(`Question ${id}: answer index out of range`);
      }
      questions.push({ id, type: "mcq", prompt, options });
      answerKey[id] = { type: "mcq", answer };
    } else if (type === "matching") {
      const items = Array.isArray(q.items) ? q.items.map((x) => String(x)) : [];
      const options = Array.isArray(q.options) ? q.options.map((x) => String(x)) : [];
      if (items.length === 0) throw new Error(`Question ${id}: matching needs at least 1 item`);
      if (options.length === 0) throw new Error(`Question ${id}: matching needs at least 1 option`);
      const answers = Array.isArray(akEntry.answers) ? akEntry.answers.map((x) => Number(x)) : [];
      if (answers.length !== items.length) {
        throw new Error(`Question ${id}: matching needs ${items.length} answers (one per item)`);
      }
      for (const a of answers) {
        if (!Number.isInteger(a) || a < 0 || a >= options.length) {
          throw new Error(`Question ${id}: answer index out of range`);
        }
      }
      questions.push({ id, type: "matching", prompt, items, options });
      answerKey[id] = { type: "matching", answers };
    } else if (COMPLETION_TYPES.has(type)) {
      const completionType = type as "note_completion" | "sentence_completion" | "short_answer";
      const wordLimit = Number(q.wordLimit) || 1;
      const context = typeof q.context === "string" && q.context.trim() ? q.context.trim() : undefined;
      const answer = typeof akEntry.answer === "string" ? akEntry.answer.trim() : "";
      if (!answer) throw new Error(`Question ${id}: answer is required`);
      const acceptable = Array.isArray(akEntry.acceptable)
        ? akEntry.acceptable.map((x) => String(x).trim()).filter(Boolean)
        : [];
      const pq: PublicQuestion = context
        ? { id, type: completionType, prompt, wordLimit, context }
        : { id, type: completionType, prompt, wordLimit };
      questions.push(pq);
      answerKey[id] = { type: completionType, answer, acceptable };
    } else {
      throw new Error(`Question ${id}: unknown type "${type}"`);
    }
  }

  return {
    slug,
    sectionId,
    title,
    description,
    transcript,
    questions,
    answerKey,
  };
}

listeningAdminRouter.get("/admin/tests", async (req, res) => {
  if (!requireAdmin(req)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const rows = await loadAllTestRows();
    res.json({
      sections: SECTIONS,
      tests: rows.map((r) => ({
        id: r.id,
        slug: r.slug,
        sectionId: r.sectionId,
        title: r.title,
        description: r.description,
        questionCount: r.questions.length,
        segmentCount: r.transcript.length,
        sortOrder: r.sortOrder,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      })),
    });
  } catch (err) {
    req.log.error({ err }, "Admin list listening tests error");
    res.status(500).json({ error: "list_failed" });
  }
});

listeningAdminRouter.get("/admin/tests/:slug", async (req, res) => {
  if (!requireAdmin(req)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const row = await loadTestRowBySlug(req.params.slug);
    if (!row) {
      res.status(404).json({ error: "Test not found" });
      return;
    }
    res.json({ test: row });
  } catch (err) {
    req.log.error({ err }, "Admin get listening test error");
    res.status(500).json({ error: "fetch_failed" });
  }
});

listeningAdminRouter.post("/admin/tests", async (req, res) => {
  if (!requireAdmin(req)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  let parsed: ParsedTestPayload;
  try {
    parsed = parseTestPayload(req.body, { requireSlug: true });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "Invalid payload" });
    return;
  }
  try {
    const created = await createTest(parsed);
    // Fire-and-forget: send the response immediately so the editor stays
    // snappy. New segments get TTS'd + uploaded to Object Storage in the
    // background. Failures are logged loudly but never block the save.
    primeListeningTestAudioInBackground(
      { id: created.slug, title: created.title, segments: created.transcript },
      { trigger: "create" },
    );
    res.json({ test: created });
  } catch (err) {
    if (isPgUniqueViolation(err)) {
      res.status(409).json({ error: "A test with this slug already exists" });
      return;
    }
    req.log.error({ err }, "Admin create listening test error");
    res.status(500).json({ error: "create_failed" });
  }
});

listeningAdminRouter.put("/admin/tests/:slug", async (req, res) => {
  if (!requireAdmin(req)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  let parsed: ParsedTestPayload;
  try {
    parsed = parseTestPayload({ ...(req.body as object), slug: req.params.slug }, { requireSlug: false });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "Invalid payload" });
    return;
  }
  try {
    // Capture the previous transcript BEFORE updating so the background
    // worker can diff old vs new and remove any audio file whose hash is
    // no longer referenced. If the load fails we still proceed with the
    // update — the periodic orphan sweep can reclaim leftovers later.
    let previousTranscript: Segment[] | undefined;
    try {
      const existing = await loadTestRowBySlug(req.params.slug);
      if (existing) previousTranscript = existing.transcript;
    } catch (err) {
      req.log.warn(
        { err, slug: req.params.slug },
        "Failed to load previous transcript for orphan cleanup; skipping cleanup",
      );
    }

    const updated = await updateTest(req.params.slug, {
      sectionId: parsed.sectionId,
      title: parsed.title,
      description: parsed.description,
      transcript: parsed.transcript,
      questions: parsed.questions,
      answerKey: parsed.answerKey,
    });
    if (!updated) {
      res.status(404).json({ error: "Test not found" });
      return;
    }
    // Run orphan-audio cleanup INLINE (before responding) so we can show
    // admins how many cached audio files were freed by their edit, the
    // same way the delete endpoint does. This is safe to run before the
    // background prime because orphan candidates are by definition NOT in
    // the new transcript, so prime never re-uploads a hash we are about
    // to delete. `cleanupReplacedSegments` never throws — storage errors
    // surface as `failed` counts and the periodic orphan sweep can
    // reclaim leftovers later.
    let audioCleanup = {
      candidates: 0,
      deleted: 0,
      failed: 0,
      errors: [] as Array<{ hash: string; message: string }>,
    };
    if (previousTranscript && previousTranscript.length > 0) {
      const result = await cleanupReplacedSegments(
        { id: updated.slug, title: updated.title, segments: updated.transcript },
        previousTranscript,
      );
      audioCleanup = {
        candidates: result.candidates,
        deleted: result.deleted,
        failed: result.failed,
        errors: result.errors,
      };
    }
    // Fire-and-forget: send the response immediately so the editor stays
    // snappy. New or edited segments get TTS'd + uploaded in the
    // background; unchanged segments are skipped via the SHA-256 hash
    // check. Failures are logged loudly but never block the save.
    primeListeningTestAudioInBackground(
      { id: updated.slug, title: updated.title, segments: updated.transcript },
      { trigger: "update" },
    );
    res.json({ test: updated, audioCleanup });
  } catch (err) {
    req.log.error({ err }, "Admin update listening test error");
    res.status(500).json({ error: "update_failed" });
  }
});

listeningAdminRouter.post("/admin/tests/reorder", async (req, res) => {
  if (!requireAdmin(req)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const body = (req.body ?? {}) as { sectionId?: unknown; slugs?: unknown };
  const sectionId = Number(body.sectionId);
  if (![1, 2, 3, 4].includes(sectionId)) {
    res.status(400).json({ error: "sectionId must be 1, 2, 3 or 4" });
    return;
  }
  if (!Array.isArray(body.slugs)) {
    res.status(400).json({ error: "slugs must be an array" });
    return;
  }
  const slugs: string[] = [];
  for (const s of body.slugs) {
    if (typeof s !== "string" || !s.trim()) {
      res.status(400).json({ error: "slugs must contain non-empty strings" });
      return;
    }
    slugs.push(s.trim());
  }
  if (new Set(slugs).size !== slugs.length) {
    res.status(400).json({ error: "slugs must be unique" });
    return;
  }
  try {
    const updated = await reorderTestsInSection(sectionId, slugs);
    res.json({ ok: true, updated });
  } catch (err) {
    if (err instanceof ReorderSlugMismatchError || err instanceof ReorderIncompleteError) {
      res.status(400).json({ error: err.message });
      return;
    }
    req.log.error({ err }, "Admin reorder listening tests error");
    res.status(500).json({ error: "reorder_failed" });
  }
});

// Move a single test from its current section into a different section in
// one atomic update. The client supplies the full new ordering of both
// sections so the server never has to guess where the moved test belongs.
listeningAdminRouter.post("/admin/tests/move", async (req, res) => {
  if (!requireAdmin(req)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const body = (req.body ?? {}) as {
    slug?: unknown;
    targetSectionId?: unknown;
    targetSlugs?: unknown;
    sourceSlugs?: unknown;
  };
  const slug = typeof body.slug === "string" ? body.slug.trim() : "";
  if (!slug) {
    res.status(400).json({ error: "slug is required" });
    return;
  }
  const targetSectionId = Number(body.targetSectionId);
  if (![1, 2, 3, 4].includes(targetSectionId)) {
    res.status(400).json({ error: "targetSectionId must be 1, 2, 3 or 4" });
    return;
  }
  if (!Array.isArray(body.targetSlugs) || !Array.isArray(body.sourceSlugs)) {
    res.status(400).json({ error: "targetSlugs and sourceSlugs must be arrays" });
    return;
  }
  const parseSlugList = (raw: unknown[], label: string): string[] | null => {
    const out: string[] = [];
    for (const s of raw) {
      if (typeof s !== "string" || !s.trim()) {
        res.status(400).json({ error: `${label} must contain non-empty strings` });
        return null;
      }
      out.push(s.trim());
    }
    return out;
  };
  const targetSlugs = parseSlugList(body.targetSlugs, "targetSlugs");
  if (targetSlugs === null) return;
  const sourceSlugs = parseSlugList(body.sourceSlugs, "sourceSlugs");
  if (sourceSlugs === null) return;

  try {
    const result = await moveTestToSection(slug, targetSectionId, targetSlugs, sourceSlugs);
    res.json({
      ok: true,
      sourceSectionId: result.sourceSectionId,
      targetSectionId,
      targetUpdated: result.targetUpdated,
      sourceUpdated: result.sourceUpdated,
      test: {
        id: result.row.id,
        slug: result.row.slug,
        sectionId: result.row.sectionId,
        title: result.row.title,
        description: result.row.description,
        questionCount: result.row.questions.length,
        segmentCount: result.row.transcript.length,
        sortOrder: result.row.sortOrder,
        createdAt: result.row.createdAt,
        updatedAt: result.row.updatedAt,
      },
    });
  } catch (err) {
    if (err instanceof MoveTestNotFoundError) {
      res.status(404).json({ error: err.message });
      return;
    }
    if (
      err instanceof MoveValidationError ||
      err instanceof ReorderSlugMismatchError ||
      err instanceof ReorderIncompleteError
    ) {
      res.status(400).json({ error: err.message });
      return;
    }
    req.log.error({ err }, "Admin move listening test error");
    res.status(500).json({ error: "move_failed" });
  }
});

listeningAdminRouter.delete("/admin/tests/:slug", async (req, res) => {
  if (!requireAdmin(req)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    // Load BEFORE delete so we know which audio hashes belonged to this
    // test and can decide which (if any) are now orphaned.
    const row = await loadTestRowBySlug(req.params.slug);
    if (!row) {
      res.status(404).json({ error: "Test not found" });
      return;
    }
    const ok = await deleteTest(req.params.slug);
    if (!ok) {
      // Race: someone else deleted the row between the load and delete.
      res.status(404).json({ error: "Test not found" });
      return;
    }

    // Compute the hashes that were unique to the deleted test (i.e. not
    // referenced by any remaining test) and drop their cached audio
    // objects. Any storage failure is logged but never fails the delete —
    // the row is already gone from the DB and the orphan sweep can
    // reclaim leftovers later.
    const audioCleanup: { deleted: number; failed: number; errors: Array<{ hash: string; message: string }> } = {
      deleted: 0,
      failed: 0,
      errors: [],
    };
    try {
      const deletedHashes = collectReferencedHashes([{ segments: row.transcript }]);
      const remaining = await loadAllTestRows();
      const stillReferenced = collectReferencedHashes(
        remaining.map((r) => ({ segments: r.transcript })),
      );
      const toDelete = Array.from(deletedHashes).filter((h) => !stillReferenced.has(h));
      const concurrency = Math.min(8, toDelete.length);
      let cursor = 0;
      const worker = async () => {
        while (true) {
          const i = cursor++;
          if (i >= toDelete.length) return;
          const hash = toDelete[i];
          const okDel = await deleteSegmentByHash(hash);
          if (okDel) audioCleanup.deleted += 1;
          else {
            audioCleanup.failed += 1;
            audioCleanup.errors.push({ hash, message: "storage delete failed" });
          }
        }
      };
      await Promise.all(Array.from({ length: Math.max(1, concurrency) }, worker));
      if (audioCleanup.deleted > 0 || audioCleanup.failed > 0) {
        req.log.info(
          { slug: row.slug, deleted: audioCleanup.deleted, failed: audioCleanup.failed },
          `[listening] orphan audio cleanup after delete: ${audioCleanup.deleted} removed, ${audioCleanup.failed} failed`,
        );
      }
    } catch (cleanupErr) {
      req.log.error(
        { err: cleanupErr, slug: row.slug },
        "Orphan audio cleanup after delete failed",
      );
    }

    res.json({ ok: true, audioCleanup });
  } catch (err) {
    req.log.error({ err }, "Admin delete listening test error");
    res.status(500).json({ error: "delete_failed" });
  }
});

listeningAdminRouter.get("/admin/audio-stats", async (req, res) => {
  if (!requireAdmin(req)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const rows = await loadAllTestRows();
    const referenced = collectReferencedHashes(
      rows.map((r) => ({ segments: r.transcript })),
    );
    const counts = await countCachedSegments(referenced);
    res.json(counts);
  } catch (err) {
    req.log.error({ err }, "Admin audio stats error");
    res.status(500).json({ error: "stats_failed" });
  }
});

listeningAdminRouter.post("/admin/cleanup-audio", async (req, res) => {
  if (!requireAdmin(req)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const remaining = await loadAllTestRows();
    const referenced = collectReferencedHashes(
      remaining.map((r) => ({ segments: r.transcript })),
    );
    const summary = await cleanupOrphanedSegments(referenced);
    req.log.info(
      {
        scanned: summary.scanned,
        referenced: summary.referenced,
        deleted: summary.deleted,
        failed: summary.failed,
        bytesFreed: summary.bytesFreed,
      },
      `[listening] cleanup-audio: scanned ${summary.scanned}, deleted ${summary.deleted}, failed ${summary.failed}, bytesFreed ${summary.bytesFreed}`,
    );
    const message = `Removed ${summary.deleted} orphaned audio file${summary.deleted === 1 ? "" : "s"} (${summary.scanned} scanned, ${summary.referenced} still in use${summary.failed ? `, ${summary.failed} failed` : ""}).`;
    res.json({ message, summary });
  } catch (err) {
    req.log.error({ err }, "Admin cleanup audio error");
    res.status(500).json({ error: "cleanup_failed" });
  }
});

// ---------------------------------------------------------------------------
// Public storage routes
// ---------------------------------------------------------------------------
export const storageRouter = Router();

storageRouter.get("/storage/public-objects/*filePath", async (req, res) => {
  try {
    const raw: unknown = (req.params as Record<string, unknown>).filePath;
    const filePath: string = Array.isArray(raw)
      ? raw.filter((x): x is string => typeof x === "string").join("/")
      : typeof raw === "string"
        ? raw
        : "";
    if (!filePath) {
      res.status(400).json({ error: "Missing path" });
      return;
    }

    // Local-first: hosts that bundle audio statically (Railway) hit this
    // path — return immediately from disk, set long-lived cache headers,
    // and never touch object storage.
    const localPath = findStaticAudio(filePath);
    if (localPath) {
      res.setHeader("Content-Type", "audio/mpeg");
      res.setHeader("Cache-Control", "public, max-age=2592000, immutable");
      res.sendFile(localPath, (err) => {
        if (err && !res.headersSent) {
          req.log.error({ err, filePath }, "Failed to send static audio");
          res.status(500).end();
        }
      });
      return;
    }

    const file = await objectStorageService.searchPublicObject(filePath);
    if (!file) {
      res.status(404).json({ error: "File not found" });
      return;
    }
    const response = await objectStorageService.downloadObject(file, 60 * 60 * 24 * 30);
    res.status(response.status);
    response.headers.forEach((value, key) => res.setHeader(key, value));
    if (response.body) {
      const nodeStream = Readable.fromWeb(response.body as ReadableStream<Uint8Array>);
      nodeStream.pipe(res);
    } else {
      res.end();
    }
  } catch (error) {
    req.log.error({ err: error }, "Error serving public object");
    res.status(500).json({ error: "Failed to serve public object" });
  }
});
