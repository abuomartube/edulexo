import { useCallback, useEffect, useRef, useState } from "react";
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import {
  Loader2, Plus, Trash2, Save, ArrowLeft, ChevronDown, ChevronRight,
  Pencil, Headphones, Mic, AlertCircle, CheckCircle, Volume2, RefreshCw, X, Play, Pause, Square,
  GripVertical, Sparkles, MoreVertical, ArrowUp, ArrowDown, Move, Info,
} from "lucide-react";
import {
  applyOptimisticCrossMove as applyOptimisticCrossMoveHelper,
  applyOptimisticSameSection,
  computeMove,
  nextCoalesceState,
  scheduleUndoExpiry,
  sectionSlugList as sectionSlugListHelper,
  type CoalesceState,
  type MovePayload,
} from "@/lib/moveUndo";

const BASE_URL = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";
const TEAL = "#6B2FE6";
const GREEN = "#1DB954";
const YELLOW = "#F5C518";
const NAVY = "#1E2155";

// One-time platform check so the Undo toast can advertise the right
// keyboard shortcut. `navigator.platform` is deprecated but still the
// most reliable Mac signal; we fall back to `userAgent` for browsers
// that have already stripped it. Computed at module load — admins
// don't switch OSes mid-session.
const IS_MAC_PLATFORM = (() => {
  if (typeof navigator === "undefined") return false;
  const platform = navigator.platform || "";
  if (platform) return platform.toUpperCase().startsWith("MAC");
  return /Mac/i.test(navigator.userAgent || "");
})();
const UNDO_SHORTCUT_HINT = IS_MAC_PLATFORM ? "⌘Z" : "Ctrl+Z";

type Voice = "alloy" | "nova";
type QuestionType = "mcq" | "matching" | "note_completion" | "sentence_completion" | "short_answer";

interface Segment { voice: Voice; text: string }

interface PublicMcq { id: string; type: "mcq"; prompt: string; options: string[] }
interface PublicMatching { id: string; type: "matching"; prompt: string; items: string[]; options: string[] }
interface PublicCompletion {
  id: string;
  type: "note_completion" | "sentence_completion" | "short_answer";
  prompt: string;
  wordLimit: number;
  context?: string;
}
type PublicQuestion = PublicMcq | PublicMatching | PublicCompletion;

interface AnswerKeyMcq { type: "mcq"; answer: number }
interface AnswerKeyMatching { type: "matching"; answers: number[] }
interface AnswerKeyCompletion {
  type: "note_completion" | "sentence_completion" | "short_answer";
  answer: string;
  acceptable: string[];
}
type AnswerKeyEntry = AnswerKeyMcq | AnswerKeyMatching | AnswerKeyCompletion;

