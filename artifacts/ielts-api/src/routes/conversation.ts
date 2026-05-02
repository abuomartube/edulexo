import { Router } from "express";
import OpenAI from "openai";
import { eq } from "drizzle-orm";
import { verifyStudentEmail, getStudentTier } from "../lib/tier-auth";
import { recordAiUsage } from "../lib/ai-usage";
import { db, introConversations, introMessages, introStudents } from "@workspace/ielts-db";

const router = Router();

type ChatMessage = { role: "user" | "assistant"; content: string };

/**
 * Confirms the authenticated email is entitled to Churchill features.
 * Returns true for intro-tier students (in introStudents) and for
 * complete-tier students (tier = "complete" in user_data).
 * Advance-tier students are explicitly denied.
 */
async function verifyChurchillAccess(email: string): Promise<boolean> {
  // Intro-tier gate: check the introStudents table first.
  const [introRow] = await db
    .select({ id: introStudents.id })
    .from(introStudents)
    .where(eq(introStudents.email, email))
    .limit(1);
  if (introRow) return true;
  // Fall back to the standard tier stored in user_data.
  const tier = await getStudentTier(email);
  return tier === "complete";
}

function getOpenAiClient(): OpenAI {
  const apiKey = process.env["OPENAI_API_KEY"];
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured.");
  return new OpenAI({ apiKey });
}

const NATURAL_PARTNER_PROMPT = (topic: string) =>
  `You are Churchill, a warm, friendly British English speaker having a real, easy conversation with an English LEARNER about "${topic}".

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

const FEEDBACK_PROMPT = (topic: string) =>
  `You are a certified IELTS Speaking examiner reviewing a casual English conversation between a learner (user) and a native speaker (assistant). The topic was: "${topic}".

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

/**
 * POST /api-ielts/conversation/chat
 *
 * Streams Churchill's reply as SSE. Auth required (intro-tier students).
 */
router.post("/conversation/chat", async (req, res): Promise<void> => {
  const studentEmail = verifyStudentEmail(req);
  if (!studentEmail) {
    res.status(401).json({ error: "Authentication required." });
    return;
  }
  if (!(await verifyChurchillAccess(studentEmail))) {
    res.status(403).json({ error: "Free Conversation is available for Intro and Comprehensive plan students only." });
    return;
  }

  const { messages, topic, isStart } = req.body as {
    messages: ChatMessage[];
    topic: string;
    isStart?: boolean;
  };

  if (!topic?.trim()) {
    res.status(400).json({ error: "Missing topic" });
    return;
  }

  let openai: OpenAI;
  try {
    openai = getOpenAiClient();
  } catch {
    req.log.error("OPENAI_API_KEY not configured");
    res.status(500).json({ error: "AI service is not configured." });
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

  try {
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

    void recordAiUsage({
      email: studentEmail,
      route: "churchill",
      endpoint: "/conversation/chat",
      costUsdOverride: 0.005,
    });
  } catch (err) {
    req.log.error({ err }, "Conversation chat error");
    if (!res.headersSent) {
      res.status(500).json({ error: "AI request failed. Please try again." });
    } else {
      try { res.write("data: [ERROR]\n\n"); res.end(); } catch { /* ignore */ }
    }
  }
});

/**
 * POST /api-ielts/conversation/feedback
 *
 * Generates IELTS-style feedback for a completed conversation.
 */
router.post("/conversation/feedback", async (req, res): Promise<void> => {
  const studentEmail = verifyStudentEmail(req);
  if (!studentEmail) {
    res.status(401).json({ error: "Authentication required." });
    return;
  }
  if (!(await verifyChurchillAccess(studentEmail))) {
    res.status(403).json({ error: "Free Conversation is available for Intro and Comprehensive plan students only." });
    return;
  }

  const { messages, topic } = req.body as {
    messages: ChatMessage[];
    topic: string;
  };

  if (!Array.isArray(messages) || messages.length === 0) {
    res.status(400).json({ error: "No conversation to analyse" });
    return;
  }

  let openai: OpenAI;
  try {
    openai = getOpenAiClient();
  } catch {
    req.log.error("OPENAI_API_KEY not configured");
    res.status(500).json({ error: "AI service is not configured." });
    return;
  }

  try {
    const transcript = messages
      .map((m) => `${m.role === "user" ? "USER" : "PARTNER"}: ${m.content}`)
      .join("\n");

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
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      const cleaned = raw.replace(/^```(?:json)?/i, "").replace(/```\s*$/i, "").trim();
      parsed = JSON.parse(cleaned);
    }

    res.json({ feedback: parsed });

    void recordAiUsage({
      email: studentEmail,
      route: "churchill",
      endpoint: "/conversation/feedback",
      costUsdOverride: 0.015,
    });
  } catch (err) {
    req.log.error({ err }, "Conversation feedback error");
    res.status(500).json({ error: "feedback_failed" });
  }
});

/**
 * POST /api-ielts/conversation/sessions
 *
 * Persists a completed conversation session (conversation + individual messages).
 * Uses introConversations (title = topic) + introMessages.
 */
router.post("/conversation/sessions", async (req, res): Promise<void> => {
  const studentEmail = verifyStudentEmail(req);
  if (!studentEmail) {
    res.status(401).json({ error: "Authentication required." });
    return;
  }
  if (!(await verifyChurchillAccess(studentEmail))) {
    res.status(403).json({ error: "Free Conversation is available for Intro and Comprehensive plan students only." });
    return;
  }

  const { topic, messages } = req.body as {
    topic: string;
    messages: ChatMessage[];
  };

  if (!topic?.trim() || !Array.isArray(messages)) {
    res.status(400).json({ error: "Missing fields" });
    return;
  }

  try {
    const [conv] = await db
      .insert(introConversations)
      .values({ title: `${studentEmail}|${topic.trim()}` })
      .returning({ id: introConversations.id, createdAt: introConversations.createdAt });

    if (!conv) {
      res.status(500).json({ error: "save_failed" });
      return;
    }

    if (messages.length > 0) {
      await db.insert(introMessages).values(
        messages.map((m) => ({
          conversationId: conv.id,
          role: m.role,
          content: m.content,
        })),
      );
    }

    res.json({ id: conv.id, createdAt: conv.createdAt });
  } catch (err) {
    req.log.error({ err }, "Save conversation session error");
    res.status(500).json({ error: "save_failed" });
  }
});

/**
 * GET /api-ielts/conversation/sessions
 *
 * Returns an empty list — session history browsing is a follow-up feature.
 * The schema (introConversations) has no student_id FK, so per-student
 * filtering is not yet available.
 */
router.get("/conversation/sessions", async (req, res): Promise<void> => {
  const studentEmail = verifyStudentEmail(req);
  if (!studentEmail) {
    res.status(401).json({ error: "Authentication required." });
    return;
  }
  if (!(await verifyChurchillAccess(studentEmail))) {
    res.status(403).json({ error: "Free Conversation is available for Intro and Comprehensive plan students only." });
    return;
  }
  res.json({ sessions: [] });
});

export default router;
