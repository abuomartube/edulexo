import { Router } from "express";
import { openai } from "@workspace/integrations-openai-ai-server";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { getStudentToken } from "./auth";

const router = Router();

type ChatMessage = { role: "user" | "assistant"; content: string };

const NATURAL_PARTNER_PROMPT = (topic: string) => `You are Churchill, a warm, friendly British English speaker having a real, easy conversation with an English LEARNER about "${topic}".

CRITICAL — Language level (read carefully):
- The person you're talking to is at CEFR level A2 to B1 (elementary-to-intermediate). Speak so they can EASILY understand you.
- Use mostly simple, everyday words. Avoid idioms, slang, phrasal verbs, and rare vocabulary unless you immediately rephrase them in plain words.
- Keep sentences short and clear. Prefer one idea per sentence.
- Use simple grammar: present, past, future, simple modals (can, will, would, should). Avoid complex conditionals or dense academic phrasing.
- Speak warmly and patiently, like a kind British friend who genuinely wants to chat — never lecture, never sound like a textbook.

Hard rules — NEVER break these:
- This is a casual, natural chat. NEVER correct the user's grammar, vocabulary, pronunciation, or English. NEVER teach English. NEVER mention IELTS, levels, scoring, or grammar. NEVER comment on their language.
- Speak like a real person, not a chatbot. Use natural contractions ("I'd", "you're", "that's") and a small number of friendly fillers ("yeah", "oh nice", "I see").
- Keep replies SHORT: 1–2 sentences, about 15–35 words. Short enough that an A2/B1 learner can follow without losing the thread.
- React naturally to what they said (agree, react, share one quick opinion or tiny personal example), then ask ONE simple follow-up question.
- Never use markdown, bullet points, lists, headings, or stage directions. Plain spoken English only.
- Never narrate actions ("*laughs*", "(smiles)") and never refer to yourself as an AI or assistant.
- Stay on the topic the user wants to discuss; let it drift naturally.

If the user has just opened the conversation, greet them warmly in ONE short sentence and ask ONE simple, open question to get them talking about ${topic}.`;

const FEEDBACK_PROMPT = (topic: string) => `You are a certified IELTS Speaking examiner reviewing a casual English conversation between a learner (user) and a native speaker (assistant). The topic was: "${topic}".

Analyse ONLY the user's messages. Be honest, specific, and constructive. Focus exclusively on observable issues in their actual messages.

Return ONLY a valid JSON object with NO markdown fencing and NO commentary:

{
  "overallBand": 6.0,
  "summary": "2–3 sentence honest overall assessment of the user's spoken English in this conversation, referencing observed strengths and weaknesses.",
  "scores": {
    "fluencyCoherence": { "band": 6.0, "comment": "1–2 sentences citing specific evidence from the user's messages." },
    "lexicalResource": { "band": 6.0, "comment": "1–2 sentences citing specific evidence." },
    "grammaticalRange": { "band": 6.0, "comment": "1–2 sentences citing specific evidence." },
    "pronunciation": { "band": 6.0, "comment": "1–2 sentences inferred from word choice and likely speech patterns." }
  },
  "grammarMistakes": [
    { "original": "exact phrase the user wrote", "correction": "fixed version", "explanation": "1 sentence why" }
  ],
  "vocabularyUpgrades": [
    { "original": "basic word/phrase used", "better": "more advanced alternative", "example": "short example sentence using the better option", "reason": "1 short reason" }
  ],
  "sentenceUpgrades": [
    { "original": "a basic sentence the user produced", "better": "a more sophisticated rewording", "explanation": "1 sentence why this is stronger" }
  ],
  "tips": ["actionable tip 1", "actionable tip 2", "actionable tip 3"],
  "wordCount": 0,
  "userTurns": 0
}

Hard rules:
- Limit grammarMistakes to the 5 most important.
- Limit vocabularyUpgrades to the 5 most useful.
- Limit sentenceUpgrades to the 4 highest-impact.
- "original" fields MUST be exact phrases copied from the user's messages.
- Be strict but fair. Never inflate scores. Most learners with basic English are Band 4–5; Band 6+ requires genuine competence; Band 7+ requires consistent quality.
- If the user produced very few words (e.g. <30) or only 1 short turn, cap overallBand at 4.0 and explain in the summary.`;

router.post("/chat", async (req, res) => {
  try {
    const { messages, topic, isStart } = req.body as {
      messages: ChatMessage[];
      topic: string;
      isStart?: boolean;
    };
    if (!topic?.trim()) {
      res.status(400).json({ error: "Missing topic" });
      return;
    }
    const safeMessages: ChatMessage[] = Array.isArray(messages) ? messages.slice(-20) : [];
    const ctx: ChatMessage[] = safeMessages.length > 0
      ? safeMessages
      : [{ role: "user", content: isStart ? "(start the conversation now)" : "(say hi)" }];

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    const stream = await openai.chat.completions.create({
      model: "gpt-4o",
      stream: true,
      temperature: 0.85,
      max_tokens: 220,
      messages: [
        { role: "system", content: NATURAL_PARTNER_PROMPT(topic.trim()) },
        ...ctx,
      ],
    });

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content ?? "";
      if (delta) res.write(`data: ${JSON.stringify({ delta })}\n\n`);
    }
    res.write("data: [DONE]\n\n");
    res.end();
  } catch (err) {
    req.log.error({ err }, "Conversation chat error");
    if (!res.headersSent) res.status(500).json({ error: "ai_failed" });
    else { try { res.write("data: [ERROR]\n\n"); res.end(); } catch { /* ignore */ } }
  }
});

