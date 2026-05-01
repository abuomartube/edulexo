import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync, statSync } from "node:fs";
import router from "./routes";
import { logger } from "./lib/logger";
import { startListeningAudioPrimeOnBoot } from "./listening/primeOnBoot";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors({ origin: true, credentials: true }));
app.use(cookieParser());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

app.use("/api", router);

// Kick off background priming of the listening audio cache once the app is
// constructed. This is idempotent and runs on every boot so newly deployed
// or admin-edited tests get their TTS clips uploaded before students need
// them. See `listening/primeOnBoot.ts` for the env guard.
startListeningAudioPrimeOnBoot();

// ---- Static SPA serving (production / single-service deploys e.g. Railway) ----
// In a single-container deploy we serve the built React SPA from the API
// process. Two candidate locations are checked so the same code works both in
// the Docker image (where dist/public is copied next to the server bundle)
// and in a dev/local layout (where the SPA still lives under
// artifacts/churchill-ai/dist/public).
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SPA_CANDIDATES = [
  process.env["SPA_DIST"],
  path.resolve(__dirname, "public"),
  path.resolve(__dirname, "../public"),
  path.resolve(__dirname, "../../churchill-ai/dist/public"),
].filter((p): p is string => Boolean(p));

const SPA_DIR = SPA_CANDIDATES.find(
  (p) => existsSync(p) && statSync(p).isDirectory(),
);

if (SPA_DIR) {
  logger.info({ spaDir: SPA_DIR }, "Serving SPA static assets");
  app.use(
    express.static(SPA_DIR, {
      index: false,
      maxAge: "1y",
      setHeaders: (res, filePath) => {
        // index.html should never be cached (it references hashed assets).
        if (filePath.endsWith("index.html") || filePath.endsWith(".html")) {
          res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        }
      },
    }),
  );
  // SPA fallback for client-side routing — anything not /api and not a real
  // file gets index.html.
  app.get(/^\/(?!api(?:\/|$)).*/, (_req: Request, res: Response, next: NextFunction) => {
    const indexFile = path.join(SPA_DIR, "index.html");
    if (!existsSync(indexFile)) return next();
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.sendFile(indexFile);
  });
} else {
  logger.warn(
    { candidates: SPA_CANDIDATES },
    "No built SPA directory found; serving API only",
  );
}

export default app;
