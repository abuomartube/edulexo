import app from "./app";
import { logger } from "./lib/logger";
import { runSeed } from "./seed";
import { warmUpPdf } from "./routes/vocab-pdf";
import { startReminderScheduler } from "./routes/notifications";
import { startNotificationsScheduler } from "./routes/admin-notifications";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

// Hard-fail startup if SESSION_SECRET is missing. Several legacy route files
// fall back to a hardcoded secret if the env var is unset, which would allow
// session-token forgery. Asserting at boot guarantees the process never runs
// without the real secret regardless of per-route fallbacks.
if (
  !process.env["SESSION_SECRET"] ||
  process.env["SESSION_SECRET"].length < 16
) {
  throw new Error(
    "SESSION_SECRET environment variable is required (min 16 chars) and was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

async function main() {
  await runSeed();
  await new Promise<void>((resolve, reject) => {
    app.listen(port, (err) => {
      if (err) {
        logger.error({ err }, "Error listening on port");
        reject(err);
        return;
      }
      logger.info(
        { pid: process.pid, hostname: "localhost", port },
        "Server listening",
      );
      resolve();
    });
  });
  warmUpPdf();
  startReminderScheduler();
  startNotificationsScheduler();
}

main().catch((err) => {
  logger.error({ err }, "Fatal startup error");
  process.exit(1);
});
