import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.set("etag", false);

app.use((_, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  // Required for SharedArrayBuffer (used by @ricky0123/vad-web + onnxruntime-web)
  // in cross-origin-isolated browsing contexts. Must be set on all responses
  // so the browser enforces COEP on sub-resources fetched via this API.
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
  next();
});

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
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api-ielts", router);

app.use("/app-ielts-intro", (_, res) => {
  res.redirect(301, "/lexo-ielts/dashboard?tier=intro");
});

export default app;
