import { useCallback, useEffect, useState } from "react";
import {
  Loader2, Plus, Trash2, Save, ArrowLeft, Pencil, BookOpen,
  AlertCircle, CheckCircle, X, ChevronDown, ChevronRight,
} from "lucide-react";

const BASE_URL = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";
const TEAL = "#6B2FE6";
const GREEN = "#1DB954";
const YELLOW = "#F5C518";
const NAVY = "#1E2155";

type ReadingLevel = "a2" | "b1";
type ReadingType =
  | "skimming"
  | "scanning"
  | "mcq"
  | "tfng"
  | "ynng"
  | "matching_headings"
  | "matching_features"
  | "sentence_completion"
  | "note_completion"
  | "table_completion"
  | "flow_chart_completion"
  | "short_answer";

interface SubQuestion {
  id: string;
  prompt: string;
  mcqOptions?: string[];
}

interface AnswerEntry {
  value: string | number;
  acceptable?: string[];
  explanation: string;
}

interface ReadingItemRow {
  id: number;
  slug: string;
  level: ReadingLevel;
  type: ReadingType;
  sortOrder: number;
  title: string;
  instructions: string;
  passage: string;
  paragraphs: { label: string; text: string }[];
  options: string[];
  questions: SubQuestion[];
  answerKey: Record<string, AnswerEntry>;
  createdAt?: string;
  updatedAt?: string;
}

interface ReadingItemSummary {
  id: number;
  slug: string;
  level: ReadingLevel;
  type: ReadingType;
  title: string;
  sortOrder: number;
  questionCount: number;
  createdAt: string;
  updatedAt: string;
}

interface ReadingTypeMeta {
  id: ReadingType;
  label: string;
  tagline: string;
}

const LEVELS: { id: ReadingLevel; label: string }[] = [
  { id: "a2", label: "A2 — Elementary" },
  { id: "b1", label: "B1 — Intermediate" },
];

// Default instructions matching `INSTR` in api-server/src/reading/itemBank.ts.
const DEFAULT_INSTRUCTIONS: Record<ReadingType, string> = {
  skimming:
    "Skim the passage quickly. Choose the answer A, B, C or D that best describes the main idea, topic or purpose.",
  scanning:
    "Scan the passage to find specific facts. For each question, choose the answer A, B, C or D that matches the information in the text.",
  mcq: "Choose the correct answer A, B or C.",
  tfng:
    "Do the following statements agree with the information in the text? Choose TRUE if the statement agrees, FALSE if it contradicts, or NOT GIVEN if there is no information.",
  ynng:
    "Do the following statements agree with the views of the writer? Choose YES if it agrees with the writer, NO if it contradicts the writer, or NOT GIVEN if it is impossible to say what the writer thinks.",
  matching_headings:
    "Choose the correct heading for each paragraph from the list below. Each heading is used only once.",
  matching_features: "Match each statement to the correct item from the text.",
  sentence_completion:
    "Complete the summary below. Choose ONE WORD ONLY from the text for each answer.",
  note_completion:
    "Complete the notes below. Choose NO MORE THAN TWO WORDS AND/OR A NUMBER from the text for each answer.",
  table_completion:
    "Complete the table below. Choose ONE WORD AND/OR A NUMBER from the text for each answer.",
  flow_chart_completion:
    "Complete the flow chart below. Choose NO MORE THAN TWO WORDS from the text for each answer.",
  short_answer:
    "Answer the questions below. Choose NO MORE THAN THREE WORDS AND/OR A NUMBER from the text for each answer.",
};

function emptyAnswerForType(type: ReadingType): AnswerEntry {
  if (
    type === "mcq" ||
    type === "skimming" ||
    type === "scanning" ||
    type === "matching_headings" ||
    type === "matching_features"
  ) {
    return { value: 0, explanation: "" };
  }
  if (type === "tfng") return { value: "true", explanation: "" };
  if (type === "ynng") return { value: "yes", explanation: "" };
  return { value: "", acceptable: [], explanation: "" };
}

