import { Router, type Request, type Response, type NextFunction } from "express";
import OpenAI, { toFile } from "openai";
import multer from "multer";
import { verifyStudentEmail, getStudentTier } from "../lib/tier-auth";
import { recordAiUsage } from "../lib/ai-usage";

const router = Router();

// 25 MB — OpenAI's hard limit for audio uploads.
const MAX_AUDIO_BYTES = 25 * 1024 * 1024;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_AUDIO_BYTES },
});

// Whisper pricing: $0.006 / minute.
// Estimate audio duration from file size assuming ~20 kbps (WebM/Opus, browser
// default). Conservative: real bitrates vary 10–40 kbps; this tends to round up.
const ASSUMED_BITRATE_KBPS = 20;
function estimateWhisperCost(bytes: number): number {
  const estimatedSeconds = bytes / ((ASSUMED_BITRATE_KBPS * 1000) / 8);
  const estimatedMinutes = estimatedSeconds / 60;
  return Math.max(0.001, parseFloat((estimatedMinutes * 0.006).toFixed(5)));
}

// Wrap multer so that LIMIT_FILE_SIZE (and any other MulterError) is always
// converted to a structured JSON response before reaching the route handler.
// Without this wrapper Express would fall through to its default error handler
// and return an HTML/plain-text response for oversized uploads.
function uploadAudio(req: Request, res: Response, next: NextFunction): void {
  upload.single("audio")(req, res, (err: unknown) => {
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        res.status(413).json({ error: "Audio file exceeds the 25 MB limit." });
        return;
      }
      res.status(400).json({ error: `Upload error: ${err.message}` });
      return;
    }
    if (err) {
      res.status(400).json({ error: "Invalid upload." });
      return;
    }
    next();
  });
}

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
 *
 * All error responses follow the strict schema { error: string }.
 */
router.post("/whisper", uploadAudio, async (req, res): Promise<void> => {
  const studentEmail = verifyStudentEmail(req);
  if (!studentEmail) {
    res.status(401).json({ error: "Authentication required. Please log in and try again." });
    return;
  }

  // Churchill voice/VAD is available for intro + complete tiers only.
  const tier = await getStudentTier(studentEmail);
  if (tier === "advance") {
    res.status(403).json({ error: "Speech recognition is not included in the Advance plan. Upgrade to the Comprehensive plan to access Churchill voice features." });
    return;
  }

  if (!req.file) {
    res.status(400).json({ error: "Missing audio field. Send a multipart/form-data request with an 'audio' file field." });
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
      costUsdOverride: estimateWhisperCost(req.file.size),
    });
  } catch (err: unknown) {
    const status = (err as { status?: number })?.status;
    if (status === 429) {
      req.log.warn({ email: studentEmail }, "Whisper: OpenAI quota exceeded");
      res.status(402).json({ error: "Speech recognition quota exceeded. Please try again later." });
    } else if (status === 401) {
      req.log.error("Whisper: OpenAI API key rejected");
      res.status(500).json({ error: "Speech-to-text service is misconfigured." });
    } else {
      req.log.error({ err, email: studentEmail }, "Whisper transcription failed");
      res.status(500).json({ error: "Failed to transcribe audio. Please try again." });
    }
  }
});

export default router;