router.post("/feedback", async (req, res) => {
  try {
    const { messages, topic } = req.body as {
      messages: ChatMessage[];
      topic: string;
    };
    if (!Array.isArray(messages) || messages.length === 0) {
      res.status(400).json({ error: "No conversation to analyse" });
      return;
    }
    const transcript = messages.map((m) => `${m.role === "user" ? "USER" : "PARTNER"}: ${m.content}`).join("\n");

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      temperature: 0.2,
      max_tokens: 1600,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: FEEDBACK_PROMPT(topic || "general conversation") },
        { role: "user", content: transcript },
      ],
    });
    const raw = response.choices[0]?.message?.content ?? "{}";
    let parsed: any;
    try {
      parsed = JSON.parse(raw);
    } catch {
      const cleaned = raw.replace(/^```(?:json)?/i, "").replace(/```\s*$/i, "").trim();
      parsed = JSON.parse(cleaned);
    }
    res.json({ feedback: parsed });
  } catch (err) {
    req.log.error({ err }, "Conversation feedback error");
    res.status(500).json({ error: "feedback_failed" });
  }
});

router.post("/sessions", async (req, res) => {
  const tok = getStudentToken(req);
  if (!tok) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  try {
    const { topic, topicSource, mode, messages, feedback, durationSeconds } = req.body as {
      topic: string;
      topicSource: "preset" | "custom";
      mode: "voice" | "text";
      messages: ChatMessage[];
      feedback: any;
      durationSeconds?: number;
    };
    if (!topic?.trim() || !Array.isArray(messages)) {
      res.status(400).json({ error: "Missing fields" });
      return;
    }
    const band = typeof feedback?.overallBand === "number" ? feedback.overallBand : null;
    const inserted = await db.execute(sql`
      INSERT INTO conversation_sessions (student_id, topic, topic_source, mode, messages, feedback, band_score, duration_seconds)
      VALUES (
        ${tok.id},
        ${topic.trim()},
        ${topicSource === "custom" ? "custom" : "preset"},
        ${mode === "text" ? "text" : "voice"},
        ${JSON.stringify(messages)}::jsonb,
        ${feedback ? JSON.stringify(feedback) : null}::jsonb,
        ${band},
        ${Math.max(0, Math.floor(durationSeconds ?? 0))}
      )
      RETURNING id, created_at
    `);
    const row: any = (inserted as any).rows?.[0] ?? (Array.isArray(inserted) ? inserted[0] : null);
    res.json({ id: row?.id, createdAt: row?.created_at });
  } catch (err) {
    req.log.error({ err }, "Save conversation session error");
    res.status(500).json({ error: "save_failed" });
  }
});

router.get("/sessions", async (req, res) => {
  const tok = getStudentToken(req);
  if (!tok) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  try {
    const result = await db.execute(sql`
      SELECT id, topic, topic_source, mode, band_score, duration_seconds, created_at,
             jsonb_array_length(messages) AS message_count
      FROM conversation_sessions
      WHERE student_id = ${tok.id}
      ORDER BY created_at DESC
      LIMIT 50
    `);
    const rows: any[] = (result as any).rows ?? (Array.isArray(result) ? result : []);
    res.json({
      sessions: rows.map((r) => ({
        id: r.id,
        topic: r.topic,
        topicSource: r.topic_source,
        mode: r.mode,
        bandScore: r.band_score !== null ? Number(r.band_score) : null,
        durationSeconds: r.duration_seconds ?? 0,
        messageCount: Number(r.message_count ?? 0),
        createdAt: r.created_at,
      })),
    });
  } catch (err) {
    req.log.error({ err }, "List conversation sessions error");
    res.status(500).json({ error: "list_failed" });
  }
});

router.get("/sessions/:id", async (req, res) => {
  const tok = getStudentToken(req);
  if (!tok) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    const result = await db.execute(sql`
      SELECT * FROM conversation_sessions
      WHERE id = ${id} AND student_id = ${tok.id}
      LIMIT 1
    `);
    const row: any = (result as any).rows?.[0] ?? (Array.isArray(result) ? result[0] : null);
    if (!row) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json({
      session: {
        id: row.id,
        topic: row.topic,
        topicSource: row.topic_source,
        mode: row.mode,
        messages: row.messages ?? [],
        feedback: row.feedback ?? null,
        bandScore: row.band_score !== null ? Number(row.band_score) : null,
        durationSeconds: row.duration_seconds ?? 0,
        createdAt: row.created_at,
      },
    });
  } catch (err) {
    req.log.error({ err }, "Get conversation session error");
    res.status(500).json({ error: "fetch_failed" });
  }
});

export default router;