function emptyQuestion(id: string, type: ReadingType): SubQuestion {
  if (type === "mcq") return { id, prompt: "", mcqOptions: ["", "", ""] };
  if (type === "skimming" || type === "scanning") {
    return { id, prompt: "", mcqOptions: ["", "", "", ""] };
  }
  return { id, prompt: "" };
}

function nextQuestionId(existing: SubQuestion[]): string {
  let n = existing.length + 1;
  const used = new Set(existing.map((q) => q.id));
  while (used.has(`q${n}`)) n += 1;
  return `q${n}`;
}

function emptyItem(level: ReadingLevel, type: ReadingType): ReadingItemRow {
  const q1 = emptyQuestion("q1", type);
  return {
    id: 0,
    slug: "",
    level,
    type,
    sortOrder: 0,
    title: "",
    instructions: DEFAULT_INSTRUCTIONS[type],
    passage: "",
    paragraphs: type === "matching_headings" ? [{ label: "A", text: "" }] : [],
    options:
      type === "matching_headings" || type === "matching_features" ? ["", ""] : [],
    questions: [q1],
    answerKey: { q1: emptyAnswerForType(type) },
  };
}

interface Props {
  onLogout: () => Promise<void> | void;
}

export default function AdminReadingItems(_props: Props) {
  const [items, setItems] = useState<ReadingItemSummary[]>([]);
  const [types, setTypes] = useState<ReadingTypeMeta[]>([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<ReadingItemRow | null>(null);
  const [editingExisting, setEditingExisting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [openLevel, setOpenLevel] = useState<Record<string, boolean>>({ a2: true, b1: true });

  const fetchItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${BASE_URL}/api-intro/reading/admin/items`, {
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to load items");
        return;
      }
      setItems(data.items || []);
      setTypes(data.types || []);
    } catch {
      setError("Connection error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const openEditor = async (slug: string) => {
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      const res = await fetch(
        `${BASE_URL}/api-intro/reading/admin/items/${encodeURIComponent(slug)}`,
        { credentials: "include" },
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to load item");
        return;
      }
      const it = data.item as ReadingItemRow;
      // Defensive: server may return paragraphs/options as null/undefined
      // from old rows; normalise to arrays before they hit the form.
      setEditing({
        ...it,
        paragraphs: it.paragraphs ?? [],
        options: it.options ?? [],
        answerKey: it.answerKey ?? {},
      });
      setEditingExisting(true);
    } catch {
      setError("Connection error");
    } finally {
      setLoading(false);
    }
  };

  const startNewItem = (level: ReadingLevel, type: ReadingType) => {
    setError(null);
    setSuccess(null);
    setEditing(emptyItem(level, type));
    setEditingExisting(false);
  };

  const cancelEdit = () => {
    setEditing(null);
    setEditingExisting(false);
    setError(null);
    setSuccess(null);
  };

  const saveEdit = async () => {
    if (!editing) return;
    setError(null);
    setSuccess(null);
    setSaving(true);
    try {
      const url = editingExisting
        ? `${BASE_URL}/api-intro/reading/admin/items/${encodeURIComponent(editing.slug)}`
        : `${BASE_URL}/api-intro/reading/admin/items`;
      const method = editingExisting ? "PUT" : "POST";
      const body = {
        slug: editing.slug,
        level: editing.level,
        type: editing.type,
        title: editing.title,
        instructions: editing.instructions,
        passage: editing.passage,
        paragraphs: editing.paragraphs,
        options: editing.options,
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
      setSuccess(editingExisting ? "Item updated" : "Item created");
      await fetchItems();
      setEditingExisting(true);
      if (data.item) {
        const it = data.item as ReadingItemRow;
        setEditing({
          ...it,
          paragraphs: it.paragraphs ?? [],
          options: it.options ?? [],
          answerKey: it.answerKey ?? {},
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
    if (!confirm(`Delete item "${editing.title}"? This cannot be undone.`)) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(
        `${BASE_URL}/api-intro/reading/admin/items/${encodeURIComponent(editing.slug)}`,
        { method: "DELETE", credentials: "include" },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error || "Delete failed");
        return;
      }
      cancelEdit();
      setSuccess("Item deleted");
      await fetchItems();
    } catch {
      setError("Connection error");
    } finally {
      setSaving(false);
    }
  };

  if (editing) {
    return (
      <ReadingItemEditor
        editing={editing}
        editingExisting={editingExisting}
        types={types}
        saving={saving}
        error={error}
        success={success}
        onCancel={cancelEdit}
        onSave={saveEdit}
        onDelete={deleteCurrent}
        onChange={setEditing}
        onClearMessages={() => { setError(null); setSuccess(null); }}
      />
    );
  }

  // List view: grouped by level, then type.
  const typeLabel = (t: ReadingType) =>
    types.find((x) => x.id === t)?.label ?? t;

  const itemsByBucket: Record<string, ReadingItemSummary[]> = {};
  for (const it of items) {
    const key = `${it.level}:${it.type}`;
    (itemsByBucket[key] ||= []).push(it);
  }

  return (
    <div className="space-y-4">
      {(error || success) && (
        <div
          className="flex items-start gap-2 px-4 py-3 rounded-2xl text-sm"
          style={
            error
              ? { background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)" }
              : { background: "rgba(29,185,84,0.1)", border: "1px solid rgba(29,185,84,0.3)" }
          }
        >
          {error ? (
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          ) : (
            <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" style={{ color: GREEN }} />
          )}
          <span className={error ? "text-red-300" : "text-green-300"}>{error || success}</span>
          <button
            onClick={() => { setError(null); setSuccess(null); }}
            className="ml-auto text-white/40 hover:text-white/70"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="flex items-center gap-2">
        <BookOpen className="w-4 h-4" style={{ color: TEAL }} />
        <h3 className="font-bold text-white text-sm">Reading items ({items.length})</h3>
        {loading && <Loader2 className="w-3.5 h-3.5 animate-spin text-white/40" />}
      </div>

      {LEVELS.map((lvl) => {
        const isOpen = openLevel[lvl.id] ?? true;
        const totalForLevel = items.filter((i) => i.level === lvl.id).length;
        return (
          <div
            key={lvl.id}
            className="rounded-2xl overflow-hidden"
            style={{ border: "1px solid rgba(255,255,255,0.1)" }}
          >
            <button
              onClick={() => setOpenLevel((s) => ({ ...s, [lvl.id]: !isOpen }))}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/5"
              style={{ background: "rgba(255,255,255,0.04)" }}
            >
              <div className="flex items-center gap-2">
                {isOpen ? <ChevronDown className="w-4 h-4 text-white/50" /> : <ChevronRight className="w-4 h-4 text-white/50" />}
                <span className="text-sm font-bold text-white">{lvl.label}</span>
                <span className="text-xs text-white/40">({totalForLevel} items)</span>
              </div>
            </button>
            {isOpen && (
              <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                {types.map((t) => {
                  const bucket = itemsByBucket[`${lvl.id}:${t.id}`] ?? [];
                  return (
                    <div key={t.id} className="px-4 py-3" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold uppercase tracking-wider" style={{ color: TEAL }}>{t.label}</span>
                          <span className="text-[10px] text-white/40">{bucket.length} items</span>
                        </div>
                        <button
                          onClick={() => startNewItem(lvl.id, t.id)}
                          className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold transition-all hover:opacity-90"
                          style={{ background: `rgba(107,47,230,0.15)`, color: TEAL, border: `1px solid rgba(107,47,230,0.35)` }}
                        >
                          <Plus className="w-3 h-3" />
                          New
                        </button>
                      </div>
                      {bucket.length === 0 ? (
                        <div className="text-xs text-white/30 italic px-1 py-2">No items yet</div>
                      ) : (
                        <div className="space-y-1.5">
                          {bucket.map((it) => (
                            <button
                              key={it.slug}
                              onClick={() => openEditor(it.slug)}
                              className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-left transition-all hover:bg-white/5"
                              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}
                            >
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-semibold text-white truncate">{it.title || "(untitled)"}</div>
                                <div className="text-[11px] text-white/40 truncate">
                                  {it.slug} · {it.questionCount} {it.questionCount === 1 ? "question" : "questions"}
                                </div>
                              </div>
                              <Pencil className="w-3.5 h-3.5 text-white/40 shrink-0" />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Editor
// ---------------------------------------------------------------------------

interface EditorProps {
  editing: ReadingItemRow;
  editingExisting: boolean;
  types: ReadingTypeMeta[];
  saving: boolean;
  error: string | null;
  success: string | null;
  onCancel: () => void;
  onSave: () => Promise<void> | void;
  onDelete: () => Promise<void> | void;
  onChange: (next: ReadingItemRow) => void;
  onClearMessages: () => void;
}

function ReadingItemEditor({
  editing, editingExisting, types, saving, error, success,
  onCancel, onSave, onDelete, onChange, onClearMessages,
}: EditorProps) {
  const setField = <K extends keyof ReadingItemRow>(k: K, v: ReadingItemRow[K]) => {
    onChange({ ...editing, [k]: v });
  };

  const changeType = (newType: ReadingType) => {
    // Reset answer-key shape to match the new type so we never persist a
    // stale answer (e.g. an mcq index when the type became tfng).
    const ak: Record<string, AnswerEntry> = {};
    for (const q of editing.questions) ak[q.id] = emptyAnswerForType(newType);
    const questions: SubQuestion[] = editing.questions.map((q) => {
      if (newType === "mcq") {
        return { id: q.id, prompt: q.prompt, mcqOptions: q.mcqOptions ?? ["", "", ""] };
      }
      if (newType === "skimming" || newType === "scanning") {
        return { id: q.id, prompt: q.prompt, mcqOptions: q.mcqOptions ?? ["", "", "", ""] };
      }
      return { id: q.id, prompt: q.prompt };
    });
    onChange({
      ...editing,
      type: newType,
      instructions: editing.instructions || DEFAULT_INSTRUCTIONS[newType],
      paragraphs:
        newType === "matching_headings"
          ? editing.paragraphs.length > 0
            ? editing.paragraphs
            : [{ label: "A", text: "" }]
          : editing.paragraphs,
      options:
        newType === "matching_headings" || newType === "matching_features"
          ? editing.options.length > 0
            ? editing.options
            : ["", ""]
          : [],
      questions,
      answerKey: ak,
    });
  };

  const addQuestion = () => {
    const id = nextQuestionId(editing.questions);
    const newQ = emptyQuestion(id, editing.type);
    onChange({
      ...editing,
      questions: [...editing.questions, newQ],
      answerKey: { ...editing.answerKey, [id]: emptyAnswerForType(editing.type) },
    });
  };

  const removeQuestion = (qid: string) => {
    if (editing.questions.length <= 1) return;
    const ak = { ...editing.answerKey };
    delete ak[qid];
    onChange({
      ...editing,
      questions: editing.questions.filter((q) => q.id !== qid),
      answerKey: ak,
    });
  };

  const updateQuestion = (qid: string, patch: Partial<SubQuestion>) => {
    onChange({
      ...editing,
      questions: editing.questions.map((q) => (q.id === qid ? { ...q, ...patch } : q)),
    });
  };

  const updateAnswer = (qid: string, patch: Partial<AnswerEntry>) => {
    const cur = editing.answerKey[qid] ?? emptyAnswerForType(editing.type);
    onChange({
      ...editing,
      answerKey: { ...editing.answerKey, [qid]: { ...cur, ...patch } },
    });
  };

  const showOptions =
    editing.type === "matching_headings" || editing.type === "matching_features";
  const showParagraphs = editing.type === "matching_headings";
  const isCompletion =
    editing.type === "sentence_completion" ||
    editing.type === "note_completion" ||
    editing.type === "table_completion" ||
    editing.type === "flow_chart_completion" ||
    editing.type === "short_answer";

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button
          onClick={onCancel}
          className="text-white/40 hover:text-white/70 transition-colors"
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="text-base font-bold text-white">
          {editingExisting ? "Edit reading item" : "New reading item"}
        </h2>
      </div>

      {(error || success) && (
        <div
          className="flex items-start gap-2 px-4 py-3 rounded-2xl text-sm"
          style={
            error
              ? { background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)" }
              : { background: "rgba(29,185,84,0.1)", border: "1px solid rgba(29,185,84,0.3)" }
          }
        >
          {error ? (
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          ) : (
            <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" style={{ color: GREEN }} />
          )}
          <span className={error ? "text-red-300" : "text-green-300"}>{error || success}</span>
          <button
            onClick={onClearMessages}
            className="ml-auto text-white/40 hover:text-white/70"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <Field label="Slug">
        <input
          type="text"
          value={editing.slug}
          disabled={editingExisting}
          onChange={(e) => setField("slug", e.target.value.toLowerCase())}
          placeholder="e.g. a2-mcq-6"
          className="w-full rounded-xl px-3 py-2 text-sm text-white placeholder-white/30 outline-none disabled:opacity-50"
          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)" }}
        />
        <p className="text-[11px] text-white/40 mt-1">
          Lowercase letters, numbers and hyphens only. Cannot be changed after creation.
        </p>
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Level">
          <select
            value={editing.level}
            onChange={(e) => setField("level", e.target.value as ReadingLevel)}
            className="w-full rounded-xl px-3 py-2 text-sm text-white outline-none"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)" }}
          >
            {LEVELS.map((l) => <option key={l.id} value={l.id} className="bg-slate-800">{l.label}</option>)}
          </select>
        </Field>
        <Field label="Question type">
          <select
            value={editing.type}
            onChange={(e) => changeType(e.target.value as ReadingType)}
            className="w-full rounded-xl px-3 py-2 text-sm text-white outline-none"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)" }}
          >
            {types.map((t) => <option key={t.id} value={t.id} className="bg-slate-800">{t.label}</option>)}
          </select>
        </Field>
      </div>

      <Field label="Title">
        <input
          type="text"
          value={editing.title}
          onChange={(e) => setField("title", e.target.value)}
          placeholder="Short title for this passage"
          className="w-full rounded-xl px-3 py-2 text-sm text-white placeholder-white/30 outline-none"
          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)" }}
        />
      </Field>

      <Field label="Instructions">
        <textarea
          value={editing.instructions}
          onChange={(e) => setField("instructions", e.target.value)}
          rows={2}
          className="w-full rounded-xl px-3 py-2 text-sm text-white placeholder-white/30 outline-none"
          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)" }}
        />
      </Field>

      <Field label="Passage">
        <textarea
          value={editing.passage}
          onChange={(e) => setField("passage", e.target.value)}
          rows={8}
          placeholder="Paste the reading text here"
          className="w-full rounded-xl px-3 py-2 text-sm text-white placeholder-white/30 outline-none font-mono"
          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)" }}
        />
      </Field>

      {showParagraphs && (
        <ParagraphList
          paragraphs={editing.paragraphs}
          onChange={(paragraphs) => setField("paragraphs", paragraphs)}
        />
      )}

      {showOptions && (
        <StringList
          label={editing.type === "matching_headings" ? "Headings (options)" : "Items / options"}
          values={editing.options}
          onChange={(options) => setField("options", options)}
          placeholder="Enter an option"
        />
      )}

      <div className="rounded-2xl p-3 space-y-3" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)" }}>
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-bold text-white">Sub-questions ({editing.questions.length})</h4>
          <button
            onClick={addQuestion}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold transition-all hover:opacity-90"
            style={{ background: `rgba(107,47,230,0.15)`, color: TEAL, border: `1px solid rgba(107,47,230,0.35)` }}
          >
            <Plus className="w-3 h-3" /> Add question
          </button>
        </div>

        {editing.questions.map((q, idx) => {
          const ak = editing.answerKey[q.id] ?? emptyAnswerForType(editing.type);
          return (
            <div
              key={q.id}
              className="rounded-xl p-3 space-y-3"
              style={{ background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.08)" }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                    style={{ background: "rgba(107,47,230,0.15)", color: TEAL }}
                  >
                    {q.id}
                  </span>
                  <span className="text-[11px] text-white/40">Question {idx + 1}</span>
                </div>
                {editing.questions.length > 1 && (
                  <button
                    onClick={() => removeQuestion(q.id)}
                    className="text-white/40 hover:text-red-400 transition-colors"
                    aria-label="Remove question"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              <Field label="Prompt">
                <input
                  type="text"
                  value={q.prompt}
                  onChange={(e) => updateQuestion(q.id, { prompt: e.target.value })}
                  className="w-full rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 outline-none"
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)" }}
                />
              </Field>

              {(editing.type === "mcq" || editing.type === "skimming") && (
                <McqOptionsEditor
                  options={q.mcqOptions ?? []}
                  selectedIndex={typeof ak.value === "number" ? ak.value : Number(ak.value) || 0}
                  onChangeOptions={(mcqOptions) => updateQuestion(q.id, { mcqOptions })}
                  onSelectIndex={(value) => updateAnswer(q.id, { value })}
                />
              )}

              {/* Scanning is polymorphic per question:
                   - If q.mcqOptions exists (A2 scanning), render the MCQ editor.
                   - If q.mcqOptions is absent (B1 scanning fill-in-the-blank),
                     render the canonical-answer + acceptable[] editor below. */}
              {editing.type === "scanning" && q.mcqOptions && q.mcqOptions.length > 0 && (
                <McqOptionsEditor
                  options={q.mcqOptions}
                  selectedIndex={typeof ak.value === "number" ? ak.value : Number(ak.value) || 0}
                  onChangeOptions={(mcqOptions) => updateQuestion(q.id, { mcqOptions })}
                  onSelectIndex={(value) => updateAnswer(q.id, { value })}
                />
              )}

              {(editing.type === "matching_headings" || editing.type === "matching_features") && (
                <Field label="Correct option">
                  <select
                    value={typeof ak.value === "number" ? ak.value : Number(ak.value) || 0}
                    onChange={(e) => updateAnswer(q.id, { value: Number(e.target.value) })}
                    className="w-full rounded-lg px-3 py-2 text-sm text-white outline-none"
                    style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)" }}
                  >
                    {editing.options.map((opt, i) => (
                      <option key={i} value={i} className="bg-slate-800">{i + 1}. {opt || "(empty)"}</option>
                    ))}
                  </select>
                </Field>
              )}

              {editing.type === "tfng" && (
                <Field label="Correct answer">
                  <select
                    value={String(ak.value)}
                    onChange={(e) => updateAnswer(q.id, { value: e.target.value })}
                    className="w-full rounded-lg px-3 py-2 text-sm text-white outline-none"
                    style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)" }}
                  >
                    <option value="true" className="bg-slate-800">TRUE</option>
                    <option value="false" className="bg-slate-800">FALSE</option>
                    <option value="ng" className="bg-slate-800">NOT GIVEN</option>
                  </select>
                </Field>
              )}

              {editing.type === "ynng" && (
                <Field label="Correct answer">
                  <select
                    value={String(ak.value)}
                    onChange={(e) => updateAnswer(q.id, { value: e.target.value })}
                    className="w-full rounded-lg px-3 py-2 text-sm text-white outline-none"
                    style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)" }}
                  >
                    <option value="yes" className="bg-slate-800">YES</option>
                    <option value="no" className="bg-slate-800">NO</option>
                    <option value="ng" className="bg-slate-800">NOT GIVEN</option>
                  </select>
                </Field>
              )}

              {(isCompletion ||
                (editing.type === "scanning" &&
                  (!q.mcqOptions || q.mcqOptions.length === 0))) && (
                <>
                  <Field label="Canonical answer">
                    <input
                      type="text"
                      value={String(ak.value ?? "")}
                      onChange={(e) => updateAnswer(q.id, { value: e.target.value })}
                      placeholder="The exact word/phrase from the text"
                      className="w-full rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 outline-none"
                      style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)" }}
                    />
                  </Field>
                  <StringList
                    label="Acceptable alternatives (optional)"
                    values={ak.acceptable ?? []}
                    onChange={(acceptable) => updateAnswer(q.id, { acceptable })}
                    placeholder="Alternative spelling or phrasing"
                    compact
                  />
                </>
              )}

              <Field label="Explanation">
                <textarea
                  value={ak.explanation}
                  onChange={(e) => updateAnswer(q.id, { explanation: e.target.value })}
                  rows={2}
                  placeholder="Quote or paraphrase from the passage that justifies the answer"
                  className="w-full rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 outline-none"
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)" }}
                />
              </Field>
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-2 pt-2">
        <button
          onClick={onSave}
          disabled={saving}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-sm transition-all hover:opacity-90 disabled:opacity-50"
          style={{ background: `linear-gradient(135deg, ${TEAL}, #8B5FF6)`, color: NAVY }}
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {editingExisting ? "Save changes" : "Create item"}
        </button>
        {editingExisting && (
          <button
            onClick={onDelete}
            disabled={saving}
            className="px-4 py-3 rounded-2xl font-bold text-sm transition-all hover:opacity-90 disabled:opacity-50"
            style={{ background: "rgba(239,68,68,0.15)", color: "#f87171", border: "1px solid rgba(239,68,68,0.3)" }}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
        <button
          onClick={onCancel}
          disabled={saving}
          className="px-4 py-3 rounded-2xl text-sm font-semibold text-white/60 hover:bg-white/5 transition-colors disabled:opacity-50"
          style={{ border: "1px solid rgba(255,255,255,0.15)" }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11px] font-semibold text-white/50 mb-1 uppercase tracking-wider">
        {label}
      </label>
      {children}
    </div>
  );
}

function McqOptionsEditor({
  options, selectedIndex, onChangeOptions, onSelectIndex,
}: {
  options: string[];
  selectedIndex: number;
  onChangeOptions: (next: string[]) => void;
  onSelectIndex: (i: number) => void;
}) {
  const setOption = (i: number, v: string) => {
    const next = [...options];
    next[i] = v;
    onChangeOptions(next);
  };
  const addOption = () => onChangeOptions([...options, ""]);
  const removeOption = (i: number) => {
    if (options.length <= 2) return;
    const next = options.filter((_, idx) => idx !== i);
    // If we removed the selected index or anything before it, shift selection.
    if (selectedIndex === i) onSelectIndex(0);
    else if (selectedIndex > i) onSelectIndex(selectedIndex - 1);
    onChangeOptions(next);
  };
  return (
    <Field label="Options (click radio to mark the correct one)">
      <div className="space-y-1.5">
        {options.map((opt, i) => (
          <div key={i} className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onSelectIndex(i)}
              className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
              style={{
                background: selectedIndex === i ? GREEN : "rgba(255,255,255,0.08)",
                border: `1px solid ${selectedIndex === i ? GREEN : "rgba(255,255,255,0.2)"}`,
              }}
              aria-label={`Mark option ${i + 1} as correct`}
            >
              {selectedIndex === i && <CheckCircle className="w-3 h-3" style={{ color: NAVY }} />}
            </button>
            <input
              type="text"
              value={opt}
              onChange={(e) => setOption(i, e.target.value)}
              placeholder={`Option ${String.fromCharCode(65 + i)}`}
              className="flex-1 rounded-lg px-3 py-1.5 text-sm text-white placeholder-white/30 outline-none"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)" }}
            />
            <button
              type="button"
              onClick={() => removeOption(i)}
              disabled={options.length <= 2}
              className="text-white/40 hover:text-red-400 disabled:opacity-30 disabled:cursor-not-allowed"
              aria-label="Remove option"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={addOption}
          className="flex items-center gap-1 text-xs font-bold transition-opacity hover:opacity-80"
          style={{ color: TEAL }}
        >
          <Plus className="w-3 h-3" /> Add option
        </button>
      </div>
    </Field>
  );
}

function StringList({
  label, values, onChange, placeholder, compact,
}: {
  label: string;
  values: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  compact?: boolean;
}) {
  const setItem = (i: number, v: string) => {
    const next = [...values];
    next[i] = v;
    onChange(next);
  };
  const removeItem = (i: number) => onChange(values.filter((_, idx) => idx !== i));
  const addItem = () => onChange([...values, ""]);
  return (
    <Field label={label}>
      <div className={compact ? "space-y-1" : "space-y-1.5"}>
        {values.map((v, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-white/40 w-6 text-right">{i + 1}.</span>
            <input
              type="text"
              value={v}
              onChange={(e) => setItem(i, e.target.value)}
              placeholder={placeholder}
              className="flex-1 rounded-lg px-3 py-1.5 text-sm text-white placeholder-white/30 outline-none"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)" }}
            />
            <button
              type="button"
              onClick={() => removeItem(i)}
              className="text-white/40 hover:text-red-400"
              aria-label="Remove"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={addItem}
          className="flex items-center gap-1 text-xs font-bold transition-opacity hover:opacity-80"
          style={{ color: TEAL }}
        >
          <Plus className="w-3 h-3" /> Add
        </button>
      </div>
    </Field>
  );
}

function ParagraphList({
  paragraphs, onChange,
}: {
  paragraphs: { label: string; text: string }[];
  onChange: (next: { label: string; text: string }[]) => void;
}) {
  const setItem = (i: number, patch: Partial<{ label: string; text: string }>) => {
    const next = [...paragraphs];
    next[i] = { ...next[i], ...patch };
    onChange(next);
  };
  const removeItem = (i: number) => onChange(paragraphs.filter((_, idx) => idx !== i));
  const addItem = () => {
    const nextLabel = String.fromCharCode(65 + paragraphs.length);
    onChange([...paragraphs, { label: nextLabel, text: "" }]);
  };
  return (
    <Field label="Paragraphs (each labelled A, B, C…)">
      <div className="space-y-2">
        {paragraphs.map((p, i) => (
          <div
            key={i}
            className="rounded-xl p-2.5 space-y-2"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={p.label}
                onChange={(e) => setItem(i, { label: e.target.value })}
                placeholder="A"
                className="w-12 rounded-md px-2 py-1 text-xs font-bold text-white text-center outline-none"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)" }}
              />
              <span className="text-[11px] text-white/40">Paragraph {i + 1}</span>
              <button
                type="button"
                onClick={() => removeItem(i)}
                className="ml-auto text-white/40 hover:text-red-400"
                aria-label="Remove paragraph"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
            <textarea
              value={p.text}
              onChange={(e) => setItem(i, { text: e.target.value })}
              rows={3}
              placeholder="Paragraph text"
              className="w-full rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 outline-none"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)" }}
            />
          </div>
        ))}
        <button
          type="button"
          onClick={addItem}
          className="flex items-center gap-1 text-xs font-bold transition-opacity hover:opacity-80"
          style={{ color: YELLOW }}
        >
          <Plus className="w-3 h-3" /> Add paragraph
        </button>
      </div>
    </Field>
  );
}