interface ListeningTestRow {
  id: number;
  slug: string;
  sectionId: number;
  title: string;
  description: string;
  transcript: Segment[];
  questions: PublicQuestion[];
  answerKey: Record<string, AnswerKeyEntry>;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

interface ListSummary {
  id: number;
  slug: string;
  sectionId: number;
  title: string;
  description: string;
  questionCount: number;
  segmentCount: number;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

interface SectionInfo {
  id: number;
  title: string;
  description: string;
}

interface PrimeTestResult {
  testId: string;
  title: string;
  segmentCount: number;
  uploaded: number;
  skipped: number;
  failed: number;
  errors: Array<{ index: number; message: string }>;
}

interface PrimeSummary {
  testsPrimed: number;
  testsTotal: number;
  segmentsUploaded: number;
  segmentsSkipped: number;
  segmentsFailed: number;
  perTest: PrimeTestResult[];
  cancelled: boolean;
  // When a run is cancelled mid-flight, this captures the test that was
  // actively being primed at the moment of cancel so the result panel can
  // name it (e.g. "Cancelled while priming Section 3 — Climate change").
  // Omitted when the cancel raced a test_done and no test was in flight.
  interruptedTest?: { title: string; testId: string };
}

type PrimeProgressEvent =
  | { kind: "start"; testsTotal: number }
  | {
      kind: "test_start";
      testIndex: number;
      testsTotal: number;
      testId: string;
      title: string;
      segmentCount: number;
    }
  | {
      kind: "segment_done";
      testIndex: number;
      testsTotal: number;
      testId: string;
      segmentIndex: number;
      segmentCount: number;
      status: "uploaded" | "skipped" | "failed";
      error?: string;
    }
  | {
      kind: "test_done";
      testIndex: number;
      testsTotal: number;
      result: PrimeTestResult;
    }
  | { kind: "summary"; message: string; summary: PrimeSummary }
  | { kind: "error"; error: string };

interface PrimeLiveTest {
  testIndex: number;
  testId: string;
  title: string;
  segmentCount: number;
  uploaded: number;
  skipped: number;
  failed: number;
  errors: Array<{ index: number; message: string }>;
  done: boolean;
}

interface PrimeLiveProgress {
  testsTotal: number;
  testsCompleted: number;
  segmentsUploaded: number;
  segmentsSkipped: number;
  segmentsFailed: number;
  currentTest: PrimeLiveTest | null;
  perTest: PrimeLiveTest[];
}

const SECTION_LABELS: Record<number, string> = {
  1: "Section 1 — Everyday conversation",
  2: "Section 2 — Short monologue",
  3: "Section 3 — Educational conversation",
  4: "Section 4 — Academic monologue",
};

function emptyTest(sectionId = 1): ListeningTestRow {
  return {
    id: 0,
    slug: "",
    sectionId,
    title: "",
    description: "",
    transcript: [{ voice: "alloy", text: "" }],
    questions: [],
    answerKey: {},
    sortOrder: 0,
    createdAt: "",
    updatedAt: "",
  };
}

function nextQuestionId(existing: PublicQuestion[]): string {
  let n = existing.length + 1;
  const used = new Set(existing.map((q) => q.id));
  while (used.has(`q${n}`)) n += 1;
  return `q${n}`;
}

function defaultAnswerKey(type: QuestionType): AnswerKeyEntry {
  if (type === "mcq") return { type: "mcq", answer: 0 };
  if (type === "matching") return { type: "matching", answers: [] };
  return { type, answer: "", acceptable: [] };
}

function formatSegmentTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const total = Math.floor(seconds);
  const mm = Math.floor(total / 60);
  const ss = total % 60;
  return `${mm}:${ss.toString().padStart(2, "0")}`;
}

function defaultPublicQuestion(id: string, type: QuestionType): PublicQuestion {
  if (type === "mcq") {
    return { id, type: "mcq", prompt: "", options: ["", ""] };
  }
  if (type === "matching") {
    return { id, type: "matching", prompt: "", items: [""], options: ["", ""] };
  }
  return { id, type, prompt: "", wordLimit: 1 };
}

interface Props {
  onLogout: () => Promise<void> | void;
}

export default function AdminListeningTests(_props: Props) {
  const [tests, setTests] = useState<ListSummary[]>([]);
  const [sections, setSections] = useState<SectionInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<ListeningTestRow | null>(null);
  const [editingExisting, setEditingExisting] = useState(false);
  // Counter that increments every time a transcript reorder reshuffles the
  // segments. The Editor watches it to stop in-flight playback whose tracked
  // index would otherwise point at the wrong row after the reorder.
  const [transcriptReorderTick, setTranscriptReorderTick] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  // Soft warning banner for "the action succeeded but something noteworthy
  // happened" cases — e.g. a test was deleted but some of its orphaned audio
  // files couldn't be removed from storage. Distinct from `error` so admins
  // know the primary action still went through.
  const [warning, setWarning] = useState<string | null>(null);
  const [openSection, setOpenSection] = useState<Record<number, boolean>>({ 1: true, 2: true, 3: true, 4: true });
  const [primingAudio, setPrimingAudio] = useState(false);
  const [primeResult, setPrimeResult] = useState<{ message: string; summary: PrimeSummary } | null>(null);
  const [primeProgress, setPrimeProgress] = useState<PrimeLiveProgress | null>(null);
  // AbortController for the in-flight prime-audio fetch. Held in a ref so the
  // Cancel button (rendered inside PrimeProgressPanel) can abort even though
  // it lives outside primeAudio's closure.
  const primeAbortRef = useRef<AbortController | null>(null);
  // Latest live snapshot — read on cancel so we can synthesise an honest
  // "cancelled after X/Y" summary without depending on a server response
  // (the abort tears the stream down).
  const primeProgressRef = useRef<PrimeLiveProgress | null>(null);
  const [primeCancelling, setPrimeCancelling] = useState(false);
  const [cleaningOrphans, setCleaningOrphans] = useState(false);
  const [cleanupResult, setCleanupResult] = useState<{
    message: string;
    summary: { scanned: number; referenced: number; deleted: number; failed: number; bytesFreed: number; errors: Array<{ hash: string; message: string }> };
  } | null>(null);
  // Live cache totals shown next to the Prime/Clean buttons. `null` while the
  // first fetch is in flight or after a transient error so we never paint
  // stale numbers — admins should see "—" rather than yesterday's count.
  const [audioStats, setAudioStats] = useState<{
    scanned: number;
    referenced: number;
    orphaned: number;
    bytes: number;
  } | null>(null);
  const [audioStatsLoading, setAudioStatsLoading] = useState(false);
  // First-visit hint shown to touch users (iPad etc.) explaining that the
  // grip handle is draggable and the menu has the same moves. We hide it
  // permanently once dismissed so it never nags returning admins. Initial
  // value is `false` (SSR-safe + matches "don't flash on desktop"); the
  // effect below promotes it to `true` when the device looks touch-only.
  const REORDER_HINT_KEY = "churchill-admin-tests-reorder-hint-dismissed";
  const [showReorderHint, setShowReorderHint] = useState(false);
  // Tracked separately from `showReorderHint` so the "reopen hint" help icon
  // stays visible on touch devices even after the admin dismisses the banner.
  // That way a colleague borrowing the iPad can bring the tip back without
  // clearing site data.
  const [isCoarsePointer, setIsCoarsePointer] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    // `pointer: coarse` is the standard "primary input is touch" media query.
    // Falling back to `maxTouchPoints` covers older WebKit that doesn't match.
    const coarse =
      window.matchMedia?.("(pointer: coarse)").matches ||
      (navigator.maxTouchPoints ?? 0) > 0;
    if (!coarse) return;
    setIsCoarsePointer(true);
    try {
      if (window.localStorage.getItem(REORDER_HINT_KEY) === "1") return;
    } catch {
      // localStorage can throw in private mode — fall through and just show it.
    }
    setShowReorderHint(true);
  }, []);
  const dismissReorderHint = useCallback(() => {
    setShowReorderHint(false);
    try {
      window.localStorage.setItem(REORDER_HINT_KEY, "1");
    } catch {
      // Best-effort: if storage fails we just won't remember the dismissal.
    }
  }, []);
  const reopenReorderHint = useCallback(() => {
    setShowReorderHint(true);
  }, []);
  // Drag-to-reorder state for the section panels. `dragOver` either points at
  // a specific row (insert before it) or at a whole section (drop at the end,
  // used when hovering an empty section or the open space below the rows).
  // Both pieces of state are mirrored into refs so the touch-drag pointer
  // handlers (which read in async event callbacks, before React re-renders)
  // can see the latest values without going through a re-render cycle.
  const [drag, setDragState] = useState<{ sectionId: number; slug: string } | null>(null);
  type DragOver =
    | { kind: "row"; sectionId: number; slug: string }
    | { kind: "section"; sectionId: number }
    | null;
  const [dragOver, setDragOverState] = useState<DragOver>(null);
  const dragRef = useRef<{ sectionId: number; slug: string } | null>(null);
  const dragOverRef = useRef<DragOver>(null);
  const setDrag = useCallback((v: { sectionId: number; slug: string } | null) => {
    dragRef.current = v;
    setDragState(v);
  }, []);
  const setDragOver = useCallback((v: DragOver) => {
    dragOverRef.current = v;
    setDragOverState(v);
  }, []);
  // If a touch/pen drag is mid-gesture and the component unmounts, this ref
  // holds the cleanup function so we can detach native pointer listeners.
  const activeGestureCleanupRef = useRef<(() => void) | null>(null);
  useEffect(() => {
    return () => {
      const cleanup = activeGestureCleanupRef.current;
      activeGestureCleanupRef.current = null;
      if (cleanup) cleanup();
    };
  }, []);
  // While a reorder/move write is in flight we mark each affected section so
  // its rows freeze and a tiny spinner appears next to them.
  const [busySections, setBusySections] = useState<Set<number>>(new Set());
  // After a successful cross-section move we offer a one-click "Undo" that
  // puts the test back where it came from. We capture the *reverse* move
  // payload at drop time so undoing is a single API call against the same
  // /admin/tests/move endpoint. The button is rendered inside the "Moved
  // to ..." toast and shares its lifetime (~10s, long enough for an admin
  // to find the link after the dropdown menu closes).
  const [undoMove, setUndoMove] = useState<MovePayload | null>(null);
  // Same idea, but for same-section reorders: we snapshot the section's
  // previous slug ordering at drop time and offer a one-click revert via
  // the existing /admin/tests/reorder endpoint. The button is rendered
  // inside the "Reordered ..." toast and shares its lifetime (~10s).
  const [undoReorder, setUndoReorder] = useState<
    { sectionId: number; slugs: string[] } | null
  >(null);
  // After Cmd/Ctrl+Z fires we remember the *forward* action so a follow-up
  // Cmd+Shift+Z (Mac) / Ctrl+Y / Ctrl+Shift+Z (Win/Linux) can re-apply it
  // through the same persistence path. We carry both the forward payload
  // (what to re-apply) and the matching undo payload (so the redo's success
  // toast can offer Undo again, just like the original action did).
  // Cleared as soon as a brand-new move/reorder happens so the shortcut
  // never replays a stale action.
  const [redoAction, setRedoAction] = useState<
    | { kind: "move"; forward: MovePayload; undo: MovePayload }
    | { kind: "reorder"; sectionId: number; forwardSlugs: string[]; undoSlugs: string[] }
    | null
  >(null);
  // Persist-time companions to `undoMove` / `undoReorder`: when we set an
  // undo payload we also stash the *forward* payload here so the eventual
  // undo handler can promote it into `redoAction` without having to recover
  // it from the (already inverted) undo state.
  const forwardMoveRef = useRef<MovePayload | null>(null);
  const forwardReorderRef = useRef<{ sectionId: number; slugs: string[] } | null>(
    null,
  );
  // Holds the active "rapid same-row nudge" run so consecutive arrow-key /
  // row-menu moves of the same row collapse into a single Undo. See
  // `nextCoalesceState` for the policy. Cleared whenever the run is broken
  // (different row, different section, drag-drop, cross-section move, an
  // Undo click, or simply >COALESCE_WINDOW_MS of inactivity).
  const coalesceRef = useRef<CoalesceState | null>(null);
  // Tracks the pending "Reordered ..." toast auto-clear timer so a coalesced
  // burst of nudges doesn't get its toast killed early by an older 10s
  // timer scheduled by the first nudge in the burst.
  const reorderClearTimerRef = useRef<number | null>(null);
  // Same idea for the "Moved to ..." toast — kept symmetric so the move
  // toast also gets a clean 10s window per move instead of being clipped
  // by an older timer.
  const moveClearTimerRef = useRef<number | null>(null);

  const fetchTests = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${BASE_URL}/api-intro/listening/admin/tests`, { credentials: "include" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to load tests");
        return;
      }
      setTests(data.tests || []);
      setSections(data.sections || []);
    } catch {
      setError("Connection error");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAudioStats = useCallback(async () => {
    setAudioStatsLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api-intro/listening/admin/audio-stats`, {
        credentials: "include",
      });
      if (!res.ok) {
        // Soft-fail: stats are an at-a-glance nicety, not critical state.
        // Keep whatever number we last had so the UI doesn't flicker to "—"
        // on transient blips.
        return;
      }
      const data = await res.json();
      if (
        typeof data?.scanned === "number" &&
        typeof data?.referenced === "number" &&
        typeof data?.orphaned === "number"
      ) {
        setAudioStats({
          scanned: data.scanned,
          referenced: data.referenced,
          orphaned: data.orphaned,
          // `bytes` was added after the original counts; tolerate older
          // server responses that don't include it by defaulting to 0
          // rather than throwing the whole stats payload away.
          bytes: typeof data.bytes === "number" ? data.bytes : 0,
        });
      }
    } catch {
      // Same as above — never let the stats fetch surface as a global error.
    } finally {
      setAudioStatsLoading(false);
    }
  }, []);

  useEffect(() => { fetchTests(); fetchAudioStats(); }, [fetchTests, fetchAudioStats]);

  const openEditor = async (slug: string) => {
    setError(null);
    setSuccess(null);
    setWarning(null);
    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api-intro/listening/admin/tests/${encodeURIComponent(slug)}`, { credentials: "include" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to load test");
        return;
      }
      setEditing(data.test as ListeningTestRow);
      setEditingExisting(true);
    } catch {
      setError("Connection error");
    } finally {
      setLoading(false);
    }
  };

  const startNewTest = () => {
    setError(null);
    setSuccess(null);
    setWarning(null);
    setEditing(emptyTest());
    setEditingExisting(false);
  };

  const cancelEdit = () => {
    setEditing(null);
    setEditingExisting(false);
    setError(null);
    setSuccess(null);
    setWarning(null);
  };

  const saveEdit = async () => {
    if (!editing) return;
    setError(null);
    setSuccess(null);
    setWarning(null);
    setSaving(true);
    try {
      const url = editingExisting
        ? `${BASE_URL}/api-intro/listening/admin/tests/${encodeURIComponent(editing.slug)}`
        : `${BASE_URL}/api-intro/listening/admin/tests`;
      const method = editingExisting ? "PUT" : "POST";
      const body = {
        slug: editing.slug,
        sectionId: editing.sectionId,
        title: editing.title,
        description: editing.description,
        transcript: editing.transcript,
        questions: editing.questions,
        answerKey: editing.answerKey,
      };
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Save failed");
        return;
      }
      // For an UPDATE the server runs an orphan-audio sweep inline (any
      // segments that dropped out of the transcript are removed from
      // Object Storage) and reports the counts in `audioCleanup`. Mirror
      // the delete-flow message so admins can see their storage actually
      // getting reclaimed and notice when it didn't.
      const cleanup = data?.audioCleanup as
        | { deleted?: number; failed?: number }
        | undefined;
      const deleted = typeof cleanup?.deleted === "number" ? cleanup.deleted : 0;
      const failed = typeof cleanup?.failed === "number" ? cleanup.failed : 0;
      const fileWord = (n: number) => (n === 1 ? "file" : "files");
      if (!editingExisting) {
        setSuccess("Test created successfully");
      } else if (failed > 0) {
        const removedPart =
          deleted > 0
            ? ` (${deleted} audio ${fileWord(deleted)} removed, ${failed} couldn't be deleted)`
            : ` (${failed} audio ${fileWord(failed)} couldn't be deleted)`;
        setWarning(`Test updated${removedPart}. Try the "Clean orphans" button to retry.`);
      } else if (deleted > 0) {
        setSuccess(`Test updated (${deleted} audio ${fileWord(deleted)} removed)`);
      } else {
        setSuccess("Test updated (no audio files needed cleanup)");
      }
      await fetchTests();
      // Saving may have added/removed segments — refresh the cache totals so
      // the header line reflects the new "still in use" count immediately.
      fetchAudioStats();
      // Stay in editor; convert to "existing" mode if we just created.
      setEditingExisting(true);
      if (data.test) {
        setEditing({
          ...editing,
          ...data.test,
          // Backend returns the new row shape — make sure we hydrate every field.
          transcript: data.test.transcript ?? editing.transcript,
          questions: data.test.questions ?? editing.questions,
          answerKey: data.test.answerKey ?? editing.answerKey,
        });
      }
    } catch {
      setError("Connection error");
    } finally {
      setSaving(false);
    }
  };

  const deleteCurrent = async () => {
    if (!editing || !editingExisting) return;
    if (!confirm(`Delete test "${editing.title}"? This cannot be undone.`)) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`${BASE_URL}/api-intro/listening/admin/tests/${encodeURIComponent(editing.slug)}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error || "Delete failed");
        return;
      }
      // The server runs an orphan-audio sweep as part of delete and reports
      // counts in `audioCleanup`. Surface those numbers so admins can see
      // their storage actually getting reclaimed (and notice when it didn't).
      const cleanup = data?.audioCleanup as
        | { deleted?: number; failed?: number }
        | undefined;
      const deleted = typeof cleanup?.deleted === "number" ? cleanup.deleted : 0;
      const failed = typeof cleanup?.failed === "number" ? cleanup.failed : 0;
      const fileWord = (n: number) => (n === 1 ? "file" : "files");
      // Tear down the editor first — `cancelEdit` clears success/warning, so
      // any banner we set must come *after* it or it'll be wiped on the same
      // render.
      cancelEdit();
      if (failed > 0) {
        const removedPart =
          deleted > 0
            ? ` (${deleted} audio ${fileWord(deleted)} removed, ${failed} couldn't be deleted)`
            : ` (${failed} audio ${fileWord(failed)} couldn't be deleted)`;
        setWarning(`Test deleted${removedPart}. Try the "Clean orphans" button to retry.`);
      } else if (deleted > 0) {
        setSuccess(`Test deleted (${deleted} audio ${fileWord(deleted)} removed)`);
      } else {
        setSuccess("Test deleted (no audio files needed cleanup)");
      }
      await fetchTests();
      // Delete also runs an orphan-audio sweep server-side; refresh the cache
      // totals so admins see the new lower numbers without an extra click.
      fetchAudioStats();
    } catch {
      setError("Connection error");
    } finally {
      setSaving(false);
    }
  };

  const cancelPrimeAudio = useCallback(() => {
    const ctl = primeAbortRef.current;
    if (!ctl || ctl.signal.aborted) return;
    setPrimeCancelling(true);
    ctl.abort();
  }, []);

  const primeAudio = async () => {
    setPrimingAudio(true);
    setPrimeCancelling(false);
    setError(null);
    setSuccess(null);
    setWarning(null);
    setPrimeResult(null);
    const initialProgress: PrimeLiveProgress = {
      testsTotal: 0,
      testsCompleted: 0,
      segmentsUploaded: 0,
      segmentsSkipped: 0,
      segmentsFailed: 0,
      currentTest: null,
      perTest: [],
    };
    primeProgressRef.current = initialProgress;
    setPrimeProgress(initialProgress);
    const controller = new AbortController();
    primeAbortRef.current = controller;
    const updateProgress = (next: PrimeLiveProgress) => {
      primeProgressRef.current = next;
      setPrimeProgress(next);
    };

    const reduce = (cur: PrimeLiveProgress, ev: PrimeProgressEvent): PrimeLiveProgress => {
      if (ev.kind === "start") {
        return { ...cur, testsTotal: ev.testsTotal };
      }
      if (ev.kind === "test_start") {
        const live: PrimeLiveTest = {
          testIndex: ev.testIndex,
          testId: ev.testId,
          title: ev.title,
          segmentCount: ev.segmentCount,
          uploaded: 0,
          skipped: 0,
          failed: 0,
          errors: [],
          done: false,
        };
        return {
          ...cur,
          testsTotal: ev.testsTotal,
          currentTest: live,
          perTest: [...cur.perTest.filter((t) => t.testId !== ev.testId), live],
        };
      }
      if (ev.kind === "segment_done") {
        const updatePerTest = cur.perTest.map((t) => {
          if (t.testId !== ev.testId) return t;
          const next = { ...t };
          if (ev.status === "uploaded") next.uploaded += 1;
          else if (ev.status === "skipped") next.skipped += 1;
          else {
            next.failed += 1;
            next.errors = [
              ...next.errors,
              { index: ev.segmentIndex, message: ev.error || "Failed" },
            ];
          }
          return next;
        });
        const updatedCurrent =
          cur.currentTest && cur.currentTest.testId === ev.testId
            ? updatePerTest.find((t) => t.testId === ev.testId) ?? cur.currentTest
            : cur.currentTest;
        return {
          ...cur,
          currentTest: updatedCurrent,
          perTest: updatePerTest,
          segmentsUploaded:
            cur.segmentsUploaded + (ev.status === "uploaded" ? 1 : 0),
          segmentsSkipped:
            cur.segmentsSkipped + (ev.status === "skipped" ? 1 : 0),
          segmentsFailed:
            cur.segmentsFailed + (ev.status === "failed" ? 1 : 0),
        };
      }
      if (ev.kind === "test_done") {
        const updatePerTest = cur.perTest.map((t) =>
          t.testId === ev.result.testId
            ? {
                ...t,
                uploaded: ev.result.uploaded,
                skipped: ev.result.skipped,
                failed: ev.result.failed,
                errors: ev.result.errors,
                done: true,
              }
            : t,
        );
        return {
          ...cur,
          testsCompleted: cur.testsCompleted + 1,
          currentTest: null,
          perTest: updatePerTest,
        };
      }
      return cur;
    };

    const applyEvent = (ev: PrimeProgressEvent) => {
      const cur = primeProgressRef.current ?? initialProgress;
      const next = reduce(cur, ev);
      updateProgress(next);
    };

    try {
      const res = await fetch(`${BASE_URL}/api-intro/listening/admin/prime-audio`, {
        method: "POST",
        credentials: "include",
        signal: controller.signal,
      });
      if (!res.ok || !res.body) {
        let message = "Prime failed";
        try {
          const data = await res.json();
          if (data && typeof data.error === "string") message = data.error;
        } catch {
          // ignore
        }
        setError(message);
        setPrimeProgress(null);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let finalResult: { message: string; summary: PrimeSummary } | null = null;
      let streamError: string | null = null;

      const processLine = (line: string) => {
        const trimmed = line.trim();
        if (!trimmed) return;
        let ev: PrimeProgressEvent;
        try {
          ev = JSON.parse(trimmed) as PrimeProgressEvent;
        } catch {
          return;
        }
        if (ev.kind === "summary") {
          finalResult = { message: ev.message, summary: ev.summary };
          return;
        }
        if (ev.kind === "error") {
          streamError = ev.error || "Prime failed";
          return;
        }
        applyEvent(ev);
      };

      while (true) {
        const { value, done } = await reader.read();
        if (value) {
          buffer += decoder.decode(value, { stream: true });
          let idx = buffer.indexOf("\n");
          while (idx !== -1) {
            processLine(buffer.slice(0, idx));
            buffer = buffer.slice(idx + 1);
            idx = buffer.indexOf("\n");
          }
        }
        if (done) break;
      }
      // Flush any tail content (server should always end with a newline,
      // but be defensive in case of truncated/proxied responses).
      buffer += decoder.decode();
      if (buffer.trim()) processLine(buffer);

      if (streamError) {
        setError(streamError);
      } else if (finalResult) {
        setPrimeResult(finalResult);
      } else {
        setError("Prime ended without a summary");
      }
    } catch (err) {
      // A user-initiated cancel surfaces here as an AbortError. Don't treat
      // it as an error — render a "cancelled after X/Y" summary instead so
      // admins can see exactly how far the run got before they stopped it.
      const aborted =
        controller.signal.aborted ||
        (err instanceof DOMException && err.name === "AbortError") ||
        (typeof err === "object" && err !== null && (err as { name?: string }).name === "AbortError");
      if (aborted) {
        const snap = primeProgressRef.current;
        // Capture the test that was actively being primed (if any) so the
        // result panel can name it. The reducer clears `currentTest` on
        // test_done, so a non-null value here means cancel landed before
        // the in-flight test finished.
        const inFlight = snap?.currentTest && !snap.currentTest.done
          ? { title: snap.currentTest.title, testId: snap.currentTest.testId }
          : undefined;
        const summary: PrimeSummary = {
          testsPrimed: snap?.testsCompleted ?? 0,
          testsTotal: snap?.testsTotal ?? 0,
          segmentsUploaded: snap?.segmentsUploaded ?? 0,
          segmentsSkipped: snap?.segmentsSkipped ?? 0,
          segmentsFailed: snap?.segmentsFailed ?? 0,
          perTest: snap?.perTest.map((t) => ({
            testId: t.testId,
            title: t.title,
            segmentCount: t.segmentCount,
            uploaded: t.uploaded,
            skipped: t.skipped,
            failed: t.failed,
            errors: t.errors,
          })) ?? [],
          cancelled: true,
          interruptedTest: inFlight,
        };
        // PrimeResultPanel always derives the headline from `cancelled` +
        // `interruptedTest`, so the `message` field is unused on this code
        // path. Pass an empty string rather than duplicating the format
        // string and risking drift.
        setPrimeResult({ message: "", summary });
      } else {
        setError("Connection error");
      }
    } finally {
      setPrimingAudio(false);
      setPrimeCancelling(false);
      setPrimeProgress(null);
      primeProgressRef.current = null;
      primeAbortRef.current = null;
      // Priming uploads new files — refresh the at-a-glance totals so the
      // header reflects the new "scanned" count.
      fetchAudioStats();
    }
  };

  const cleanOrphans = async () => {
    if (cleaningOrphans) return;
    setCleaningOrphans(true);
    setError(null);
    setSuccess(null);
    setWarning(null);
    setCleanupResult(null);
    try {
      const res = await fetch(`${BASE_URL}/api-intro/listening/admin/cleanup-audio`, {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Cleanup failed");
        return;
      }
      setCleanupResult({ message: data.message, summary: data.summary });
    } catch {
      setError("Connection error");
    } finally {
      setCleaningOrphans(false);
      // Cleanup just deleted files — refresh the at-a-glance totals so the
      // header reflects the new lower scanned/orphaned numbers.
      fetchAudioStats();
    }
  };

  // ---------------- Reorder (drag-and-drop) ----------------
  // How long a same-row nudge stays "open" for being absorbed into an
  // existing Undo run. ~1.5s is comfortably longer than a key-repeat tick
  // when an admin holds the arrow key, but short enough that an
  // intentional pause + new nudge gets its own dedicated Undo.
  const COALESCE_WINDOW_MS = 1500;

  const markSectionsBusy = (ids: number[], busy: boolean) => {
    setBusySections((prev) => {
      const next = new Set(prev);
      for (const id of ids) {
        if (busy) next.add(id);
        else next.delete(id);
      }
      return next;
    });
  };

  const persistSectionOrder = async (
    sectionId: number,
    slugsInOrder: string[],
    // The section's slug ordering *before* this reorder. When provided we
    // pin it to `undoReorder` on success so the toast can offer a one-click
    // revert via the same endpoint. Pass `null` for the undo write itself
    // (otherwise we'd chain undo-of-undo loops).
    undoSlugs: string[] | null,
  ) => {
    markSectionsBusy([sectionId], true);
    setError(null);
    // A brand-new forward reorder (i.e. one that asks us to remember an
    // undo target) invalidates any pending Cmd+Shift+Z redo from an
    // earlier undo. Undo writes themselves pass `undoSlugs === null` and
    // intentionally don't clear the redo lane (handleUndoReorder repopulates
    // it). Redo writes also pass a non-null undo, but they pre-clear
    // `redoAction` synchronously, so the duplicate clear here is harmless.
    if (undoSlugs) setRedoAction(null);
    try {
      const res = await fetch(`${BASE_URL}/api-intro/listening/admin/tests/reorder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ sectionId, slugs: slugsInOrder }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Reorder failed");
        // Roll back to server-truth on failure. Also drop any stale undo
        // payload — the reorder it referred to didn't actually happen.
        setUndoReorder(null);
        forwardReorderRef.current = null;
        // If this *was* an undo write that just failed, the redo lane
        // (set synchronously by handleUndoReorder before this async write
        // resolved) now points at a forward action that the server never
        // actually rolled back from — replaying it would diverge state.
        // Clear it so Cmd+Shift+Z can't fire a stale redo.
        if (undoSlugs === null) setRedoAction(null);
        await fetchTests();
        return;
      }
      setTests((prev) => {
        const orderIdx = new Map(slugsInOrder.map((s, i) => [s, i]));
        return prev.map((t) =>
          t.sectionId === sectionId && orderIdx.has(t.slug)
            ? { ...t, sortOrder: orderIdx.get(t.slug)! }
            : t,
        );
      });
      // Confirm the reorder with a brief inline note so admins know the
      // drop landed on the server, and offer Undo for forward reorders.
      setSuccess(
        `Reordered ${SECTION_LABELS[sectionId] || `Section ${sectionId}`}`,
      );
      // A reorder shouldn't keep a stale cross-section undo button alive.
      setUndoMove(null);
      forwardMoveRef.current = null;
      if (undoSlugs) {
        const undoData = { sectionId, slugs: undoSlugs };
        setUndoReorder(undoData);
        // Stash the *post-reorder* slugs so the eventual Cmd/Ctrl+Z
        // → Cmd+Shift+Z dance has the forward payload to re-apply.
        forwardReorderRef.current = { sectionId, slugs: slugsInOrder };
        scheduleUndoExpiry(10000, undoData, setUndoReorder);
      } else {
        setUndoReorder(null);
        forwardReorderRef.current = null;
      }
      // Cancel any pending "Reordered ..." auto-clear from a prior nudge
      // so a coalesced run gets a clean 10s window measured from the
      // *latest* nudge instead of being cut short by an older timer.
      if (reorderClearTimerRef.current !== null) {
        window.clearTimeout(reorderClearTimerRef.current);
      }
      reorderClearTimerRef.current = window.setTimeout(() => {
        reorderClearTimerRef.current = null;
        setSuccess((cur) =>
          cur && cur.startsWith("Reordered ") ? null : cur,
        );
      }, 10000);
    } catch {
      setError("Connection error");
      setUndoReorder(null);
      forwardReorderRef.current = null;
      // Same reasoning as the !res.ok branch: a failed undo write must
      // not leave a redo lane armed against a state we never reached.
      if (undoSlugs === null) setRedoAction(null);
      await fetchTests();
    } finally {
      markSectionsBusy([sectionId], false);
    }
  };

  const persistMove = async (
    slug: string,
    sourceSectionId: number,
    targetSectionId: number,
    targetSlugs: string[],
    sourceSlugs: string[],
    undoData: MovePayload | null,
  ) => {
    markSectionsBusy([sourceSectionId, targetSectionId], true);
    setError(null);
    // A brand-new forward move invalidates any pending Cmd+Shift+Z redo
    // from an earlier undo. Same reasoning as in `persistSectionOrder`.
    if (undoData) setRedoAction(null);
    try {
      const res = await fetch(`${BASE_URL}/api-intro/listening/admin/tests/move`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ slug, targetSectionId, targetSlugs, sourceSlugs }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Move failed");
        // Roll back to server-truth on failure. Also drop any stale undo
        // payload — the move it referred to didn't actually happen.
        setUndoMove(null);
        forwardMoveRef.current = null;
        // If this *was* an undo write that just failed, the redo lane
        // (set synchronously by handleUndoMove before this async write
        // resolved) now points at a forward action that the server never
        // actually rolled back from — replaying it would diverge state.
        // Clear it so Cmd+Shift+Z can't fire a stale redo.
        if (undoData === null) setRedoAction(null);
        await fetchTests();
        return;
      }
      // Confirm the move with a brief inline note so admins know the drop
      // landed on the server, not just visually.
      setSuccess(
        `Moved to ${SECTION_LABELS[targetSectionId] || `Section ${targetSectionId}`}`,
      );
      // A cross-section move shouldn't keep a stale same-section undo
      // button alive.
      setUndoReorder(null);
      forwardReorderRef.current = null;
      // Only offer Undo for cross-section moves the caller asked us to make
      // undoable. Same-section reorders go through `persistSectionOrder`
      // (which manages its own `undoReorder` payload), and undo operations
      // themselves intentionally pass `null` so we don't chain
      // undo-of-undo loops.
      if (undoData) {
        setUndoMove(undoData);
        // Stash the *forward* payload so the eventual Cmd/Ctrl+Z
        // → Cmd+Shift+Z dance has the original move to re-apply.
        forwardMoveRef.current = {
          slug,
          sourceSectionId,
          targetSectionId,
          targetSlugs,
          sourceSlugs,
        };
        scheduleUndoExpiry(10000, undoData, setUndoMove);
      } else {
        setUndoMove(null);
        forwardMoveRef.current = null;
      }
      // Same anti-clipping pattern as the reorder toast above: cancel any
      // pending "Moved to ..." auto-clear before scheduling a fresh one.
      if (moveClearTimerRef.current !== null) {
        window.clearTimeout(moveClearTimerRef.current);
      }
      moveClearTimerRef.current = window.setTimeout(() => {
        moveClearTimerRef.current = null;
        setSuccess((cur) =>
          cur && cur.startsWith("Moved to ") ? null : cur,
        );
      }, 10000);
    } catch {
      setError("Connection error");
      setUndoMove(null);
      forwardMoveRef.current = null;
      // Same reasoning as the !res.ok branch: a failed undo write must
      // not leave a redo lane armed against a state we never reached.
      if (undoData === null) setRedoAction(null);
      await fetchTests();
    } finally {
      markSectionsBusy([sourceSectionId, targetSectionId], false);
    }
  };

  // Compute the sort-stable list of slugs for a section, optionally with a
  // moved/inserted slug placed at a specific index. Used both for optimistic
  // re-render and for building the API payload.
  const sectionSlugList = (sectionId: number, currentTests: ListSummary[]): string[] =>
    sectionSlugListHelper(sectionId, currentTests);

  // Core drop logic. Takes explicit source/target so it works for HTML5 drag
  // (state-based), touch drag (ref-based), and the keyboard/menu paths
  // (which compute the move locally). All the payload math lives in the
  // pure helper `computeMove` so it can be unit-tested without React.
  const performDrop = (
    sourceSectionId: number,
    movingSlug: string,
    targetSectionId: number,
    targetSlug: string | null,
    // Set by callers whose moves are nudge-shaped (one row, one step) and
    // should be absorbed into a running Undo when repeated quickly: the
    // arrow-key handlers and the row dropdown's "Move up / Move down".
    // Drag-drop and explicit "Move to section…" leave this false so each
    // such drop produces its own dedicated Undo.
    options?: { coalesceUndo?: boolean },
  ) => {
    const coalesceUndo = options?.coalesceUndo === true;
    const decision = computeMove(
      tests,
      sourceSectionId,
      movingSlug,
      targetSectionId,
      targetSlug,
    );
    if (decision.kind === "noop") return;

    if (decision.kind === "same-section") {
      // Snapshot the section's order *before* the optimistic mutation. For
      // a fresh nudge this *is* the Undo target; for a continuation of an
      // existing run we'll discard it and reuse the run's original
      // snapshot so the final Undo reverts the entire run in one call.
      const previousSlugs = sectionSlugList(decision.sectionId, tests);
      let undoSlugs: string[];
      if (coalesceUndo) {
        const { undoSlugs: resolved, next } = nextCoalesceState(
          coalesceRef.current,
          decision.sectionId,
          movingSlug,
          previousSlugs,
          Date.now(),
          COALESCE_WINDOW_MS,
        );
        undoSlugs = resolved;
        coalesceRef.current = next;
      } else {
        // Drag-drop / explicit move: this drop stands on its own and any
        // in-progress nudge run is broken by it.
        coalesceRef.current = null;
        undoSlugs = previousSlugs;
      }
      // Optimistic local update.
      setTests((prev) =>
        applyOptimisticSameSection(prev, decision.sectionId, decision.slugs),
      );
      void persistSectionOrder(decision.sectionId, decision.slugs, undoSlugs);
      return;
    }

    // Cross-section move — always breaks any in-progress same-section run.
    coalesceRef.current = null;
    const { forward, undo } = decision;
    applyOptimisticCrossMove(
      forward.slug,
      forward.sourceSectionId,
      forward.targetSectionId,
      forward.targetSlugs,
      forward.sourceSlugs,
    );

    void persistMove(
      forward.slug,
      forward.sourceSectionId,
      forward.targetSectionId,
      forward.targetSlugs,
      forward.sourceSlugs,
      undo,
    );
  };

  // Drop the dragged test into `targetSectionId`. `targetSlug` is the row to
  // insert before; if `null` the drop appended to the end of that section.
  // Used by both HTML5 drag (mouse) and touch-drag (pointer) paths — both
  // populate `drag`/`dragRef` first.
  const handleDrop = (targetSectionId: number, targetSlug: string | null) => {
    const cur = dragRef.current;
    if (!cur) return;
    const sourceSectionId = cur.sectionId;
    const movingSlug = cur.slug;
    setDrag(null);
    setDragOver(null);
    performDrop(sourceSectionId, movingSlug, targetSectionId, targetSlug);
  };

  // ---------------- Keyboard / menu reorder helpers ----------------
  // These give touch-only and keyboard-only admins parity with mouse drag:
  // arrow-key nudges within a section, and an explicit "Move to section…"
  // dropdown for cross-section moves. All routes through the same
  // performDrop() above so the optimistic update + persistence + undo
  // payload are identical.
  const moveTestUp = (slug: string, sectionId: number) => {
    if (busySections.has(sectionId)) return;
    const slugs = sectionSlugList(sectionId, tests);
    const idx = slugs.indexOf(slug);
    if (idx <= 0) return;
    // Nudge — eligible to be absorbed into an in-progress Undo run for
    // this row so holding the arrow key produces one Undo, not N.
    performDrop(sectionId, slug, sectionId, slugs[idx - 1], { coalesceUndo: true });
  };

  const moveTestDown = (slug: string, sectionId: number) => {
    if (busySections.has(sectionId)) return;
    const slugs = sectionSlugList(sectionId, tests);
    const idx = slugs.indexOf(slug);
    if (idx === -1 || idx >= slugs.length - 1) return;
    // Insert before the row two slots down so we land *after* the next row.
    const before = idx + 2 < slugs.length ? slugs[idx + 2] : null;
    performDrop(sectionId, slug, sectionId, before, { coalesceUndo: true });
  };

  const moveTestToSection = (
    slug: string,
    sourceSectionId: number,
    targetSectionId: number,
  ) => {
    if (sourceSectionId === targetSectionId) return;
    if (busySections.has(sourceSectionId) || busySections.has(targetSectionId)) return;
    // Append to the end of the target section, mirroring how a drop on the
    // section header (without targeting a specific row) behaves today.
    performDrop(sourceSectionId, slug, targetSectionId, null);
  };

  // Optimistically reflect a cross-section move in local state so the row
  // jumps between sections instantly. Used for both the forward drop and
  // the Undo path. Wraps the pure helper.
  const applyOptimisticCrossMove = (
    movingSlug: string,
    sourceSectionId: number,
    targetSectionId: number,
    targetSlugs: string[],
    sourceSlugs: string[],
  ) => {
    setTests((prev) =>
      applyOptimisticCrossMoveHelper(prev, {
        slug: movingSlug,
        sourceSectionId,
        targetSectionId,
        targetSlugs,
        sourceSlugs,
      }),
    );
  };

  // Triggered by the Undo link in the "Moved to ..." toast. Performs the
  // reverse of the most recent cross-section move using the same endpoint.
  // No further undo is offered for the undo itself, but we promote the
  // captured forward payload into `redoAction` so the admin can re-apply
  // it via Cmd+Shift+Z / Ctrl+Y if they undid by mistake.
  const handleUndoMove = () => {
    const u = undoMove;
    if (!u) return;
    const forward = forwardMoveRef.current;
    setUndoMove(null);
    forwardMoveRef.current = null;
    setSuccess(null);
    // Clicking Undo ends any in-progress same-row nudge run; the next
    // nudge after this should start a fresh Undo, not continue the old.
    coalesceRef.current = null;
    applyOptimisticCrossMove(
      u.slug,
      u.sourceSectionId,
      u.targetSectionId,
      u.targetSlugs,
      u.sourceSlugs,
    );
    void persistMove(
      u.slug,
      u.sourceSectionId,
      u.targetSectionId,
      u.targetSlugs,
      u.sourceSlugs,
      null,
    );
    // Open the redo lane only if we still have the matching forward
    // payload (we always should — the ref is set whenever undoMove is —
    // but null-guard out of paranoia rather than crashing on an edge).
    if (forward) {
      setRedoAction({ kind: "move", forward, undo: u });
    } else {
      setRedoAction(null);
    }
  };

  // Triggered by the Undo link in the "Reordered ..." toast. Restores the
  // section's previous slug ordering via the same /admin/tests/reorder
  // endpoint. No further undo is offered for the undo itself, but we
  // promote the captured forward ordering into `redoAction` so the admin
  // can re-apply it via Cmd+Shift+Z / Ctrl+Y if they undid by mistake.
  const handleUndoReorder = () => {
    const u = undoReorder;
    if (!u) return;
    const forward = forwardReorderRef.current;
    setUndoReorder(null);
    forwardReorderRef.current = null;
    setSuccess(null);
    // Same reasoning as handleUndoMove: an explicit Undo terminates the
    // current nudge run so post-Undo nudges restart from a clean state.
    coalesceRef.current = null;
    setTests((prev) => applyOptimisticSameSection(prev, u.sectionId, u.slugs));
    void persistSectionOrder(u.sectionId, u.slugs, null);
    if (forward) {
      setRedoAction({
        kind: "reorder",
        sectionId: forward.sectionId,
        forwardSlugs: forward.slugs,
        undoSlugs: u.slugs,
      });
    } else {
      setRedoAction(null);
    }
  };

  // Triggered by Cmd+Shift+Z (Mac) / Ctrl+Y or Ctrl+Shift+Z (Win/Linux).
  // Re-applies the last undone move/reorder via the same persistence path
  // the original action used, so the resulting "Moved to ..." / "Reordered
  // ..." toast offers Undo again — exactly as if the admin had repeated
  // the gesture by hand. Single-shot: consuming the redoAction clears it.
  const handleRedo = () => {
    const r = redoAction;
    if (!r) return;
    // Refuse to fire while the undo that just armed this redo (or any
    // other write to the same sections) is still in flight. The /move
    // and /reorder endpoints validate payloads against current section
    // membership/order, so issuing the forward write before the undo
    // round-trips can race the server into rejecting the redo or, worse,
    // landing the two writes in an order that diverges client and server
    // state. The redoAction stays armed; the admin can press again once
    // the spinner clears (typically ~200ms).
    const sectionsTouched =
      r.kind === "move"
        ? [r.forward.sourceSectionId, r.forward.targetSectionId]
        : [r.sectionId];
    if (sectionsTouched.some((id) => busySections.has(id))) return;
    setRedoAction(null);
    setSuccess(null);
    // A redo is a discrete user action, so any in-progress nudge run is
    // broken by it (mirroring the cross-section / drag-drop policy).
    coalesceRef.current = null;
    if (r.kind === "move") {
      applyOptimisticCrossMove(
        r.forward.slug,
        r.forward.sourceSectionId,
        r.forward.targetSectionId,
        r.forward.targetSlugs,
        r.forward.sourceSlugs,
      );
      void persistMove(
        r.forward.slug,
        r.forward.sourceSectionId,
        r.forward.targetSectionId,
        r.forward.targetSlugs,
        r.forward.sourceSlugs,
        // Pass the matching undo so the redo's success toast (and Cmd/Ctrl+Z)
        // can revert it again — making the redo behave like a fresh move.
        r.undo,
      );
    } else {
      setTests((prev) =>
        applyOptimisticSameSection(prev, r.sectionId, r.forwardSlugs),
      );
      void persistSectionOrder(r.sectionId, r.forwardSlugs, r.undoSlugs);
    }
  };

  // Wire Cmd+Z (Mac) / Ctrl+Z (Win/Linux) to whichever Undo is currently
  // visible in the success toast, and Cmd+Shift+Z / Ctrl+Y / Ctrl+Shift+Z
  // to the most recently undone action, so admins don't have to chase the
  // small toast links before they auto-dismiss. We only intercept either
  // shortcut when there's actually something to do and the user is not
  // typing in a field — otherwise we let the browser's native field
  // undo/redo handle it.
  useEffect(() => {
    const movePending =
      undoMove !== null && success !== null && success.startsWith("Moved to ");
    const reorderPending =
      undoReorder !== null && success !== null && success.startsWith("Reordered ");
    const undoAvailable = movePending || reorderPending;
    const redoAvailable = redoAction !== null;
    if (!undoAvailable && !redoAvailable) return;

    const onKeyDown = (e: KeyboardEvent) => {
      // Holding the combo would otherwise fire every key-repeat tick
      // until the next render tears the listener down. Treat each
      // shortcut like a button click — one press, one undo/redo.
      if (e.repeat) return;
      // We only care about Cmd/Ctrl-prefixed shortcuts and never the Alt
      // variants (those belong to other apps' menus on some platforms).
      if (!(e.metaKey || e.ctrlKey) || e.altKey) return;

      // Match on both `e.code` (layout-independent — "KeyZ" no matter
      // what character that physical key produces) and `e.key`
      // (case-normalised — browsers report "Z" when Shift is held and
      // "z" otherwise). Either alone has edge cases: `e.code` can be
      // empty in some synthetic events, and `e.key` shifts under
      // non-US layouts (e.g. QWERTZ swaps Z and Y). Accepting either
      // covers all the keyboards admins actually use.
      const code = e.code;
      const key = (e.key || "").toLowerCase();
      const isZ = code === "KeyZ" || key === "z";
      const isY = code === "KeyY" || key === "y";
      // Cmd+Z / Ctrl+Z — undo.
      const isUndoCombo = isZ && !e.shiftKey;
      // Cmd+Shift+Z (Mac) and Ctrl+Shift+Z (Linux/Win) work everywhere.
      // Ctrl+Y is the additional Win/Linux-style redo, but we *exclude*
      // Cmd+Y (Mac) on purpose — Safari/Chrome bind Cmd+Y to the browser
      // History panel and admins on Mac would not expect us to hijack it.
      const isRedoCombo =
        (isZ && e.shiftKey) ||
        (isY && !e.shiftKey && e.ctrlKey && !e.metaKey);
      if (!isUndoCombo && !isRedoCombo) return;

      // Don't fight the browser's native undo/redo inside form fields.
      const target = e.target as HTMLElement | null;
      if (target) {
        const tag = target.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
        if (target.isContentEditable) return;
      }

      if (isUndoCombo && undoAvailable) {
        e.preventDefault();
        if (movePending) {
          handleUndoMove();
        } else if (reorderPending) {
          handleUndoReorder();
        }
      } else if (isRedoCombo && redoAvailable) {
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // handleUndoMove/handleUndoReorder/handleRedo are stable enough — they
    // only read the latest state via closure, which we re-bind whenever
    // those values change via this effect's dependencies. `busySections`
    // is included so handleRedo's "skip while undo is in flight" check
    // sees the latest busy state instead of the snapshot from when the
    // listener was last attached.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [undoMove, undoReorder, success, redoAction, busySections]);

  // ---------------- Touch drag (Pointer Events) ----------------
  // HTML5 drag-and-drop doesn't fire from touch on iPad/phone, so on a
  // non-mouse pointerdown we manually track the finger via Pointer Events
  // and synthesise the same drag/dragOver state the mouse path uses. That
  // way the visual highlights, the same handleDrop pipeline, and the same
  // optimistic-update + persistence + undo machinery all just work.
  const findDropTargetAt = (clientX: number, clientY: number): DragOver => {
    // elementFromPoint walks the *visible* layout — close enough for our
    // single-column list. We tag rows and section panels with data
    // attributes so we don't need to thread refs through the JSX.
    const el = document.elementFromPoint(clientX, clientY);
    if (!el) return null;
    const rowEl = (el as Element).closest("[data-drop-row-slug]") as HTMLElement | null;
    if (rowEl) {
      const slug = rowEl.getAttribute("data-drop-row-slug") || "";
      const sid = parseInt(rowEl.getAttribute("data-drop-row-section") || "", 10);
      if (slug && Number.isFinite(sid)) {
        return { kind: "row", sectionId: sid, slug };
      }
    }
    const sectionEl = (el as Element).closest("[data-drop-section]") as HTMLElement | null;
    if (sectionEl) {
      const sid = parseInt(sectionEl.getAttribute("data-drop-section") || "", 10);
      if (Number.isFinite(sid)) {
        return { kind: "section", sectionId: sid };
      }
    }
    return null;
  };

  const handleGripPointerDown = (
    e: React.PointerEvent<HTMLButtonElement>,
    sectionId: number,
    slug: string,
  ) => {
    // Mouse keeps using HTML5 drag (which fires alongside pointer events).
    // We only intercept touch and pen — those are the input modes the
    // browser doesn't translate into native drag-and-drop.
    if (e.pointerType === "mouse") return;
    if (busySections.has(sectionId)) return;
    e.preventDefault();
    const target = e.currentTarget;
    const pointerId = e.pointerId;
    const startX = e.clientX;
    const startY = e.clientY;
    let activated = false;

    try {
      target.setPointerCapture(pointerId);
    } catch {
      // setPointerCapture can throw on some browsers if the pointer is
      // already gone; safe to ignore — we'll still get the events.
    }

    const cleanup = () => {
      try {
        target.releasePointerCapture(pointerId);
      } catch {
        // ignore — capture may have already been released
      }
      target.removeEventListener("pointermove", onMove);
      target.removeEventListener("pointerup", onUp);
      target.removeEventListener("pointercancel", onCancel);
      if (activeGestureCleanupRef.current === cleanup) {
        activeGestureCleanupRef.current = null;
      }
    };

    const onMove = (ev: PointerEvent) => {
      if (ev.pointerId !== pointerId) return;
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      if (!activated) {
        // 6px threshold so an accidental tap-and-jiggle doesn't trigger a
        // drag. Same heuristic most native pickers use.
        if (Math.hypot(dx, dy) < 6) return;
        activated = true;
        setDrag({ sectionId, slug });
      }
      const next = findDropTargetAt(ev.clientX, ev.clientY);
      // Avoid no-op state updates on every pixel of movement.
      const cur = dragOverRef.current;
      const same =
        (cur === null && next === null) ||
        (cur !== null &&
          next !== null &&
          cur.kind === next.kind &&
          cur.sectionId === next.sectionId &&
          (cur.kind === "section" || cur.slug === (next as { slug?: string }).slug));
      if (!same) setDragOver(next);
    };

    const onUp = (ev: PointerEvent) => {
      if (ev.pointerId !== pointerId) return;
      cleanup();
      if (!activated) {
        // Tap without movement — leave state alone so the row's onClick (if
        // any) and the keyboard menu can still fire normally.
        return;
      }
      const target = dragOverRef.current;
      if (!target) {
        setDrag(null);
        setDragOver(null);
        return;
      }
      if (target.kind === "row") {
        handleDrop(target.sectionId, target.slug);
      } else {
        handleDrop(target.sectionId, null);
      }
    };

    const onCancel = (ev: PointerEvent) => {
      if (ev.pointerId !== pointerId) return;
      cleanup();
      setDrag(null);
      setDragOver(null);
    };

    target.addEventListener("pointermove", onMove);
    target.addEventListener("pointerup", onUp);
    target.addEventListener("pointercancel", onCancel);
    // If a previous gesture somehow leaked, clean it up before tracking ours.
    if (activeGestureCleanupRef.current && activeGestureCleanupRef.current !== cleanup) {
      activeGestureCleanupRef.current();
    }
    activeGestureCleanupRef.current = cleanup;
  };

  // ---------------- Editor sub-helpers ----------------
  const updateField = <K extends keyof ListeningTestRow>(key: K, value: ListeningTestRow[K]) => {
    if (!editing) return;
    setEditing({ ...editing, [key]: value });
  };

  const updateSegment = (idx: number, patch: Partial<Segment>) => {
    if (!editing) return;
    const next = editing.transcript.slice();
    next[idx] = { ...next[idx], ...patch };
    setEditing({ ...editing, transcript: next });
  };

  const addSegment = () => {
    if (!editing) return;
    const lastVoice = editing.transcript[editing.transcript.length - 1]?.voice || "alloy";
    const newVoice: Voice = lastVoice === "alloy" ? "nova" : "alloy";
    setEditing({ ...editing, transcript: [...editing.transcript, { voice: newVoice, text: "" }] });
  };

  const removeSegment = (idx: number) => {
    if (!editing) return;
    setEditing({ ...editing, transcript: editing.transcript.filter((_, i) => i !== idx) });
  };

  const addQuestion = (type: QuestionType) => {
    if (!editing) return;
    const id = nextQuestionId(editing.questions);
    const pq = defaultPublicQuestion(id, type);
    const ak = defaultAnswerKey(type);
    setEditing({
      ...editing,
      questions: [...editing.questions, pq],
      answerKey: { ...editing.answerKey, [id]: ak },
    });
  };

  const removeQuestion = (id: string) => {
    if (!editing) return;
    const ak = { ...editing.answerKey };
    delete ak[id];
    setEditing({
      ...editing,
      questions: editing.questions.filter((q) => q.id !== id),
      answerKey: ak,
    });
  };

  const updateQuestion = (id: string, patch: Partial<PublicQuestion>) => {
    if (!editing) return;
    setEditing({
      ...editing,
      questions: editing.questions.map((q) => (q.id === id ? ({ ...q, ...patch } as PublicQuestion) : q)),
    });
  };

  const updateAnswerKey = (id: string, patch: Partial<AnswerKeyEntry>) => {
    if (!editing) return;
    const cur = editing.answerKey[id];
    if (!cur) return;
    setEditing({
      ...editing,
      answerKey: { ...editing.answerKey, [id]: { ...cur, ...patch } as AnswerKeyEntry },
    });
  };

  // Reorder helpers for the editor sub-lists. Both take a `from` index and a
  // `dropBeforeIdx` in the *original* array (or `array.length` to append). The
  // helper splices the moved item out first, then re-inserts at the adjusted
  // position. Question IDs are preserved because we only shuffle existing
  // entries — the answer key, keyed by id, stays correct.
  const reorderSegment = (from: number, dropBeforeIdx: number) => {
    if (!editing) return;
    const arr = editing.transcript;
    if (from < 0 || from >= arr.length) return;
    let insertAt = dropBeforeIdx;
    if (from < dropBeforeIdx) insertAt -= 1;
    insertAt = Math.max(0, Math.min(arr.length - 1, insertAt));
    if (insertAt === from) return;
    const next = arr.slice();
    const [moved] = next.splice(from, 1);
    next.splice(insertAt, 0, moved);
    setEditing({ ...editing, transcript: next });
    // Bump the tick so the Editor knows to stop any in-flight playback —
    // the row indices it tracks no longer point at the same segments.
    setTranscriptReorderTick((n) => n + 1);
  };

  const reorderQuestion = (from: number, dropBeforeIdx: number) => {
    if (!editing) return;
    const arr = editing.questions;
    if (from < 0 || from >= arr.length) return;
    let insertAt = dropBeforeIdx;
    if (from < dropBeforeIdx) insertAt -= 1;
    insertAt = Math.max(0, Math.min(arr.length - 1, insertAt));
    if (insertAt === from) return;
    const next = arr.slice();
    const [moved] = next.splice(from, 1);
    next.splice(insertAt, 0, moved);
    setEditing({ ...editing, questions: next });
  };

  const renameQuestion = (oldId: string, newId: string) => {
    if (!editing) return;
    if (oldId === newId || !newId.trim()) return;
    if (editing.questions.some((q) => q.id === newId)) {
      setError(`Question id "${newId}" already exists`);
      return;
    }
    const ak = { ...editing.answerKey };
    const entry = ak[oldId];
    delete ak[oldId];
    if (entry) ak[newId] = entry;
    setEditing({
      ...editing,
      questions: editing.questions.map((q) => (q.id === oldId ? { ...q, id: newId } : q)),
      answerKey: ak,
    });
  };

  // ---------------- Render ----------------
  if (editing) {
    return (
      <Editor
        editing={editing}
        editingExisting={editingExisting}
        saving={saving}
        error={error}
        success={success}
        onCancel={cancelEdit}
        onSave={saveEdit}
        onDelete={deleteCurrent}
        onUpdateField={updateField}
        onUpdateSegment={updateSegment}
        onAddSegment={addSegment}
        onRemoveSegment={removeSegment}
        onAddQuestion={addQuestion}
        onRemoveQuestion={removeQuestion}
        onUpdateQuestion={updateQuestion}
        onUpdateAnswerKey={updateAnswerKey}
        onRenameQuestion={renameQuestion}
        onReorderSegment={reorderSegment}
        onReorderQuestion={reorderQuestion}
        transcriptReorderTick={transcriptReorderTick}
      />
    );
  }

  const grouped = new Map<number, ListSummary[]>();
  for (const t of tests) {
    if (!grouped.has(t.sectionId)) grouped.set(t.sectionId, []);
    grouped.get(t.sectionId)!.push(t);
  }
  // Keep items inside each section sorted by sortOrder so optimistic updates
  // after a drag-and-drop reorder render in the new order without a refetch.
  for (const items of grouped.values()) {
    items.sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id);
  }
  const sectionIds = sections.length ? sections.map((s) => s.id) : [1, 2, 3, 4];

  return (
    <div className="space-y-4">
      {error && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-2xl text-sm" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)" }}>
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <span className="text-red-300">{error}</span>
        </div>
      )}
      {success && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-2xl text-sm" style={{ background: "rgba(29,185,84,0.1)", border: "1px solid rgba(29,185,84,0.3)" }}>
          <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" style={{ color: GREEN }} />
          <span className="flex-1" style={{ color: GREEN }}>{success}</span>
          {undoMove && success.startsWith("Moved to ") && (
            <button
              type="button"
              onClick={handleUndoMove}
              className="text-xs font-bold shrink-0 hover:opacity-80"
              style={{ color: GREEN }}
              aria-label={`Undo (${UNDO_SHORTCUT_HINT})`}
            >
              <span className="underline">Undo</span>
              <span className="ml-1 font-normal opacity-60">({UNDO_SHORTCUT_HINT})</span>
            </button>
          )}
          {undoReorder && success.startsWith("Reordered ") && (
            <button
              type="button"
              onClick={handleUndoReorder}
              className="text-xs font-bold shrink-0 hover:opacity-80"
              style={{ color: GREEN }}
              aria-label={`Undo (${UNDO_SHORTCUT_HINT})`}
            >
              <span className="underline">Undo</span>
              <span className="ml-1 font-normal opacity-60">({UNDO_SHORTCUT_HINT})</span>
            </button>
          )}
        </div>
      )}
      {warning && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-2xl text-sm" style={{ background: "rgba(245,197,24,0.1)", border: "1px solid rgba(245,197,24,0.3)" }}>
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" style={{ color: YELLOW }} />
          <span style={{ color: YELLOW }}>{warning}</span>
        </div>
      )}

      {primeProgress && (
        <PrimeProgressPanel
          progress={primeProgress}
          onCancel={cancelPrimeAudio}
          cancelling={primeCancelling}
        />
      )}

      {primeResult && (
        <PrimeResultPanel
          result={primeResult}
          onDismiss={() => setPrimeResult(null)}
        />
      )}

      {cleanupResult && (
        <CleanupResultPanel
          result={cleanupResult}
          onDismiss={() => setCleanupResult(null)}
        />
      )}

      <div className="flex items-center gap-2">
        <button
          onClick={startNewTest}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-sm transition-all hover:scale-[1.01]"
          style={{ background: `linear-gradient(135deg, ${TEAL}, #8B5FF6)`, color: NAVY }}
        >
          <Plus className="w-4 h-4" /> New listening test
        </button>
        <button
          onClick={primeAudio}
          disabled={primingAudio}
          className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold transition-all disabled:opacity-60"
          style={{ background: "rgba(245,197,24,0.15)", color: YELLOW, border: "1px solid rgba(245,197,24,0.3)" }}
          title="Generate any missing audio segments"
        >
          {primingAudio ? <Loader2 className="w-4 h-4 animate-spin" /> : <Volume2 className="w-4 h-4" />}
          Prime audio
        </button>
        <button
          onClick={cleanOrphans}
          disabled={cleaningOrphans}
          className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold transition-all disabled:opacity-60"
          style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.75)", border: "1px solid rgba(255,255,255,0.15)" }}
          title="Delete cached audio files no test references anymore"
          data-testid="clean-orphans-button"
        >
          {cleaningOrphans ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          Clean orphans
        </button>
        {isCoarsePointer && !showReorderHint && (
          <button
            onClick={reopenReorderHint}
            className="p-2.5 rounded-xl text-white/40 hover:bg-white/10 transition-colors"
            title="Show reorder tip"
            aria-label="Show reorder tip"
            data-testid="reorder-touch-hint-reopen"
          >
            <Info className="w-4 h-4" />
          </button>
        )}
        <button
          onClick={fetchTests}
          disabled={loading}
          className="p-2.5 rounded-xl text-white/40 hover:bg-white/10 transition-colors"
          title="Refresh"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      <AudioStatsLine stats={audioStats} loading={audioStatsLoading} />

      {showReorderHint && (
        <div
          className="flex items-start gap-2 px-3 py-2 rounded-xl text-xs"
          style={{
            background: "rgba(107,47,230,0.10)",
            border: "1px solid rgba(107,47,230,0.35)",
            color: "rgba(255,255,255,0.85)",
          }}
          role="note"
          data-testid="reorder-touch-hint"
        >
          <Info
            className="w-4 h-4 mt-0.5 shrink-0"
            style={{ color: TEAL }}
            aria-hidden="true"
          />
          <div className="flex-1 leading-snug">
            <strong className="font-bold">Tip:</strong> long-press the{" "}
            <GripVertical
              className="inline w-3.5 h-3.5 align-text-bottom"
              aria-hidden="true"
            />{" "}
            handle on a test to drag it, or tap the{" "}
            <MoreVertical
              className="inline w-3.5 h-3.5 align-text-bottom"
              aria-hidden="true"
            />{" "}
            menu to move it within or between sections.
          </div>
          <button
            type="button"
            onClick={dismissReorderHint}
            className="shrink-0 p-1 rounded hover:bg-white/10 text-white/60 hover:text-white transition-colors"
            aria-label="Dismiss reorder hint"
            data-testid="reorder-touch-hint-dismiss"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {loading && tests.length === 0 ? (
        <div className="flex justify-center py-10">
          <Loader2 className="w-6 h-6 animate-spin" style={{ color: TEAL }} />
        </div>
      ) : (
        <div className="space-y-3">
          {sectionIds.map((sid) => {
            const items = grouped.get(sid) || [];
            const open = openSection[sid] !== false;
            const sectionBusy = busySections.has(sid);
            // A drop here is "valid" only when there's an active drag and it
            // would actually do something (different section OR a different
            // position in the same section).
            const dragActive = drag !== null;
            const sectionIsDropTarget =
              dragActive && dragOver?.kind === "section" && dragOver.sectionId === sid;
            // Highlight the whole section when dragging a row from elsewhere
            // — makes empty sections obviously droppable.
            const sectionHover = dragActive && drag.sectionId !== sid && sectionIsDropTarget;
            return (
              <div
                key={sid}
                className="rounded-2xl overflow-hidden"
                style={{
                  border: sectionHover
                    ? `1px solid ${TEAL}`
                    : "1px solid rgba(255,255,255,0.1)",
                  background: sectionHover ? "rgba(107,47,230,0.06)" : undefined,
                  transition: "background 120ms, border-color 120ms",
                }}
                data-testid={`section-panel-${sid}`}
                data-drop-section={sid}
              >
                <button
                  onClick={() => setOpenSection({ ...openSection, [sid]: !open })}
                  className="w-full flex items-center justify-between px-4 py-3"
                  style={{ background: "rgba(255,255,255,0.04)" }}
                  onDragEnter={() => {
                    if (dragActive) setDragOver({ kind: "section", sectionId: sid });
                  }}
                  onDragOver={(e) => {
                    if (dragActive) {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = "move";
                      if (
                        dragOver?.kind !== "section" ||
                        dragOver.sectionId !== sid
                      ) {
                        setDragOver({ kind: "section", sectionId: sid });
                      }
                    }
                  }}
                  onDrop={(e) => {
                    if (!dragActive) return;
                    e.preventDefault();
                    e.stopPropagation();
                    handleDrop(sid, null);
                  }}
                >
                  <div className="flex items-center gap-2">
                    {open ? <ChevronDown className="w-4 h-4 text-white/60" /> : <ChevronRight className="w-4 h-4 text-white/60" />}
                    <Headphones className="w-4 h-4" style={{ color: TEAL }} />
                    <span className="text-sm font-bold text-white">{SECTION_LABELS[sid] || `Section ${sid}`}</span>
                  </div>
                  <span className="text-xs text-white/40 flex items-center gap-2">
                    {sectionBusy && <Loader2 className="w-3 h-3 animate-spin text-white/40" />}
                    {items.length} test{items.length === 1 ? "" : "s"}
                  </span>
                </button>
                {open && (
                  <div
                    className="divide-y"
                    style={{ borderColor: "rgba(255,255,255,0.06)" }}
                    onDragOver={(e) => {
                      if (dragActive) {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = "move";
                      }
                    }}
                    onDrop={(e) => {
                      if (!dragActive) return;
                      // Only the section-level drop should run when the drop
                      // didn't bubble up from a specific row (rows call
                      // stopPropagation via their own handler).
                      e.preventDefault();
                      handleDrop(sid, null);
                    }}
                  >
                    {items.length === 0 ? (
                      <div
                        className="p-4 text-center text-xs"
                        style={{
                          color: sectionHover
                            ? TEAL
                            : "rgba(255,255,255,0.3)",
                          background: sectionHover
                            ? "rgba(107,47,230,0.08)"
                            : undefined,
                        }}
                        onDragEnter={() => {
                          if (dragActive) {
                            setDragOver({ kind: "section", sectionId: sid });
                          }
                        }}
                        onDragOver={(e) => {
                          if (dragActive) {
                            e.preventDefault();
                            e.dataTransfer.dropEffect = "move";
                            if (
                              dragOver?.kind !== "section" ||
                              dragOver.sectionId !== sid
                            ) {
                              setDragOver({ kind: "section", sectionId: sid });
                            }
                          }
                        }}
                        onDrop={(e) => {
                          if (!dragActive) return;
                          e.preventDefault();
                          e.stopPropagation();
                          handleDrop(sid, null);
                        }}
                        data-testid={`section-empty-drop-${sid}`}
                      >
                        {sectionHover
                          ? "Drop here to move into this section"
                          : "No tests in this section yet."}
                      </div>
                    ) : items.map((t, rowIdx) => {
                      const isDragging = drag?.slug === t.slug && drag.sectionId === sid;
                      const isRowDropTarget =
                        dragActive &&
                        dragOver?.kind === "row" &&
                        dragOver.slug === t.slug &&
                        dragOver.sectionId === sid &&
                        // Don't draw the line above the very row being dragged.
                        !(drag.sectionId === sid && drag.slug === t.slug);
                      // Block fresh drags while a reorder/move is being
                      // persisted that touches this section, to avoid races.
                      const dragDisabled = sectionBusy;
                      const canMoveUp = rowIdx > 0 && !sectionBusy;
                      const canMoveDown = rowIdx < items.length - 1 && !sectionBusy;
                      return (
                        <div
                          key={t.slug}
                          draggable={!dragDisabled}
                          onDragStart={(e) => {
                            if (dragDisabled) {
                              e.preventDefault();
                              return;
                            }
                            setDrag({ sectionId: sid, slug: t.slug });
                            // dataTransfer is required in some browsers for the drag to fire.
                            e.dataTransfer.effectAllowed = "move";
                            try { e.dataTransfer.setData("text/plain", t.slug); } catch { /* Safari */ }
                          }}
                          onDragEnter={() => {
                            if (dragActive && !(drag.sectionId === sid && drag.slug === t.slug)) {
                              setDragOver({ kind: "row", sectionId: sid, slug: t.slug });
                            }
                          }}
                          onDragOver={(e) => {
                            if (dragActive) {
                              e.preventDefault();
                              e.dataTransfer.dropEffect = "move";
                            }
                          }}
                          onDrop={(e) => {
                            if (!dragActive) return;
                            e.preventDefault();
                            // Stop the section-level handler from firing too —
                            // we want the row-specific drop position.
                            e.stopPropagation();
                            handleDrop(sid, t.slug);
                          }}
                          onDragEnd={() => {
                            setDrag(null);
                            setDragOver(null);
                          }}
                          className="px-4 py-3 flex items-center gap-3 transition-all"
                          style={{
                            background: isRowDropTarget
                              ? "rgba(107,47,230,0.12)"
                              : "rgba(255,255,255,0.02)",
                            opacity: isDragging ? 0.45 : 1,
                            borderTop: isRowDropTarget ? `2px solid ${TEAL}` : undefined,
                            cursor: "default",
                          }}
                          aria-grabbed={isDragging}
                          data-testid={`test-row-${t.slug}`}
                          data-drop-row-slug={t.slug}
                          data-drop-row-section={sid}
                        >
                          {/* Grip is a real button so it's keyboard-focusable
                              (Tab) and screen-reader-friendly. Touch users
                              get pointer-event drag via onPointerDown; mouse
                              users get the existing HTML5 drag from the row
                              container. Arrow keys move the row up/down
                              within its section without leaving the keyboard. */}
                          <button
                            type="button"
                            disabled={dragDisabled}
                            onPointerDown={(e) =>
                              handleGripPointerDown(e, sid, t.slug)
                            }
                            onKeyDown={(e) => {
                              if (dragDisabled) return;
                              if (e.key === "ArrowUp") {
                                e.preventDefault();
                                if (canMoveUp) moveTestUp(t.slug, sid);
                              } else if (e.key === "ArrowDown") {
                                e.preventDefault();
                                if (canMoveDown) moveTestDown(t.slug, sid);
                              }
                            }}
                            className="shrink-0 text-white/30 hover:text-white/70 focus:text-white/80 transition-colors rounded outline-none focus-visible:ring-2"
                            style={{
                              cursor: dragDisabled ? "wait" : "grab",
                              touchAction: "none",
                              opacity: dragDisabled ? 0.4 : 1,
                              // Use the teal accent for the focus ring so
                              // keyboard users see exactly what's selected.
                              boxShadow: undefined,
                            }}
                            title={
                              dragDisabled
                                ? "Saving order…"
                                : "Drag, or press Arrow Up/Down to reorder. Use the menu to move to another section."
                            }
                            aria-label={`Reorder ${t.title}. Press Arrow Up or Arrow Down to move within ${SECTION_LABELS[sid] || `Section ${sid}`}.`}
                            data-testid={`test-row-grip-${t.slug}`}
                          >
                            <GripVertical className="w-4 h-4" />
                          </button>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-bold text-white truncate">{t.title}</span>
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full font-mono" style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.6)" }}>{t.slug}</span>
                            </div>
                            <p className="text-xs text-white/50 mt-0.5 truncate">{t.description}</p>
                            <p className="text-[11px] text-white/35 mt-0.5">{t.questionCount} questions · {t.segmentCount} segments</p>
                          </div>
                          <RowReorderMenu
                            slug={t.slug}
                            title={t.title}
                            sectionId={sid}
                            sectionIds={sectionIds}
                            canMoveUp={canMoveUp}
                            canMoveDown={canMoveDown}
                            disabled={dragDisabled}
                            onMoveUp={() => moveTestUp(t.slug, sid)}
                            onMoveDown={() => moveTestDown(t.slug, sid)}
                            onMoveToSection={(target) =>
                              moveTestToSection(t.slug, sid, target)
                            }
                          />
                          <button
                            onClick={() => openEditor(t.slug)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                            style={{ background: "rgba(107,47,230,0.15)", color: TEAL, border: "1px solid rgba(107,47,230,0.3)" }}
                          >
                            <Pencil className="w-3.5 h-3.5" /> Edit
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Row reorder menu — keyboard- and touch-friendly alternative to dragging
// ---------------------------------------------------------------------------
// Renders a small "More" button next to each test row. Opens a dropdown with
// "Move up", "Move down", and a "Move to <Section>" entry per other section.
// All actions delegate to the same reorder/move plumbing the drag path uses,
// so an admin on a phone or with no mouse can do everything a desktop admin
// can.
function RowReorderMenu({
  slug,
  title,
  sectionId,
  sectionIds,
  canMoveUp,
  canMoveDown,
  disabled,
  onMoveUp,
  onMoveDown,
  onMoveToSection,
}: {
  slug: string;
  title: string;
  sectionId: number;
  sectionIds: number[];
  canMoveUp: boolean;
  canMoveDown: boolean;
  disabled: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onMoveToSection: (target: number) => void;
}) {
  // Other sections only — no point in offering "Move to current section".
  const otherSections = sectionIds.filter((s) => s !== sectionId);
  // Inline dark-themed menu items; the project's shadcn DropdownMenuContent
  // uses theme tokens (bg-popover etc.) that aren't defined for this dark
  // navy admin surface, so we style the Radix primitives directly.
  const menuItemBase =
    "flex items-center gap-2 w-full px-3 py-2 text-xs text-left rounded-md outline-none transition-colors focus:bg-white/10 hover:bg-white/10 data-[disabled]:opacity-40 data-[disabled]:pointer-events-none";
  return (
    <DropdownMenuPrimitive.Root>
      <DropdownMenuPrimitive.Trigger
        type="button"
        disabled={disabled}
        title={
          disabled
            ? "Saving order…"
            : "Reorder or move to another section"
        }
        aria-label={`Reorder options for ${title}`}
        data-testid={`test-row-menu-${slug}`}
        className="shrink-0 p-1.5 rounded-md text-white/40 hover:text-white/80 hover:bg-white/10 focus:bg-white/10 outline-none focus-visible:ring-2 transition-colors disabled:opacity-40 disabled:cursor-wait"
        onClick={(e) => {
          // The row container above is `draggable`, and on some browsers a
          // mousedown inside a draggable element starts a drag even if it
          // came from a child <button>. Stopping propagation keeps the
          // menu trigger feeling like a normal click target.
          e.stopPropagation();
        }}
      >
        <MoreVertical className="w-4 h-4" />
      </DropdownMenuPrimitive.Trigger>
      <DropdownMenuPrimitive.Portal>
        <DropdownMenuPrimitive.Content
          align="end"
          sideOffset={6}
          className="z-50 min-w-[14rem] p-1 rounded-xl shadow-2xl"
          style={{
            background: "rgba(10,26,48,0.98)",
            border: "1px solid rgba(255,255,255,0.12)",
            color: "white",
          }}
          onCloseAutoFocus={(e) => {
            // Keep focus where the user was — they may want to keep nudging
            // with arrow keys on the grip handle after a menu action.
            e.preventDefault();
          }}
        >
          <DropdownMenuPrimitive.Item
            disabled={!canMoveUp}
            onSelect={() => onMoveUp()}
            className={menuItemBase}
            data-testid={`test-row-menu-up-${slug}`}
          >
            <ArrowUp className="w-3.5 h-3.5" /> Move up
          </DropdownMenuPrimitive.Item>
          <DropdownMenuPrimitive.Item
            disabled={!canMoveDown}
            onSelect={() => onMoveDown()}
            className={menuItemBase}
            data-testid={`test-row-menu-down-${slug}`}
          >
            <ArrowDown className="w-3.5 h-3.5" /> Move down
          </DropdownMenuPrimitive.Item>
          {otherSections.length > 0 && (
            <>
              <DropdownMenuPrimitive.Separator
                className="my-1 h-px"
                style={{ background: "rgba(255,255,255,0.08)" }}
              />
              <DropdownMenuPrimitive.Label
                className="px-3 py-1.5 text-[10px] uppercase tracking-wider"
                style={{ color: "rgba(255,255,255,0.4)" }}
              >
                Move to section
              </DropdownMenuPrimitive.Label>
              {otherSections.map((s) => (
                <DropdownMenuPrimitive.Item
                  key={s}
                  onSelect={() => onMoveToSection(s)}
                  className={menuItemBase}
                  data-testid={`test-row-menu-section-${s}-${slug}`}
                >
                  <Move className="w-3.5 h-3.5" />
                  {SECTION_LABELS[s] || `Section ${s}`}
                </DropdownMenuPrimitive.Item>
              ))}
            </>
          )}
        </DropdownMenuPrimitive.Content>
      </DropdownMenuPrimitive.Portal>
    </DropdownMenuPrimitive.Root>
  );
}

// ---------------------------------------------------------------------------
// Editor component
// ---------------------------------------------------------------------------
interface EditorProps {
  editing: ListeningTestRow;
  editingExisting: boolean;
  saving: boolean;
  error: string | null;
  success: string | null;
  onCancel: () => void;
  onSave: () => void | Promise<void>;
  onDelete: () => void | Promise<void>;
  onUpdateField: <K extends keyof ListeningTestRow>(key: K, value: ListeningTestRow[K]) => void;
  onUpdateSegment: (idx: number, patch: Partial<Segment>) => void;
  onAddSegment: () => void;
  onRemoveSegment: (idx: number) => void;
  onAddQuestion: (type: QuestionType) => void;
  onRemoveQuestion: (id: string) => void;
  onUpdateQuestion: (id: string, patch: Partial<PublicQuestion>) => void;
  onUpdateAnswerKey: (id: string, patch: Partial<AnswerKeyEntry>) => void;
  onRenameQuestion: (oldId: string, newId: string) => void;
  onReorderSegment: (from: number, dropBeforeIdx: number) => void;
  onReorderQuestion: (from: number, dropBeforeIdx: number) => void;
  // Bumped by the parent every time the transcript is reordered. Watched as a
  // useEffect dependency to stop in-flight playback whose tracked row index
  // would otherwise point at the wrong segment after the reshuffle.
  transcriptReorderTick: number;
}

interface PreviewState {
  index: number;
  status: "loading" | "playing";
}

interface PlayAllState {
  index: number;
  status: "loading" | "playing";
}

function Editor(props: EditorProps) {
  const { editing, editingExisting, saving, error, success } = props;
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const requestIdRef = useRef(0);
  // First-visit hint shown to touch users (iPad etc.) inside the test editor.
  // Both the transcript and the question list use the same drag-the-grip /
  // arrow-key pattern, so a single hint above both sections is enough. Uses a
  // separate localStorage key from the Tests-tab hint so dismissing one does
  // not silence the other — admins meet each list at a different time.
  const EDITOR_REORDER_HINT_KEY = "churchill-admin-test-editor-reorder-hint-dismissed";
  const [showEditorReorderHint, setShowEditorReorderHint] = useState(false);
  // Tracked separately from `showEditorReorderHint` so the "reopen hint" help
  // icon stays visible on touch devices even after the admin dismisses the
  // banner. That way a colleague borrowing the iPad can bring the tip back
  // without clearing site data.
  const [isEditorCoarsePointer, setIsEditorCoarsePointer] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const coarse =
      window.matchMedia?.("(pointer: coarse)").matches ||
      (navigator.maxTouchPoints ?? 0) > 0;
    if (!coarse) return;
    setIsEditorCoarsePointer(true);
    try {
      if (window.localStorage.getItem(EDITOR_REORDER_HINT_KEY) === "1") return;
    } catch {
      // localStorage can throw in private mode — fall through and just show it.
    }
    setShowEditorReorderHint(true);
  }, []);
  const dismissEditorReorderHint = useCallback(() => {
    setShowEditorReorderHint(false);
    try {
      window.localStorage.setItem(EDITOR_REORDER_HINT_KEY, "1");
    } catch {
      // Best-effort: if storage fails we just won't remember the dismissal.
    }
  }, []);
  const reopenEditorReorderHint = useCallback(() => {
    setShowEditorReorderHint(true);
  }, []);
  // Drag state for the transcript and question sub-lists. Each tracks the
  // index being dragged and the index it would drop *before* (or `length` for
  // append). The two are independent — only one list can be dragged at a time
  // because a drag is initiated from a specific handle.
  // Refs mirror the state so drop handlers can read the active drag source
  // even when React hasn't re-rendered yet between the synthetic dragstart
  // and drop events (matters for some test runners and slow renders).
  const [segDrag, setSegDragState] = useState<number | null>(null);
  const [segDragOver, setSegDragOver] = useState<number | null>(null);
  const [qDrag, setQDragState] = useState<number | null>(null);
  const [qDragOver, setQDragOver] = useState<number | null>(null);
  const segDragRef = useRef<number | null>(null);
  const qDragRef = useRef<number | null>(null);
  const setSegDrag = useCallback((v: number | null) => {
    segDragRef.current = v;
    setSegDragState(v);
  }, []);
  const setQDrag = useCallback((v: number | null) => {
    qDragRef.current = v;
    setQDragState(v);
  }, []);
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ currentTime: number; duration: number }>({
    currentTime: 0,
    duration: 0,
  });
  // Sequential "Play whole test" state. Uses the same /admin/preview-segment
  // endpoint per row so cached audio (getOrCreateSegment) is reused.
  const [playAll, setPlayAll] = useState<PlayAllState | null>(null);
  const [playAllError, setPlayAllError] = useState<string | null>(null);
  // Elapsed wall-clock time (seconds) since the current "Play whole test"
  // run started, plus the running estimate of total test length. Total is
  // built up segment-by-segment from the <audio> element's `duration` as
  // each cached clip loads, so it's exact once every segment has been
  // played at least once and approximate before that.
  const [playAllElapsed, setPlayAllElapsed] = useState(0);
  const [playAllKnown, setPlayAllKnown] = useState<{ count: number; total: number }>({
    count: 0,
    total: 0,
  });
  const playAllStartedAtRef = useRef<number | null>(null);
  const playAllDurationsRef = useRef<Map<number, number>>(new Map());
  // Refs let the audio "ended" listener (registered once) and the chain
  // continuation read the live transcript and the active request id.
  const playAllRef = useRef<{ active: boolean; reqId: number; index: number }>({
    active: false,
    reqId: 0,
    index: -1,
  });
  const transcriptRef = useRef(editing.transcript);
  useEffect(() => {
    transcriptRef.current = editing.transcript;
  }, [editing.transcript]);
  // Holds the latest version of the chain step so the once-registered
  // "ended" listener can advance using current state/refs.
  const playNextRef = useRef<(idx: number, reqId: number) => void>(() => {});
  // Per-row refs let us scroll the currently-playing transcript row into
  // view during full-test playback so it stays visible in long lists.
  const rowRefs = useRef<Array<HTMLDivElement | null>>([]);

  // Initialize the shared audio element once and clean up listeners + playback on unmount.
  useEffect(() => {
    const audio = new Audio();
    audioRef.current = audio;
    const onEnded = () => {
      if (playAllRef.current.active) {
        // Advance the chain. Progress is reset by the next segment's load.
        const next = playAllRef.current.index + 1;
        playNextRef.current(next, playAllRef.current.reqId);
      } else {
        setPreview(null);
        setProgress({ currentTime: 0, duration: 0 });
      }
    };
    const onError = () => {
      if (playAllRef.current.active) {
        playAllRef.current.active = false;
        playAllRef.current.reqId += 1;
        setPlayAll(null);
        setPlayAllError("Could not play audio");
      } else {
        setPreview(null);
        setPreviewError("Could not play audio");
      }
      setProgress({ currentTime: 0, duration: 0 });
    };
    const onTimeUpdate = () => {
      setProgress((p) => ({
        currentTime: audio.currentTime,
        duration: Number.isFinite(audio.duration) ? audio.duration : p.duration,
      }));
    };
    const onDurationChange = () => {
      setProgress((p) => ({
        currentTime: audio.currentTime,
        duration: Number.isFinite(audio.duration) ? audio.duration : p.duration,
      }));
      // Build the running total for "Play whole test" by recording each
      // segment's duration the first time we hear it. This makes the
      // displayed total exact once every segment has been played at least
      // once (the cache means subsequent runs are exact from the start).
      if (
        playAllRef.current.active &&
        Number.isFinite(audio.duration) &&
        audio.duration > 0
      ) {
        const idx = playAllRef.current.index;
        if (idx >= 0 && !playAllDurationsRef.current.has(idx)) {
          playAllDurationsRef.current.set(idx, audio.duration);
          let total = 0;
          for (const d of playAllDurationsRef.current.values()) total += d;
          setPlayAllKnown({ count: playAllDurationsRef.current.size, total });
        }
      }
    };
    const onLoadedMetadata = onDurationChange;
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("error", onError);
    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("durationchange", onDurationChange);
    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    return () => {
      audio.pause();
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("error", onError);
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("durationchange", onDurationChange);
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audioRef.current = null;
    };
  }, []);

  // If the transcript row count changes (add/remove), the cached preview index
  // can no longer be trusted to point at the same segment, so stop playback.
  const transcriptLen = editing.transcript.length;
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    requestIdRef.current += 1;
    playAllRef.current.active = false;
    playAllRef.current.reqId += 1;
    audio.pause();
    setPreview(null);
    setPlayAll(null);
    setProgress({ currentTime: 0, duration: 0 });
  }, [transcriptLen]);

  // A reorder doesn't change the row count, so the length-based effect above
  // can't notice it. The parent bumps `transcriptReorderTick` on every
  // reshuffle so we can clear the active highlight and abort the chain
  // cleanly — the tracked index would otherwise point at the wrong row.
  const reorderTick = props.transcriptReorderTick;
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    requestIdRef.current += 1;
    playAllRef.current.active = false;
    playAllRef.current.reqId += 1;
    audio.pause();
    setPreview(null);
    setPlayAll(null);
    setProgress({ currentTime: 0, duration: 0 });
  }, [reorderTick]);

  const seekTo = (ratio: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    if (!Number.isFinite(audio.duration) || audio.duration <= 0) return;
    const clamped = Math.max(0, Math.min(1, ratio));
    audio.currentTime = clamped * audio.duration;
    setProgress((p) => ({ ...p, currentTime: audio.currentTime }));
  };

  // When the active segment changes during full-test playback, scroll its
  // row into view. `block: "nearest"` means we only scroll if the row is
  // already off-screen, so listening from the top of the list doesn't jump.
  const playAllIndex = playAll?.index ?? -1;
  useEffect(() => {
    if (playAllIndex < 0) return;
    const row = rowRefs.current[playAllIndex];
    if (!row) return;
    row.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [playAllIndex]);

  const stopPlayAll = useCallback(() => {
    const audio = audioRef.current;
    playAllRef.current.active = false;
    playAllRef.current.reqId += 1;
    if (audio) audio.pause();
    setPlayAll(null);
  }, []);

  // Drive the elapsed-time counter while a "Play whole test" run is active.
  // We measure wall-clock time from the first state transition so the timer
  // includes any small loading gaps between segments — that's what an admin
  // judging "is this test too long?" actually experiences.
  useEffect(() => {
    if (!playAll) {
      setPlayAllElapsed(0);
      playAllStartedAtRef.current = null;
      return;
    }
    if (playAllStartedAtRef.current === null) {
      playAllStartedAtRef.current = Date.now();
    }
    const tick = () => {
      const startedAt = playAllStartedAtRef.current;
      if (startedAt === null) return;
      setPlayAllElapsed(Math.floor((Date.now() - startedAt) / 1000));
    };
    tick();
    const id = window.setInterval(tick, 250);
    return () => window.clearInterval(id);
  }, [playAll]);

  const playChainStep = useCallback(async (idx: number, reqId: number): Promise<void> => {
    const audio = audioRef.current;
    if (!audio) return;
    if (reqId !== playAllRef.current.reqId) return;
    const transcript = transcriptRef.current;
    if (idx >= transcript.length) {
      // End of test reached — stop cleanly.
      playAllRef.current.active = false;
      setPlayAll(null);
      return;
    }
    const seg = transcript[idx];
    const trimmed = seg.text.trim();
    if (!trimmed) {
      playAllRef.current.active = false;
      setPlayAll(null);
      setPlayAllError(`Segment ${idx + 1} is empty — stopped before it.`);
      return;
    }
    playAllRef.current.index = idx;
    setPlayAll({ index: idx, status: "loading" });
    try {
      const res = await fetch(`${BASE_URL}/api-intro/listening/admin/preview-segment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ text: trimmed, voice: seg.voice }),
      });
      const data = await res.json().catch(() => ({}));
      if (reqId !== playAllRef.current.reqId) return;
      if (!res.ok) {
        playAllRef.current.active = false;
        setPlayAll(null);
        setPlayAllError(data.error || `Failed to load segment ${idx + 1}`);
        return;
      }
      audio.src = `${BASE_URL}/api/storage/public-objects/${data.url}`;
      try {
        await audio.play();
      } catch {
        if (reqId !== playAllRef.current.reqId) return;
        playAllRef.current.active = false;
        setPlayAll(null);
        setPlayAllError("Could not start playback");
        return;
      }
      if (reqId !== playAllRef.current.reqId) {
        audio.pause();
        return;
      }
      setPlayAll({ index: idx, status: "playing" });
    } catch {
      if (reqId !== playAllRef.current.reqId) return;
      playAllRef.current.active = false;
      setPlayAll(null);
      setPlayAllError("Connection error");
    }
  }, []);

  // Keep the ref pointing at the latest chain function so the audio "ended"
  // listener (registered once) can call into the current closure.
  useEffect(() => {
    playNextRef.current = (idx: number, reqId: number) => {
      void playChainStep(idx, reqId);
    };
  }, [playChainStep]);

  const startPlayAll = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    // Cancel any single-segment preview that might be in-flight.
    requestIdRef.current += 1;
    audio.pause();
    setPreview(null);
    setPreviewError(null);
    setPlayAllError(null);
    playAllRef.current.active = true;
    playAllRef.current.reqId += 1;
    playAllRef.current.index = -1;
    // Fresh run: forget any per-segment durations cached from a previous
    // playthrough so the running total grows from zero again. The wall-clock
    // start is set by the elapsed-time effect once `playAll` becomes truthy.
    playAllDurationsRef.current = new Map();
    setPlayAllKnown({ count: 0, total: 0 });
    void playChainStep(0, playAllRef.current.reqId);
  }, [playChainStep]);

  const playSegment = async (idx: number, text: string, voice: Voice) => {
    const audio = audioRef.current;
    if (!audio) return;
    setPreviewError(null);
    // Stop any active "Play whole test" chain — single-segment preview takes over.
    if (playAllRef.current.active) {
      playAllRef.current.active = false;
      playAllRef.current.reqId += 1;
      setPlayAll(null);
    }
    // Toggle off if this segment is already active.
    if (preview && preview.index === idx) {
      requestIdRef.current += 1; // invalidate any in-flight request for this segment
      audio.pause();
      setPreview(null);
      setProgress({ currentTime: 0, duration: 0 });
      return;
    }
    // Stop any currently playing segment before starting a new one.
    audio.pause();
    setProgress({ currentTime: 0, duration: 0 });
    const trimmed = text.trim();
    if (!trimmed) {
      setPreviewError("Add some text to this segment before previewing.");
      return;
    }
    const reqId = ++requestIdRef.current;
    setPreview({ index: idx, status: "loading" });
    try {
      const res = await fetch(`${BASE_URL}/api-intro/listening/admin/preview-segment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ text: trimmed, voice }),
      });
      const data = await res.json().catch(() => ({}));
      if (reqId !== requestIdRef.current) return; // superseded by another click
      if (!res.ok) {
        setPreview(null);
        setPreviewError(data.error || "Preview failed");
        return;
      }
      audio.src = `${BASE_URL}/api/storage/public-objects/${data.url}`;
      try {
        await audio.play();
        if (reqId !== requestIdRef.current) {
          audio.pause();
          return;
        }
        setPreview({ index: idx, status: "playing" });
      } catch {
        if (reqId !== requestIdRef.current) return;
        setPreview(null);
        setPreviewError("Could not start playback");
      }
    } catch {
      if (reqId !== requestIdRef.current) return;
      setPreview(null);
      setPreviewError("Connection error");
    }
  };

  const playAllDisabled =
    editing.transcript.length === 0 ||
    editing.transcript.every((s) => !s.text.trim());

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button
          onClick={props.onCancel}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-colors text-white/60 hover:bg-white/5"
        >
          <ArrowLeft className="w-4 h-4" /> Back to list
        </button>
        <div className="ml-auto flex items-center gap-2">
          {editingExisting && (
            <button
              onClick={props.onDelete}
              disabled={saving}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all disabled:opacity-60"
              style={{ background: "rgba(239,68,68,0.15)", color: "#f87171", border: "1px solid rgba(239,68,68,0.3)" }}
            >
              <Trash2 className="w-3.5 h-3.5" /> Delete
            </button>
          )}
          <button
            onClick={props.onSave}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all disabled:opacity-60"
            style={{ background: `linear-gradient(135deg, ${TEAL}, #8B5FF6)`, color: NAVY }}
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            {editingExisting ? "Save changes" : "Create test"}
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-2xl text-sm" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)" }}>
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <span className="text-red-300">{error}</span>
        </div>
      )}
      {success && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-2xl text-sm" style={{ background: "rgba(29,185,84,0.1)", border: "1px solid rgba(29,185,84,0.3)" }}>
          <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" style={{ color: GREEN }} />
          <span style={{ color: GREEN }}>{success}</span>
        </div>
      )}

      <Section title="Basics" icon={<Pencil className="w-4 h-4" style={{ color: TEAL }} />}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Slug (URL id)" hint="Lowercase letters, numbers, hyphens. Used in URLs.">
            <input
              type="text"
              value={editing.slug}
              disabled={editingExisting}
              onChange={(e) => props.onUpdateField("slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
              placeholder="e.g. s1-t6"
              className="w-full rounded-xl px-3 py-2 text-sm text-white placeholder-white/30 outline-none disabled:opacity-50 disabled:cursor-not-allowed font-mono"
              style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)" }}
            />
          </Field>
          <Field label="Section">
            <select
              value={editing.sectionId}
              onChange={(e) => props.onUpdateField("sectionId", parseInt(e.target.value))}
              className="w-full rounded-xl px-3 py-2 text-sm text-white outline-none"
              style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)" }}
            >
              {[1, 2, 3, 4].map((s) => (
                <option key={s} value={s} style={{ background: NAVY }}>{SECTION_LABELS[s]}</option>
              ))}
            </select>
          </Field>
          <Field label="Title" className="sm:col-span-2">
            <input
              type="text"
              value={editing.title}
              onChange={(e) => props.onUpdateField("title", e.target.value)}
              placeholder="e.g. Booking a hotel room"
              className="w-full rounded-xl px-3 py-2 text-sm text-white placeholder-white/30 outline-none"
              style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)" }}
            />
          </Field>
          <Field label="Short description" className="sm:col-span-2">
            <input
              type="text"
              value={editing.description}
              onChange={(e) => props.onUpdateField("description", e.target.value)}
              placeholder="One-line summary shown to students"
              className="w-full rounded-xl px-3 py-2 text-sm text-white placeholder-white/30 outline-none"
              style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)" }}
            />
          </Field>
        </div>
      </Section>

      {isEditorCoarsePointer && !showEditorReorderHint && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={reopenEditorReorderHint}
            className="p-2 rounded-xl text-white/40 hover:bg-white/10 transition-colors"
            title="Show reorder tip"
            aria-label="Show reorder tip"
            data-testid="editor-reorder-touch-hint-reopen"
          >
            <Info className="w-4 h-4" />
          </button>
        </div>
      )}

      {showEditorReorderHint && (
        <div
          className="flex items-start gap-2 px-3 py-2 rounded-xl text-xs"
          style={{
            background: "rgba(107,47,230,0.10)",
            border: "1px solid rgba(107,47,230,0.35)",
            color: "rgba(255,255,255,0.85)",
          }}
          role="note"
          data-testid="editor-reorder-touch-hint"
        >
          <Info
            className="w-4 h-4 mt-0.5 shrink-0"
            style={{ color: TEAL }}
            aria-hidden="true"
          />
          <div className="flex-1 leading-snug">
            <strong className="font-bold">Tip:</strong> long-press the{" "}
            <GripVertical
              className="inline w-3.5 h-3.5 align-text-bottom"
              aria-hidden="true"
            />{" "}
            handle on a transcript segment or question to drag it, or focus the handle and use{" "}
            <ArrowUp className="inline w-3.5 h-3.5 align-text-bottom" aria-hidden="true" />
            <ArrowDown className="inline w-3.5 h-3.5 align-text-bottom" aria-hidden="true" />{" "}
            to reorder.
          </div>
          <button
            type="button"
            onClick={dismissEditorReorderHint}
            className="shrink-0 p-1 rounded hover:bg-white/10 text-white/60 hover:text-white transition-colors"
            aria-label="Dismiss reorder hint"
            data-testid="editor-reorder-touch-hint-dismiss"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <Section
        title="Transcript"
        icon={<Mic className="w-4 h-4" style={{ color: TEAL }} />}
        headerAction={
          <div className="flex items-center gap-2">
            {playAll && (
              <span
                className="font-mono tabular-nums text-[11px] text-white/70"
                title={
                  playAllKnown.count < editing.transcript.length
                    ? "Total grows as each segment loads — exact once every segment has played"
                    : "Total time of every segment in this test"
                }
                data-testid="play-whole-test-timer"
              >
                {formatSegmentTime(playAllElapsed)}
                <span className="text-white/40"> / </span>
                {playAllKnown.count > 0 && playAllKnown.count < editing.transcript.length && (
                  <span className="text-white/50">~</span>
                )}
                {formatSegmentTime(playAllKnown.total)}
              </span>
            )}
            <button
              onClick={playAll ? stopPlayAll : startPlayAll}
              disabled={!playAll && playAllDisabled}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              style={
                playAll
                  ? { background: "rgba(239,68,68,0.15)", color: "#f87171", border: "1px solid rgba(239,68,68,0.35)" }
                  : { background: "rgba(107,47,230,0.15)", color: TEAL, border: "1px solid rgba(107,47,230,0.35)" }
              }
              title={playAll ? "Stop playback" : "Play every segment back-to-back"}
              data-testid="play-whole-test-button"
            >
              {playAll?.status === "loading" ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : playAll ? (
                <Square className="w-3.5 h-3.5 fill-current" />
              ) : (
                <Play className="w-3.5 h-3.5 fill-current" />
              )}
              {playAll ? "Stop" : "Play whole test"}
            </button>
          </div>
        }
      >
        <p className="text-xs text-white/50 mb-3">
          Each segment is one spoken line. Audio is generated automatically and cached by content hash, so editing text only re-generates that line on next play.
        </p>
        {previewError && (
          <div className="mb-2 flex items-start gap-2 px-3 py-2 rounded-xl text-xs" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)" }}>
            <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
            <span className="text-red-300">{previewError}</span>
          </div>
        )}
        {playAllError && (
          <div className="mb-2 flex items-start gap-2 px-3 py-2 rounded-xl text-xs" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)" }}>
            <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
            <span className="text-red-300">{playAllError}</span>
          </div>
        )}
        <div
          className="space-y-2"
          onDragOver={(e) => {
            if (segDragRef.current !== null) {
              e.preventDefault();
              e.dataTransfer.dropEffect = "move";
            }
          }}
          onDrop={(e) => {
            const from = segDragRef.current;
            if (from === null) return;
            e.preventDefault();
            // Default to appending if the drop didn't land on a row.
            const to = segDragOver ?? editing.transcript.length;
            setSegDrag(null);
            setSegDragOver(null);
            props.onReorderSegment(from, to);
          }}
        >
          {editing.transcript.map((seg, i) => {
            // The per-row button only tracks the single-segment preview, since
            // that is what clicking it controls. Play-all uses the row
            // highlight (background + left border) as its own visual signal,
            // so the button doesn't pretend it can pause the chain.
            const isActive = preview?.index === i;
            const isLoading = isActive && preview?.status === "loading";
            const isPlaying = isActive && preview?.status === "playing";
            const isPlayAllActive = playAll?.index === i;
            const disabled = !seg.text.trim();
            const showProgress = isPlaying;
            const pct =
              showProgress && progress.duration > 0
                ? Math.max(0, Math.min(100, (progress.currentTime / progress.duration) * 100))
                : 0;
            const isDragging = segDrag === i;
            const showDropLine =
              segDrag !== null &&
              segDragOver === i &&
              segDrag !== i &&
              segDrag !== i - 1;
            const segDropOnRow = (e: React.DragEvent<HTMLDivElement>) => {
              const from = segDragRef.current;
              if (from === null) return;
              e.preventDefault();
              e.stopPropagation();
              setSegDrag(null);
              setSegDragOver(null);
              props.onReorderSegment(from, i);
            };
            const segDragOverRow = (e: React.DragEvent<HTMLDivElement>) => {
              if (segDragRef.current !== null) {
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
              }
            };
            const segDragEnterRow = () => {
              if (segDragRef.current !== null && segDragRef.current !== i) {
                setSegDragOver(i);
              }
            };
            return (
              <div key={i} className="space-y-1.5">
              <div
                ref={(el) => {
                  rowRefs.current[i] = el;
                }}
                className="flex gap-2 items-start rounded-xl transition-colors"
                style={{
                  background: isPlayAllActive ? "rgba(107,47,230,0.10)" : "transparent",
                  boxShadow: isPlayAllActive ? `inset 3px 0 0 ${TEAL}` : undefined,
                  padding: isPlayAllActive ? "4px 6px" : "4px 0",
                  borderTop: showDropLine ? `2px solid ${TEAL}` : undefined,
                  opacity: isDragging ? 0.45 : 1,
                }}
                data-testid={`transcript-row-${i}`}
                data-playing={isPlayAllActive ? "true" : undefined}
                onDragEnter={segDragEnterRow}
                onDragOver={segDragOverRow}
                onDrop={segDropOnRow}
              >
                <span
                  draggable
                  onDragStart={(e) => {
                    setSegDrag(i);
                    e.dataTransfer.effectAllowed = "move";
                    try { e.dataTransfer.setData("text/plain", String(i)); } catch { /* Safari */ }
                  }}
                  onDragEnd={() => {
                    setSegDrag(null);
                    setSegDragOver(null);
                  }}
                  className="shrink-0 text-white/30 hover:text-white/70 transition-colors pt-2"
                  style={{ cursor: "grab", touchAction: "none" }}
                  title="Drag to reorder"
                  aria-label="Drag segment to reorder"
                  data-testid={`segment-drag-handle-${i}`}
                >
                  <GripVertical className="w-4 h-4" />
                </span>
                <span className="text-[11px] text-white/30 w-6 pt-2 shrink-0 text-right">{i + 1}.</span>
                <select
                  value={seg.voice}
                  onChange={(e) => props.onUpdateSegment(i, { voice: e.target.value as Voice })}
                  className="rounded-xl px-2 py-2 text-xs text-white outline-none shrink-0"
                  style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", width: 90 }}
                >
                  <option value="alloy" style={{ background: NAVY }}>alloy ♂</option>
                  <option value="nova" style={{ background: NAVY }}>nova ♀</option>
                </select>
                <button
                  onClick={() => playSegment(i, seg.text, seg.voice)}
                  disabled={disabled && !isActive}
                  className="p-2 rounded-xl shrink-0 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  style={{
                    background: isActive ? "rgba(107,47,230,0.2)" : "rgba(255,255,255,0.08)",
                    border: `1px solid ${isActive ? "rgba(107,47,230,0.5)" : "rgba(255,255,255,0.15)"}`,
                    color: isActive ? TEAL : "rgba(255,255,255,0.7)",
                  }}
                  title={isPlaying ? "Stop preview" : isLoading ? "Generating audio…" : "Preview this segment"}
                  aria-label={isPlaying ? "Stop preview" : "Preview segment"}
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : isPlaying ? (
                    <Pause className="w-4 h-4" />
                  ) : (
                    <Play className="w-4 h-4" />
                  )}
                </button>
                <textarea
                  value={seg.text}
                  onChange={(e) => props.onUpdateSegment(i, { text: e.target.value })}
                  rows={2}
                  placeholder="Spoken line…"
                  className="flex-1 rounded-xl px-3 py-2 text-sm text-white placeholder-white/30 outline-none resize-y"
                  style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)" }}
                />
                <button
                  onClick={() => props.onRemoveSegment(i)}
                  disabled={editing.transcript.length <= 1}
                  className="p-2 rounded-lg text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  title="Remove segment"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              {showProgress && (
                <div
                  data-testid={`segment-progress-${i}`}
                  className="ml-8 mr-10 flex items-center gap-2"
                >
                  <div
                    role="slider"
                    aria-label="Seek within segment"
                    aria-valuemin={0}
                    aria-valuemax={Math.max(1, Math.round(progress.duration))}
                    aria-valuenow={Math.round(progress.currentTime)}
                    tabIndex={0}
                    onPointerDown={(e) => {
                      const target = e.currentTarget;
                      const rect = target.getBoundingClientRect();
                      if (rect.width <= 0) return;
                      // Capture so subsequent move/up events still target this
                      // element even if the cursor leaves its bounds.
                      try {
                        target.setPointerCapture(e.pointerId);
                      } catch {
                        // Some environments (e.g. jsdom) don't implement
                        // pointer capture; dragging still works for the
                        // common case where the cursor stays over the bar.
                      }
                      seekTo((e.clientX - rect.left) / rect.width);
                    }}
                    onPointerMove={(e) => {
                      const target = e.currentTarget;
                      if (!target.hasPointerCapture?.(e.pointerId)) return;
                      const rect = target.getBoundingClientRect();
                      if (rect.width <= 0) return;
                      seekTo((e.clientX - rect.left) / rect.width);
                    }}
                    onPointerUp={(e) => {
                      const target = e.currentTarget;
                      if (target.hasPointerCapture?.(e.pointerId)) {
                        target.releasePointerCapture(e.pointerId);
                      }
                    }}
                    onPointerCancel={(e) => {
                      // Browser cancelled the gesture (e.g. a system swipe
                      // took over the touch). Release capture so a later
                      // pointermove from a different gesture doesn't keep
                      // scrubbing the playhead around behind the admin's back.
                      const target = e.currentTarget;
                      if (target.hasPointerCapture?.(e.pointerId)) {
                        target.releasePointerCapture(e.pointerId);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (!Number.isFinite(progress.duration) || progress.duration <= 0) return;
                      const step = 2; // seconds
                      if (e.key === "ArrowRight") {
                        e.preventDefault();
                        seekTo((progress.currentTime + step) / progress.duration);
                      } else if (e.key === "ArrowLeft") {
                        e.preventDefault();
                        seekTo((progress.currentTime - step) / progress.duration);
                      }
                    }}
                    className="relative h-1.5 flex-1 rounded-full overflow-hidden cursor-pointer select-none"
                    style={{ background: "rgba(255,255,255,0.12)", touchAction: "none" }}
                    title="Click or drag to seek"
                  >
                    <div
                      className="absolute left-0 top-0 h-full transition-[width] duration-150"
                      style={{ width: `${pct}%`, background: TEAL }}
                    />
                  </div>
                  <span className="text-[10px] tabular-nums text-white/40 w-16 shrink-0 text-right">
                    {formatSegmentTime(progress.currentTime)}
                    {progress.duration > 0 ? ` / ${formatSegmentTime(progress.duration)}` : ""}
                  </span>
                </div>
              )}
              </div>
            );
          })}
          {editing.transcript.length > 0 && (
            <div
              data-testid="transcript-end-drop"
              className="rounded-xl"
              style={{
                height: 18,
                marginTop: 4,
                background:
                  segDrag !== null && segDragOver === editing.transcript.length
                    ? "rgba(107,47,230,0.12)"
                    : "transparent",
                border:
                  segDrag !== null && segDragOver === editing.transcript.length
                    ? `1px dashed ${TEAL}`
                    : "1px dashed transparent",
                transition: "background 120ms, border-color 120ms",
              }}
              onDragEnter={() => {
                if (segDragRef.current !== null) {
                  setSegDragOver(editing.transcript.length);
                }
              }}
              onDragOver={(e) => {
                if (segDragRef.current !== null) {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "move";
                }
              }}
              onDrop={(e) => {
                const from = segDragRef.current;
                if (from === null) return;
                e.preventDefault();
                e.stopPropagation();
                setSegDrag(null);
                setSegDragOver(null);
                props.onReorderSegment(from, editing.transcript.length);
              }}
            />
          )}
        </div>
        <button
          onClick={props.onAddSegment}
          className="mt-3 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
          style={{ background: "rgba(107,47,230,0.12)", color: TEAL, border: "1px solid rgba(107,47,230,0.25)" }}
        >
          <Plus className="w-3.5 h-3.5" /> Add segment
        </button>
      </Section>

      <Section title="Questions" icon={<Pencil className="w-4 h-4" style={{ color: TEAL }} />}>
        {editing.questions.length === 0 ? (
          <p className="text-xs text-white/40 mb-3">No questions yet. Add one below to get started.</p>
        ) : (
          <div
            className="space-y-3"
            onDragOver={(e) => {
              if (qDragRef.current !== null) {
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
              }
            }}
            onDrop={(e) => {
              const from = qDragRef.current;
              if (from === null) return;
              e.preventDefault();
              const to = qDragOver ?? editing.questions.length;
              setQDrag(null);
              setQDragOver(null);
              props.onReorderQuestion(from, to);
            }}
          >
            {editing.questions.map((q, idx) => {
              const isDragging = qDrag === idx;
              const showDropLine =
                qDrag !== null &&
                qDragOver === idx &&
                qDrag !== idx &&
                qDrag !== idx - 1;
              return (
                <div
                  key={q.id}
                  data-testid={`question-row-${q.id}`}
                  style={{
                    borderTop: showDropLine ? `2px solid ${TEAL}` : undefined,
                    opacity: isDragging ? 0.45 : 1,
                    transition: "opacity 120ms",
                  }}
                  onDragEnter={() => {
                    if (qDragRef.current !== null && qDragRef.current !== idx) {
                      setQDragOver(idx);
                    }
                  }}
                  onDragOver={(e) => {
                    if (qDragRef.current !== null) {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = "move";
                    }
                  }}
                  onDrop={(e) => {
                    const from = qDragRef.current;
                    if (from === null) return;
                    e.preventDefault();
                    e.stopPropagation();
                    setQDrag(null);
                    setQDragOver(null);
                    props.onReorderQuestion(from, idx);
                  }}
                >
                  <QuestionEditor
                    idx={idx + 1}
                    question={q}
                    answerKey={editing.answerKey[q.id]}
                    onRemove={() => props.onRemoveQuestion(q.id)}
                    onUpdate={(patch) => props.onUpdateQuestion(q.id, patch)}
                    onUpdateAnswer={(patch) => props.onUpdateAnswerKey(q.id, patch)}
                    onRename={(newId) => props.onRenameQuestion(q.id, newId)}
                    onDragHandleStart={(e) => {
                      setQDrag(idx);
                      e.dataTransfer.effectAllowed = "move";
                      try { e.dataTransfer.setData("text/plain", q.id); } catch { /* Safari */ }
                    }}
                    onDragHandleEnd={() => {
                      setQDrag(null);
                      setQDragOver(null);
                    }}
                  />
                </div>
              );
            })}
            <div
              data-testid="questions-end-drop"
              className="rounded-xl"
              style={{
                height: 22,
                background:
                  qDrag !== null && qDragOver === editing.questions.length
                    ? "rgba(107,47,230,0.12)"
                    : "transparent",
                border:
                  qDrag !== null && qDragOver === editing.questions.length
                    ? `1px dashed ${TEAL}`
                    : "1px dashed transparent",
                transition: "background 120ms, border-color 120ms",
              }}
              onDragEnter={() => {
                if (qDragRef.current !== null) {
                  setQDragOver(editing.questions.length);
                }
              }}
              onDragOver={(e) => {
                if (qDragRef.current !== null) {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "move";
                }
              }}
              onDrop={(e) => {
                const from = qDragRef.current;
                if (from === null) return;
                e.preventDefault();
                e.stopPropagation();
                setQDrag(null);
                setQDragOver(null);
                props.onReorderQuestion(from, editing.questions.length);
              }}
            />
          </div>
        )}
        <div className="flex flex-wrap gap-2 mt-4">
          {(["mcq", "matching", "note_completion", "sentence_completion", "short_answer"] as QuestionType[]).map((t) => (
            <button
              key={t}
              onClick={() => props.onAddQuestion(t)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all"
              style={{ background: "rgba(107,47,230,0.12)", color: TEAL, border: "1px solid rgba(107,47,230,0.25)" }}
            >
              <Plus className="w-3 h-3" /> {labelForType(t)}
            </button>
          ))}
        </div>
      </Section>
    </div>
  );
}

