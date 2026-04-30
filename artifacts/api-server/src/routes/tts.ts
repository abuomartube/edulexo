import { Router, type IRouter } from "express";
import { textToSpeech } from "@workspace/integrations-openai-ai-server/audio";
import crypto from "node:crypto";

const router: IRouter = Router();

const ALLOWED_VOICES = new Set([
  "alloy",
  "echo",
  "fable",
  "onyx",
  "nova",
  "shimmer",
] as const);
type AllowedVoice =
  | "alloy"
  | "echo"
  | "fable"
  | "onyx"
  | "nova"
  | "shimmer";

const MAX_TEXT_LEN = 500;
const MAX_CACHE_BYTES = 64 * 1024 * 1024;
const REQUEST_TIMEOUT_MS = 30_000;

const cache = new Map<string, Buffer>();
let cacheBytes = 0;

function cacheGet(key: string): Buffer | undefined {
  const v = cache.get(key);
  if (v) {
    cache.delete(key);
    cache.set(key, v);
  }
  return v;
}

function cacheSet(key: string, val: Buffer): void {
  if (val.length > MAX_CACHE_BYTES) return;
  cache.set(key, val);
  cacheBytes += val.length;
  while (cacheBytes > MAX_CACHE_BYTES) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey === undefined) break;
    const oldest = cache.get(oldestKey);
    cache.delete(oldestKey);
    if (oldest) cacheBytes -= oldest.length;
  }
}

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 30;
const ipHits = new Map<string, number[]>();

function rateLimitOk(ip: string): boolean {
  const now = Date.now();
  const cutoff = now - RATE_LIMIT_WINDOW_MS;
  const hits = (ipHits.get(ip) ?? []).filter((t) => t > cutoff);
  if (hits.length >= RATE_LIMIT_MAX) {
    ipHits.set(ip, hits);
    return false;
  }
  hits.push(now);
  ipHits.set(ip, hits);
  if (ipHits.size > 5_000) {
    for (const [k, ts] of ipHits) {
      const fresh = ts.filter((t) => t > cutoff);
      if (fresh.length === 0) ipHits.delete(k);
      else ipHits.set(k, fresh);
    }
  }
  return true;
}

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`${label} timed out`)), ms);
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      },
    );
  });
}

router.get("/tts", async (req, res) => {
  const ip = (req.ip ?? req.socket.remoteAddress ?? "unknown").toString();

  const text = String(req.query.text ?? "").trim();
  const voiceParam = String(req.query.voice ?? "fable");

  if (!text) {
    res.status(400).json({ error: "text query parameter is required" });
    return;
  }
  if (text.length > MAX_TEXT_LEN) {
    res.status(400).json({ error: `text exceeds ${MAX_TEXT_LEN} characters` });
    return;
  }
  if (!ALLOWED_VOICES.has(voiceParam as AllowedVoice)) {
    res.status(400).json({ error: "invalid voice" });
    return;
  }
  const voice = voiceParam as AllowedVoice;

  const key = `${voice}::${text}`;
  const etag = `"${crypto.createHash("sha1").update(key).digest("hex")}"`;

  if (req.headers["if-none-match"] === etag) {
    res.status(304).end();
    return;
  }

  const cached = cacheGet(key);
  if (cached) {
    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Content-Length", String(cached.length));
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    res.setHeader("ETag", etag);
    res.status(200).end(cached);
    return;
  }

  if (!rateLimitOk(ip)) {
    res.setHeader("Retry-After", "60");
    res.status(429).json({ error: "rate_limited" });
    return;
  }

  try {
    const buf = await withTimeout(
      textToSpeech(text, voice, "mp3"),
      REQUEST_TIMEOUT_MS,
      "tts",
    );
    if (!buf || buf.length === 0) {
      req.log.error({ text, voice }, "OpenAI returned empty audio buffer");
      res.status(502).json({ error: "empty audio response from provider" });
      return;
    }
    cacheSet(key, buf);

    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Content-Length", String(buf.length));
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    res.setHeader("ETag", etag);
    res.status(200).end(buf);
  } catch (err) {
    req.log.error({ err, text, voice }, "TTS generation failed");
    res.status(500).json({ error: "tts_failed" });
  }
});

export default router;
