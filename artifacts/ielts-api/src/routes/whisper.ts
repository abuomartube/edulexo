import { Router } from "express";
import OpenAI, { toFile } from "openai";
import multer from "multer";
import { verifyStudentEmail } from "../lib/tier-auth";
import { recordAiUsage } from "../lib/ai-usage";

const router = Router();

// 25 MB — OpenAI's hard limit for audio uploads.
const MAX_AUDIO_BYTES = 25 * 1024 * 1024;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_AUDIO_BYTES },
});

// Estimate Whisper cost: $0.006 / minute. Typical short utterance ≈ 20–30 s → ~$0.003.
const WHISPER_COST_USD = 0.003;

function getOpenAiClient(): OpenAI {
  const apiKey = process.env["OPENAI_API_KEY"];
  if (!apiKey) throw new Error("OPENAI_API_KEY environment variable is not configured.");
  return new OpenAI({ apiKey });
}

/**
 * POST /api-ielts/whisper
 *
 * Accepts a multipart/form-data body with an `audio` field (WebM/Opus blob,
 * up to 25 MB), forwards it to OpenAI whisper-1, and returns the transcript.
 *
 * Auth: students must send x-student-email + x-student-token (HMAC) headers.
 * This works for both SSO-provisioned advance/complete students and intro
 * students, since both produce tokens with the same makeToken() formula.
 */
router.post("/whisper", upload.single("audio"), async (req, res): Promise<void> => {
  const studentEmail = verifyStudentEmail(req);
  if (!studentEmail) {
    res.status(401).json({ error: "Authentication required. Please log in and try again." });
    return;
  }

  if (!req.file) {
    res.status(400).json({ error: "Missing audio field. Send a multipart/form-data request with an 'audio' file field." });
    return;
  }

  if (req.file.size > MAX_AUDIO_BYTES) {
    res.status(413).json({ error: "Audio file exceeds the 25 MB limit." });
    return;
  }

  let openai: OpenAI;
  try {
    openai = getOpenAiClient();
  } catch {
    req.log.error("OPENAI_API_KEY not configured");
    res.status(500).json({ error: "Speech-to-text service is not configured." });
    return;
  }

  try {
    const ext = req.file.mimetype.includes("webm") ? "webm"
      : req.file.mimetype.includes("ogg") ? "ogg"
      : req.file.mimetype.includes("mp4") ? "mp4"
      : req.file.mimetype.includes("wav") ? "wav"
      : "webm";

    const audioFile = await toFile(
      req.file.buffer,
      `recording.${ext}`,
      { type: req.file.mimetype },
    );

    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: "whisper-1",
      language: "en",
    });

    res.json({ transcript: transcription.text });

    void recordAiUsage({
      email: studentEmail,
      route: "churchill",
      endpoint: "/whisper",
      costUsdOverride: WHISPER_COST_USD,
    });
  } catch (err: unknown) {
    const status = (err as { status?: number })?.status;
    if (status === 429) {
      req.log.warn({ email: studentEmail }, "Whisper: OpenAI quota exceeded");
      res.status(402).json({ error: "quota_exceeded", message: "Speech recognition quota exceeded. Please try again later." });
    } else if (status === 401) {
      req.log.error("Whisper: OpenAI API key rejected");
      res.status(500).json({ error: "invalid_key", message: "Speech-to-text service is misconfigured." });
    } else {
      req.log.error({ err, email: studentEmail }, "Whisper transcription failed");
      res.status(500).json({ error: "transcription_failed", message: "Failed to transcribe audio. Please try again." });
    }
  }
});

export default router;