function labelForType(t: QuestionType): string {
  return {
    mcq: "MCQ",
    matching: "Matching",
    note_completion: "Note completion",
    sentence_completion: "Sentence completion",
    short_answer: "Short answer",
  }[t];
}

function Section({ title, icon, headerAction, children }: { title: string; icon: React.ReactNode; headerAction?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl p-4" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)" }}>
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <h3 className="font-bold text-white text-sm">{title}</h3>
        {headerAction && <div className="ml-auto">{headerAction}</div>}
      </div>
      {children}
    </div>
  );
}

function Field({ label, hint, className, children }: { label: string; hint?: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={className}>
      <label className="block text-[10px] font-bold text-white/40 uppercase tracking-wider mb-1">{label}</label>
      {children}
      {hint && <p className="mt-1 text-[10px] text-white/30">{hint}</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// QuestionEditor
// ---------------------------------------------------------------------------
interface QuestionEditorProps {
  idx: number;
  question: PublicQuestion;
  answerKey: AnswerKeyEntry | undefined;
  onRemove: () => void;
  onUpdate: (patch: Partial<PublicQuestion>) => void;
  onUpdateAnswer: (patch: Partial<AnswerKeyEntry>) => void;
  onRename: (newId: string) => void;
  onDragHandleStart?: (e: React.DragEvent<HTMLSpanElement>) => void;
  onDragHandleEnd?: () => void;
}

function QuestionEditor({ idx, question, answerKey, onRemove, onUpdate, onUpdateAnswer, onRename, onDragHandleStart, onDragHandleEnd }: QuestionEditorProps) {
  const [idDraft, setIdDraft] = useState(question.id);
  useEffect(() => { setIdDraft(question.id); }, [question.id]);

  return (
    <div className="rounded-xl p-3 space-y-3" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
      <div className="flex items-center gap-2">
        {onDragHandleStart && (
          <span
            draggable
            onDragStart={onDragHandleStart}
            onDragEnd={onDragHandleEnd}
            className="text-white/30 hover:text-white/70 transition-colors"
            style={{ cursor: "grab", touchAction: "none" }}
            title="Drag to reorder"
            aria-label="Drag question to reorder"
            data-testid={`question-drag-handle-${question.id}`}
          >
            <GripVertical className="w-4 h-4" />
          </span>
        )}
        <span className="text-[10px] font-black px-2 py-0.5 rounded-full" style={{ background: TEAL, color: NAVY }}>
          #{idx}
        </span>
        <span className="text-[10px] uppercase font-bold" style={{ color: TEAL }}>{labelForType(question.type)}</span>
        <input
          type="text"
          value={idDraft}
          onChange={(e) => setIdDraft(e.target.value.replace(/\s+/g, ""))}
          onBlur={() => onRename(idDraft)}
          className="ml-auto w-24 rounded-lg px-2 py-1 text-[11px] font-mono text-white outline-none"
          style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}
          title="Question id"
        />
        <button
          onClick={onRemove}
          className="p-1.5 rounded-lg text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-colors"
          title="Remove question"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
      <Field label="Prompt">
        <textarea
          value={question.prompt}
          onChange={(e) => onUpdate({ prompt: e.target.value })}
          rows={2}
          className="w-full rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 outline-none resize-y"
          style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}
        />
      </Field>
      {question.type === "mcq" && answerKey?.type === "mcq" && (
        <McqEditor question={question} answerKey={answerKey} onUpdate={onUpdate} onUpdateAnswer={onUpdateAnswer} />
      )}
      {question.type === "matching" && answerKey?.type === "matching" && (
        <MatchingEditor question={question} answerKey={answerKey} onUpdate={onUpdate} onUpdateAnswer={onUpdateAnswer} />
      )}
      {(question.type === "note_completion" || question.type === "sentence_completion" || question.type === "short_answer") &&
        answerKey && (answerKey.type === "note_completion" || answerKey.type === "sentence_completion" || answerKey.type === "short_answer") && (
        <CompletionEditor question={question} answerKey={answerKey} onUpdate={onUpdate} onUpdateAnswer={onUpdateAnswer} />
      )}
    </div>
  );
}

function McqEditor({ question, answerKey, onUpdate, onUpdateAnswer }: {
  question: PublicMcq;
  answerKey: AnswerKeyMcq;
  onUpdate: (p: Partial<PublicQuestion>) => void;
  onUpdateAnswer: (p: Partial<AnswerKeyEntry>) => void;
}) {
  const setOption = (i: number, val: string) => {
    const next = question.options.slice();
    next[i] = val;
    onUpdate({ options: next });
  };
  const addOption = () => onUpdate({ options: [...question.options, ""] });
  const removeOption = (i: number) => {
    const next = question.options.filter((_, j) => j !== i);
    onUpdate({ options: next });
    if (answerKey.answer >= next.length) {
      onUpdateAnswer({ answer: Math.max(0, next.length - 1) });
    } else if (answerKey.answer > i) {
      onUpdateAnswer({ answer: answerKey.answer - 1 });
    }
  };
  return (
    <div className="space-y-2">
      <label className="block text-[10px] font-bold text-white/40 uppercase tracking-wider">Options (click radio to mark correct)</label>
      {question.options.map((opt, i) => (
        <div key={i} className="flex items-center gap-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              checked={answerKey.answer === i}
              onChange={() => onUpdateAnswer({ answer: i })}
              className="accent-current"
              style={{ accentColor: GREEN }}
            />
          </label>
          <input
            type="text"
            value={opt}
            onChange={(e) => setOption(i, e.target.value)}
            placeholder={`Option ${i + 1}`}
            className="flex-1 rounded-lg px-3 py-1.5 text-sm text-white placeholder-white/30 outline-none"
            style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}
          />
          <button
            onClick={() => removeOption(i)}
            disabled={question.options.length <= 2}
            className="p-1.5 rounded-lg text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-30"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
      <button onClick={addOption} className="flex items-center gap-1 text-[11px] font-bold mt-1" style={{ color: TEAL }}>
        <Plus className="w-3 h-3" /> Add option
      </button>
    </div>
  );
}

function MatchingEditor({ question, answerKey, onUpdate, onUpdateAnswer }: {
  question: PublicMatching;
  answerKey: AnswerKeyMatching;
  onUpdate: (p: Partial<PublicQuestion>) => void;
  onUpdateAnswer: (p: Partial<AnswerKeyEntry>) => void;
}) {
  const setItem = (i: number, val: string) => {
    const next = question.items.slice();
    next[i] = val;
    onUpdate({ items: next });
  };
  const setOption = (i: number, val: string) => {
    const next = question.options.slice();
    next[i] = val;
    onUpdate({ options: next });
  };
  const addItem = () => {
    onUpdate({ items: [...question.items, ""] });
    onUpdateAnswer({ answers: [...answerKey.answers, 0] });
  };
  const removeItem = (i: number) => {
    onUpdate({ items: question.items.filter((_, j) => j !== i) });
    onUpdateAnswer({ answers: answerKey.answers.filter((_, j) => j !== i) });
  };
  const addOption = () => onUpdate({ options: [...question.options, ""] });
  const removeOption = (i: number) => {
    const next = question.options.filter((_, j) => j !== i);
    onUpdate({ options: next });
    // Re-clamp answer indices
    onUpdateAnswer({
      answers: answerKey.answers.map((a) => (a >= next.length ? Math.max(0, next.length - 1) : a > i ? a - 1 : a)),
    });
  };
  const setAnswer = (itemIdx: number, optionIdx: number) => {
    const next = answerKey.answers.slice();
    next[itemIdx] = optionIdx;
    onUpdateAnswer({ answers: next });
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div>
        <label className="block text-[10px] font-bold text-white/40 uppercase tracking-wider mb-1">Items (left side)</label>
        <div className="space-y-2">
          {question.items.map((it, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="text"
                value={it}
                onChange={(e) => setItem(i, e.target.value)}
                placeholder={`Item ${i + 1}`}
                className="flex-1 rounded-lg px-3 py-1.5 text-sm text-white placeholder-white/30 outline-none"
                style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}
              />
              <select
                value={answerKey.answers[i] ?? 0}
                onChange={(e) => setAnswer(i, parseInt(e.target.value))}
                className="rounded-lg px-2 py-1.5 text-xs text-white outline-none"
                style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}
                title="Correct option index"
              >
                {question.options.map((_, j) => (
                  <option key={j} value={j} style={{ background: NAVY }}>→ {String.fromCharCode(65 + j)}</option>
                ))}
              </select>
              <button onClick={() => removeItem(i)} disabled={question.items.length <= 1} className="p-1.5 rounded-lg text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-30">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
        <button onClick={addItem} className="flex items-center gap-1 text-[11px] font-bold mt-2" style={{ color: TEAL }}>
          <Plus className="w-3 h-3" /> Add item
        </button>
      </div>
      <div>
        <label className="block text-[10px] font-bold text-white/40 uppercase tracking-wider mb-1">Options (right side, A/B/C…)</label>
        <div className="space-y-2">
          {question.options.map((opt, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-[10px] font-black w-5 text-right" style={{ color: TEAL }}>{String.fromCharCode(65 + i)}.</span>
              <input
                type="text"
                value={opt}
                onChange={(e) => setOption(i, e.target.value)}
                placeholder={`Option ${String.fromCharCode(65 + i)}`}
                className="flex-1 rounded-lg px-3 py-1.5 text-sm text-white placeholder-white/30 outline-none"
                style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}
              />
              <button onClick={() => removeOption(i)} disabled={question.options.length <= 1} className="p-1.5 rounded-lg text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-30">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
        <button onClick={addOption} className="flex items-center gap-1 text-[11px] font-bold mt-2" style={{ color: TEAL }}>
          <Plus className="w-3 h-3" /> Add option
        </button>
      </div>
    </div>
  );
}

function CompletionEditor({ question, answerKey, onUpdate, onUpdateAnswer }: {
  question: PublicCompletion;
  answerKey: AnswerKeyCompletion;
  onUpdate: (p: Partial<PublicQuestion>) => void;
  onUpdateAnswer: (p: Partial<AnswerKeyEntry>) => void;
}) {
  const [acceptableDraft, setAcceptableDraft] = useState(answerKey.acceptable.join(", "));
  useEffect(() => {
    setAcceptableDraft(answerKey.acceptable.join(", "));
  }, [answerKey.acceptable]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <Field label="Word limit">
        <input
          type="number"
          min={1}
          value={question.wordLimit}
          onChange={(e) => onUpdate({ wordLimit: Math.max(1, parseInt(e.target.value) || 1) })}
          className="w-full rounded-lg px-3 py-1.5 text-sm text-white outline-none"
          style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}
        />
      </Field>
      <Field label="Canonical answer" className="sm:col-span-2">
        <input
          type="text"
          value={answerKey.answer}
          onChange={(e) => onUpdateAnswer({ answer: e.target.value })}
          placeholder="e.g. ten"
          className="w-full rounded-lg px-3 py-1.5 text-sm text-white placeholder-white/30 outline-none"
          style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}
        />
      </Field>
      <Field label="Acceptable variants (comma-separated)" hint="Alternate wordings that should also be accepted." className="sm:col-span-3">
        <input
          type="text"
          value={acceptableDraft}
          onChange={(e) => setAcceptableDraft(e.target.value)}
          onBlur={() => onUpdateAnswer({ acceptable: acceptableDraft.split(",").map((s) => s.trim()).filter(Boolean) })}
          placeholder="e.g. ten, 10, 10am"
          className="w-full rounded-lg px-3 py-1.5 text-sm text-white placeholder-white/30 outline-none"
          style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}
        />
      </Field>
      <Field label="Optional context" className="sm:col-span-3">
        <input
          type="text"
          value={question.context || ""}
          onChange={(e) => onUpdate({ context: e.target.value || undefined })}
          placeholder="Extra wording shown above the answer field (rarely used)"
          className="w-full rounded-lg px-3 py-1.5 text-sm text-white placeholder-white/30 outline-none"
          style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}
        />
      </Field>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Prime audio result panel
// ---------------------------------------------------------------------------
interface PrimeResultPanelProps {
  result: { message: string; summary: PrimeSummary };
  onDismiss: () => void;
}

function PrimeResultPanel({ result, onDismiss }: PrimeResultPanelProps) {
  const { summary, message } = result;
  const hasFailures = summary.segmentsFailed > 0;
  const cancelled = summary.cancelled;
  // Cancelled runs use the same yellow tint as the live progress panel so
  // admins recognise them as "stopped on purpose" rather than "error" or
  // "successful finish".
  const accent = cancelled ? YELLOW : hasFailures ? "#f87171" : GREEN;
  const tint = cancelled
    ? "rgba(245,197,24,0.08)"
    : hasFailures
      ? "rgba(239,68,68,0.08)"
      : "rgba(29,185,84,0.08)";
  const border = cancelled
    ? "rgba(245,197,24,0.3)"
    : hasFailures
      ? "rgba(239,68,68,0.3)"
      : "rgba(29,185,84,0.3)";
  const headline = cancelled
    ? summary.interruptedTest
      ? `Cancelled while priming ${summary.interruptedTest.title}: ${summary.testsPrimed}/${summary.testsTotal} tests done`
      : `Cancelled after ${summary.testsPrimed}/${summary.testsTotal} tests`
    : message;
  const sorted = summary.perTest
    .slice()
    .sort((a, b) => (b.failed - a.failed) || a.title.localeCompare(b.title));

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: tint, border: `1px solid ${border}` }}
      data-testid="prime-result-panel"
      data-cancelled={cancelled ? "true" : "false"}
    >
      <div className="flex items-start gap-3 px-4 py-3">
        {cancelled ? (
          <Square className="w-4 h-4 shrink-0 mt-0.5" style={{ color: accent }} />
        ) : hasFailures ? (
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" style={{ color: accent }} />
        ) : (
          <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" style={{ color: accent }} />
        )}
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold" style={{ color: accent }}>
            {headline}
          </div>
          <div className="mt-1 text-xs text-white/60 flex flex-wrap gap-x-3 gap-y-1">
            <span><b className="text-white">{summary.testsPrimed}</b>/<b className="text-white">{summary.testsTotal}</b> tests primed</span>
            <span><b className="text-white">{summary.segmentsUploaded}</b> uploaded</span>
            <span><b className="text-white">{summary.segmentsSkipped}</b> skipped</span>
            <span style={hasFailures ? { color: "#f87171" } : undefined}>
              <b style={hasFailures ? { color: "#f87171" } : { color: "white" }}>{summary.segmentsFailed}</b> failed
            </span>
          </div>
        </div>
        <button
          onClick={onDismiss}
          className="p-1 rounded-lg text-white/40 hover:bg-white/10 transition-colors"
          title="Dismiss"
          aria-label="Dismiss prime audio result"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {sorted.length > 0 && (
        <div className="border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          <div
            className="max-h-72 overflow-y-auto divide-y"
            style={{ borderColor: "rgba(255,255,255,0.04)" }}
          >
            {sorted.map((t) => {
              const failed = t.failed > 0;
              return (
                <div key={t.testId} className="px-4 py-2.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    {failed ? (
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" style={{ color: "#f87171" }} />
                    ) : (
                      <CheckCircle className="w-3.5 h-3.5 shrink-0" style={{ color: GREEN }} />
                    )}
                    <span className="text-xs font-bold text-white truncate">{t.title}</span>
                    <span
                      className="text-[10px] px-1.5 py-0.5 rounded-full font-mono"
                      style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.6)" }}
                    >
                      {t.testId}
                    </span>
                    <span className="ml-auto text-[11px] text-white/50">
                      {t.uploaded > 0 && (
                        <span style={{ color: TEAL }}>+{t.uploaded} new </span>
                      )}
                      {t.skipped > 0 && (
                        <span className="text-white/40">{t.skipped} cached </span>
                      )}
                      {failed && (
                        <span style={{ color: "#f87171" }}>{t.failed} failed </span>
                      )}
                      <span className="text-white/30">/ {t.segmentCount} segments</span>
                    </span>
                  </div>
                  {failed && t.errors.length > 0 && (
                    <ul className="mt-1.5 ml-5 space-y-0.5">
                      {t.errors.map((e, i) => (
                        <li
                          key={i}
                          className="text-[11px] text-red-300/90 font-mono break-words"
                        >
                          segment #{e.index + 1}: {e.message}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// At-a-glance audio cache totals (rendered under the action buttons)
// ---------------------------------------------------------------------------

// Human-readable byte formatter for the cache-size hint. Uses 1024-based
// units (KB/MB/GB/TB) since these are file sizes on object storage. A single
// fractional digit is enough to spot growth without overwhelming the line.
// Sub-kilobyte values stay in raw bytes because anything smaller than 1 KB
// is almost always a storage-listing oddity worth showing exactly.
function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let i = 0;
  let value = bytes;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i += 1;
  }
  return i === 0 ? `${Math.round(value)} ${units[i]}` : `${value.toFixed(1)} ${units[i]}`;
}

function AudioStatsLine({
  stats,
  loading,
}: {
  stats: { scanned: number; referenced: number; orphaned: number; bytes: number } | null;
  loading: boolean;
}) {
  // Don't paint numbers we don't have, otherwise admins might briefly see
  // "0 cached". Show a loading note while the first fetch is in flight,
  // and an honest "unavailable" note if we've finished without data (e.g.
  // a transient network blip on mount).
  if (!stats) {
    return (
      <div
        className="text-xs text-white/40 flex items-center gap-1.5"
        data-testid="audio-stats-line"
      >
        {loading ? (
          <>
            <Loader2 className="w-3 h-3 animate-spin" />
            <span>Loading cache totals…</span>
          </>
        ) : (
          <span>Cache totals unavailable</span>
        )}
      </div>
    );
  }
  const { scanned, referenced, orphaned, bytes } = stats;
  const orphanColor = orphaned > 0 ? YELLOW : "rgba(255,255,255,0.55)";
  return (
    <div
      className="text-xs text-white/55 flex flex-wrap items-center gap-x-3 gap-y-1"
      data-testid="audio-stats-line"
    >
      <span>
        <b className="text-white">{scanned.toLocaleString()}</b> cached audio file{scanned === 1 ? "" : "s"}
      </span>
      <span className="text-white/30">·</span>
      <span data-testid="audio-stats-bytes">
        <b className="text-white">{formatBytes(bytes)}</b> on disk
      </span>
      <span className="text-white/30">·</span>
      <span>
        <b className="text-white">{referenced.toLocaleString()}</b> in use
      </span>
      <span className="text-white/30">·</span>
      <span style={{ color: orphanColor }}>
        <b style={{ color: orphanColor }}>{orphaned.toLocaleString()}</b> orphaned
      </span>
      {loading && <Loader2 className="w-3 h-3 animate-spin text-white/40" />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Cleanup result panel
// ---------------------------------------------------------------------------
interface CleanupResultPanelProps {
  result: {
    message: string;
    summary: { scanned: number; referenced: number; deleted: number; failed: number; bytesFreed: number; errors: Array<{ hash: string; message: string }> };
  };
  onDismiss: () => void;
}

function CleanupResultPanel({ result, onDismiss }: CleanupResultPanelProps) {
  const { summary, message } = result;
  const hasFailures = summary.failed > 0;
  // Always surface the freed total when a delete actually happened, even
  // if `bytesFreed` is 0 — that pathological case (storage listing was
  // missing every orphan's size metadata) is real and admins still want
  // to see "freed 0 B" rather than silently dropping the line, since the
  // alternative looks like a regression vs. the task's promise. We do
  // suppress it for the "0 deleted" no-op runs because the message and
  // stats already make the no-op obvious.
  const showFreed = summary.deleted > 0;
  const accent = hasFailures ? "#f87171" : GREEN;
  const tint = hasFailures ? "rgba(239,68,68,0.08)" : "rgba(29,185,84,0.08)";
  const border = hasFailures ? "rgba(239,68,68,0.3)" : "rgba(29,185,84,0.3)";
  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: tint, border: `1px solid ${border}` }}
      data-testid="cleanup-result-panel"
    >
      <div className="flex items-start gap-3 px-4 py-3">
        {hasFailures ? (
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" style={{ color: accent }} />
        ) : (
          <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" style={{ color: accent }} />
        )}
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold" style={{ color: accent }}>
            {message}
          </div>
          <div className="mt-1 text-xs text-white/60 flex flex-wrap gap-x-3 gap-y-1">
            <span><b className="text-white">{summary.scanned}</b> scanned</span>
            <span><b className="text-white">{summary.referenced}</b> still in use</span>
            <span><b className="text-white">{summary.deleted}</b> deleted</span>
            {showFreed && (
              <span data-testid="cleanup-bytes-freed">
                freed <b className="text-white">{formatBytes(summary.bytesFreed)}</b>
              </span>
            )}
            {hasFailures && (
              <span style={{ color: "#f87171" }}>
                <b style={{ color: "#f87171" }}>{summary.failed}</b> failed
              </span>
            )}
          </div>
          {hasFailures && summary.errors.length > 0 && (
            <ul className="mt-2 space-y-0.5">
              {summary.errors.slice(0, 8).map((e, i) => (
                <li
                  key={i}
                  className="text-[11px] text-red-300/90 font-mono break-words"
                >
                  {e.hash}: {e.message}
                </li>
              ))}
              {summary.errors.length > 8 && (
                <li className="text-[11px] text-white/40">
                  …and {summary.errors.length - 8} more
                </li>
              )}
            </ul>
          )}
        </div>
        <button
          onClick={onDismiss}
          className="p-1 rounded-lg text-white/40 hover:bg-white/10 transition-colors"
          title="Dismiss"
          aria-label="Dismiss cleanup result"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Live progress panel (rendered while priming is in flight)
// ---------------------------------------------------------------------------
function PrimeProgressPanel({
  progress,
  onCancel,
  cancelling,
}: {
  progress: PrimeLiveProgress;
  onCancel: () => void;
  cancelling: boolean;
}) {
  const { testsTotal, testsCompleted, segmentsUploaded, segmentsSkipped, segmentsFailed, currentTest, perTest } = progress;
  const pct = testsTotal > 0 ? Math.min(100, Math.round((testsCompleted / testsTotal) * 100)) : 0;
  const failures = perTest.filter((t) => t.failed > 0);
  // Show most recently active tests at the top so admins can see fresh
  // failures the moment they happen without scrolling.
  const recent = perTest.slice().reverse().slice(0, 6);

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: "rgba(245,197,24,0.08)", border: "1px solid rgba(245,197,24,0.3)" }}
      data-testid="prime-progress-panel"
    >
      <div className="px-4 py-3">
        <div className="flex items-center gap-3">
          <Loader2 className="w-4 h-4 shrink-0 animate-spin" style={{ color: YELLOW }} />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold" style={{ color: YELLOW }}>
              {cancelling ? "Cancelling…" : "Priming audio…"}{" "}
              <span className="text-white">{testsCompleted}</span>
              <span className="text-white/60"> / </span>
              <span className="text-white">{testsTotal || "?"}</span>
              <span className="text-white/60"> tests done</span>
            </div>
            {currentTest ? (
              <div className="mt-0.5 text-xs text-white/70 truncate">
                Working on <b className="text-white">{currentTest.title}</b>{" "}
                <span className="text-white/50">
                  ({currentTest.uploaded + currentTest.skipped + currentTest.failed}/{currentTest.segmentCount} segments)
                </span>
              </div>
            ) : (
              <div className="mt-0.5 text-xs text-white/50">
                {cancelling ? "Stopping after the current segment finishes…" : "Loading test list…"}
              </div>
            )}
            <div className="mt-2 h-1.5 w-full rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
              <div
                className="h-full transition-all"
                style={{ width: `${pct}%`, background: YELLOW }}
              />
            </div>
            <div className="mt-2 text-xs text-white/60 flex flex-wrap gap-x-3 gap-y-1">
              <span><b className="text-white">{segmentsUploaded}</b> uploaded</span>
              <span><b className="text-white">{segmentsSkipped}</b> cached</span>
              <span style={segmentsFailed > 0 ? { color: "#f87171" } : undefined}>
                <b style={segmentsFailed > 0 ? { color: "#f87171" } : { color: "white" }}>{segmentsFailed}</b> failed
              </span>
            </div>
          </div>
          <button
            onClick={onCancel}
            disabled={cancelling}
            className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-60"
            style={{
              background: "rgba(239,68,68,0.12)",
              color: "#f87171",
              border: "1px solid rgba(239,68,68,0.35)",
            }}
            data-testid="cancel-prime-button"
            title="Stop priming after the current segment finishes"
          >
            {cancelling ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Square className="w-3.5 h-3.5" />
            )}
            {cancelling ? "Cancelling" : "Cancel"}
          </button>
        </div>
      </div>

      {(failures.length > 0 || recent.length > 0) && (
        <div className="border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          <div className="max-h-56 overflow-y-auto divide-y" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
            {failures.map((t) => (
              <div key={`f-${t.testId}`} className="px-4 py-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" style={{ color: "#f87171" }} />
                  <span className="text-xs font-bold text-white truncate">{t.title}</span>
                  <span
                    className="text-[10px] px-1.5 py-0.5 rounded-full font-mono"
                    style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.6)" }}
                  >
                    {t.testId}
                  </span>
                  <span className="ml-auto text-[11px]" style={{ color: "#f87171" }}>
                    {t.failed} failed / {t.segmentCount}
                  </span>
                </div>
                {t.errors.length > 0 && (
                  <ul className="mt-1 ml-5 space-y-0.5">
                    {t.errors.slice(0, 3).map((e, i) => (
                      <li key={i} className="text-[11px] text-red-300/90 font-mono break-words">
                        segment #{e.index + 1}: {e.message}
                      </li>
                    ))}
                    {t.errors.length > 3 && (
                      <li className="text-[11px] text-red-300/70">…and {t.errors.length - 3} more</li>
                    )}
                  </ul>
                )}
              </div>
            ))}
            {recent
              .filter((t) => t.failed === 0)
              .map((t) => (
                <div key={`r-${t.testId}`} className="px-4 py-2 flex items-center gap-2 flex-wrap">
                  {t.done ? (
                    <CheckCircle className="w-3.5 h-3.5 shrink-0" style={{ color: GREEN }} />
                  ) : (
                    <Loader2 className="w-3.5 h-3.5 shrink-0 animate-spin" style={{ color: TEAL }} />
                  )}
                  <span className="text-xs text-white/80 truncate">{t.title}</span>
                  <span className="ml-auto text-[11px] text-white/50">
                    {t.uploaded > 0 && <span style={{ color: TEAL }}>+{t.uploaded} new </span>}
                    {t.skipped > 0 && <span className="text-white/40">{t.skipped} cached </span>}
                    <span className="text-white/30">/ {t.segmentCount}</span>
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
