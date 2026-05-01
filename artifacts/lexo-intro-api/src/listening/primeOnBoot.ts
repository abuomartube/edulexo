import { logger } from "../lib/logger";
import { primeAllTests } from "./audioCache";
import { initListeningTests, loadAllTests } from "./testStore";

/**
 * Background priming of the listening-audio cache, intended to run once on
 * server boot. Equivalent to calling `POST /api/churchill/listening/admin/prime-audio`
 * automatically after every deploy, so newly added or edited tests have their
 * TTS clips uploaded to Object Storage before any student requests them.
 *
 * Behaviour:
 *  - Disabled when `LISTENING_PRIME_AUDIO_ON_BOOT` is set to "false" / "0" /
 *    "off" / "no". Recommended defaults:
 *      * production / staging deploys → enabled (default)
 *      * local dev where Object Storage / OpenAI aren't wired up → set to
 *        "false" so the boot logs stay quiet.
 *  - Runs asynchronously and does NOT block `app.listen`. Boot latency is
 *    unaffected; priming continues in the background after the server is
 *    accepting connections.
 *  - Idempotent: `primeAllTests` skips segments whose hashed key already
 *    exists in Object Storage, so this is safe to re-run on every boot.
 *  - Race-safe with live traffic: if a student requests audio for a test
 *    before the boot prime reaches it, `audioCache.getOrCreateSegment`
 *    generates that segment on demand. The shared `inFlight` map inside
 *    `audioCache.ts` deduplicates concurrent first-time requests, so the
 *    on-demand path and the boot worker share a single TTS generation per
 *    segment — students never see a missing clip.
 *  - Logs start, summary, and per-test failure detail at `error` level so
 *    missed audio is loud in deploy logs.
 */

let started = false;

function isDisabled(): boolean {
  const raw = (process.env.LISTENING_PRIME_AUDIO_ON_BOOT ?? "true").trim().toLowerCase();
  return raw === "false" || raw === "0" || raw === "off" || raw === "no";
}

export function startListeningAudioPrimeOnBoot(): void {
  if (started) return;
  started = true;

  if (isDisabled()) {
    logger.info(
      "[listening] boot audio prime skipped (LISTENING_PRIME_AUDIO_ON_BOOT is disabled)",
    );
    return;
  }

  void (async () => {
    const startedAt = Date.now();
    try {
      await initListeningTests();
      const tests = await loadAllTests();
      if (tests.length === 0) {
        logger.info("[listening] boot audio prime: no tests found, nothing to do");
        return;
      }
      logger.info(
        { testCount: tests.length },
        "[listening] boot audio prime starting",
      );
      const summary = await primeAllTests(tests);
      const elapsedMs = Date.now() - startedAt;
      const message =
        `${summary.testsPrimed}/${summary.testsTotal} tests primed, ` +
        `${summary.segmentsUploaded} uploaded, ` +
        `${summary.segmentsSkipped} skipped` +
        (summary.segmentsFailed ? `, ${summary.segmentsFailed} failed` : "") +
        ` in ${elapsedMs}ms`;

      if (summary.segmentsFailed > 0) {
        logger.error(
          {
            elapsedMs,
            testsPrimed: summary.testsPrimed,
            testsTotal: summary.testsTotal,
            segmentsUploaded: summary.segmentsUploaded,
            segmentsSkipped: summary.segmentsSkipped,
            segmentsFailed: summary.segmentsFailed,
          },
          `[listening] boot audio prime FAILED for some segments: ${message}`,
        );
        for (const t of summary.perTest) {
          if (t.failed > 0) {
            logger.error(
              { testId: t.testId, title: t.title, failed: t.failed, errors: t.errors },
              `[listening] boot audio prime: ${t.failed} segment(s) failed for "${t.title}"`,
            );
          }
        }
      } else {
        logger.info(
          {
            elapsedMs,
            testsPrimed: summary.testsPrimed,
            testsTotal: summary.testsTotal,
            segmentsUploaded: summary.segmentsUploaded,
            segmentsSkipped: summary.segmentsSkipped,
          },
          `[listening] boot audio prime complete: ${message}`,
        );
      }
    } catch (err) {
      logger.error(
        { err, elapsedMs: Date.now() - startedAt },
        "[listening] boot audio prime crashed",
      );
    }
  })();
}
