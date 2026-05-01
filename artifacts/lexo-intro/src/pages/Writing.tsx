import { useState, useCallback, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { Loader2, ChevronRight, CheckCircle2, TrendingUp, AlertTriangle, Copy, Check, FileText, ArrowLeft, BookOpen, PenLine, Award, Sparkles, ArrowRightLeft, Link2, GraduationCap, MessageCircle, Target, ChevronDown, ChevronUp, RefreshCw, ClipboardList, Wand2 } from "lucide-react";
import DaysLeftBadge from "../components/DaysLeftBadge";
import FeedbackPopup from "../components/FeedbackPopup";
import { ASSIGNMENTS, getAssignment, type AssignmentCategory } from "../data/assignments";

const BASE_URL = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";
const TEAL = "#6B2FE6";
const NAVY = "#1E2155";
const GOLD = "#F5C518";

interface Props {
  onBack: () => void;
  expiresAt: string | null;
}


function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [text]);
  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:shadow-sm active:scale-95"
      style={{
        background: copied ? "#dcfce7" : "#f8fafc",
        border: `1px solid ${copied ? "#86efac" : "#e2e8f0"}`,
        color: copied ? "#16a34a" : "#475569",
      }}
    >
      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
      {copied ? "Copied!" : label}
    </button>
  );
}

function Popover({ trigger, children }: { trigger: React.ReactNode; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLSpanElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        triggerRef.current?.contains(e.target as Node) ||
        popoverRef.current?.contains(e.target as Node)
      ) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  useEffect(() => {
    if (!open || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    let left = rect.left + rect.width / 2 - 152;
    const top = rect.bottom + window.scrollY + 8;
    if (left < 8) left = 8;
    if (left + 304 > window.innerWidth - 8) left = window.innerWidth - 304 - 8;
    setPos({ top, left });
  }, [open]);

  return (
    <>
      <span
        ref={triggerRef}
        onClick={() => setOpen(!open)}
        className="cursor-pointer"
      >
        {trigger}
      </span>
      {open && createPortal(
        <div
          ref={popoverRef}
          className="bg-white rounded-2xl overflow-hidden text-left text-gray-900"
          style={{
            width: 304,
            top: pos.top,
            left: pos.left,
            position: "absolute",
            zIndex: 9999,
            boxShadow: "0 20px 60px rgba(0,0,0,0.15), 0 4px 16px rgba(0,0,0,0.08)",
            border: "1px solid rgba(0,0,0,0.06)",
          }}
        >
          {children}
        </div>,
        document.body
      )}
    </>
  );
}

function AnnotatedText({ text, analysis }: { text: string; analysis: any }) {
  let annotations: any[] = [];

  analysis.grammarErrors?.forEach((err: any) => {
    annotations.push({ ...err, _type: "grammar", _title: "Grammar Error" });
  });
  analysis.vocabularyUpgrades?.forEach((upg: any) => {
    annotations.push({ ...upg, _type: "vocab", _title: "Vocabulary Upgrade" });
  });
  analysis.coherenceIssues?.forEach((coh: any) => {
    annotations.push({ ...coh, _type: "coherence", _title: "Coherence Issue" });
  });

  annotations.sort((a, b) => (b.original?.length ?? 0) - (a.original?.length ?? 0));

  let segments: { text: string; annotation?: any }[] = [{ text }];

  annotations.forEach((ann) => {
    if (!ann.original) return;
    const next: typeof segments = [];
    segments.forEach((seg) => {
      if (seg.annotation) { next.push(seg); return; }
      const parts = seg.text.split(ann.original);
      for (let i = 0; i < parts.length; i++) {
        if (parts[i]) next.push({ text: parts[i] });
        if (i < parts.length - 1) next.push({ text: ann.original, annotation: ann });
      }
    });
    segments = next;
  });

  const colorMap: Record<string, { bg: string; border: string; hover: string; headerBg: string; headerText: string; dot: string }> = {
    grammar: { bg: "rgba(239,68,68,0.08)", border: "#fca5a5", hover: "rgba(239,68,68,0.15)", headerBg: "#fef2f2", headerText: "#991b1b", dot: "#ef4444" },
    vocab: { bg: "rgba(245,158,11,0.08)", border: "#fcd34d", hover: "rgba(245,158,11,0.15)", headerBg: "#fffbeb", headerText: "#92400e", dot: "#f59e0b" },
    coherence: { bg: "rgba(59,130,246,0.08)", border: "#93c5fd", hover: "rgba(59,130,246,0.15)", headerBg: "#eff6ff", headerText: "#1e40af", dot: "#3b82f6" },
  };

  return (
    <div className="text-[15px] leading-[2.3] whitespace-pre-wrap text-gray-700" style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}>
      {segments.map((seg, i) => {
        if (!seg.annotation) return <span key={i}>{seg.text}</span>;
        const ann = seg.annotation;
        const c = colorMap[ann._type] || colorMap.grammar;
        return (
          <Popover
            key={i}
            trigger={
              <span
                className="px-1 py-0.5 rounded-md transition-all duration-200"
                style={{ background: c.bg, borderBottom: `2px solid ${c.border}`, cursor: "pointer" }}
                onMouseEnter={(e) => { (e.target as HTMLElement).style.background = c.hover; }}
                onMouseLeave={(e) => { (e.target as HTMLElement).style.background = c.bg; }}
              >
                {seg.text}
              </span>
            }
          >
            <div className="px-4 py-2.5 flex items-center gap-2 border-b" style={{ background: c.headerBg }}>
              <span className="w-2 h-2 rounded-full" style={{ background: c.dot }} />
              <span className="font-bold text-xs uppercase tracking-wider" style={{ color: c.headerText }}>{ann._title}</span>
            </div>
            <div className="p-4 space-y-3">
              {ann.correction && (
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Correction</span>
                  <p className="text-sm font-semibold text-emerald-700 mt-0.5 leading-relaxed">{ann.correction}</p>
                </div>
              )}
              {ann.better && (
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Better Alternative</span>
                  <p className="text-sm font-semibold text-emerald-700 mt-0.5 leading-relaxed">{ann.better}</p>
                </div>
              )}
              {(ann.explanation || ann.reason) && (
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Why</span>
                  <p className="text-[13px] text-gray-600 mt-0.5 leading-relaxed">{ann.explanation || ann.reason}</p>
                </div>
              )}
              {ann.example && (
                <div className="pt-3 border-t border-dashed border-gray-200">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Example</span>
                  <p className="text-[13px] italic text-gray-500 mt-0.5">"{ann.example}"</p>
                </div>
              )}
            </div>
          </Popover>
        );
      })}
    </div>
  );
}

function AnnotationLegend() {
  return (
    <div className="flex flex-wrap gap-4 py-3 px-4 rounded-lg" style={{ background: "#f8fafc" }}>
      <div className="flex items-center gap-2 text-xs font-semibold text-gray-500">
        <span className="w-3 h-1.5 rounded-full bg-red-400" /> Grammar Errors
      </div>
      <div className="flex items-center gap-2 text-xs font-semibold text-gray-500">
        <span className="w-3 h-1.5 rounded-full bg-amber-400" /> Vocabulary
      </div>
      <div className="flex items-center gap-2 text-xs font-semibold text-gray-500">
        <span className="w-3 h-1.5 rounded-full bg-blue-400" /> Coherence
      </div>
    </div>
  );
}

function BandGauge({ band, max = 9 }: { band: number; max?: number }) {
  const pct = (band / max) * 100;
  const color = band >= 7 ? "#10b981" : band >= 5.5 ? "#f59e0b" : "#ef4444";
  return (
    <div className="w-full h-1.5 rounded-full bg-gray-100 overflow-hidden">
      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

function CriterionRow({ title, band, feedback, icon }: { title: string; band: number; feedback: string; icon: React.ReactNode }) {
  const color = band >= 7 ? "#10b981" : band >= 5.5 ? "#f59e0b" : "#ef4444";
  return (
    <div className="p-5 border-b border-gray-50 last:border-b-0 hover:bg-gray-50/50 transition-colors">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-gray-400">{icon}</span>
          <span className="text-sm font-bold text-gray-700 uppercase tracking-wide">{title}</span>
        </div>
        <span className="text-2xl font-black" style={{ color }}>{band.toFixed(1)}</span>
      </div>
      <BandGauge band={band} />
      <p className="text-[13px] text-gray-500 leading-relaxed mt-3">{feedback}</p>
    </div>
  );
}

function StrengthsImprovements({ analysis }: { analysis: any }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      <div className="rounded-2xl p-5" style={{ background: "linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)", border: "1px solid #bbf7d0" }}>
        <h3 className="flex items-center gap-2 text-emerald-800 font-bold text-sm mb-4">
          <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          Strengths
        </h3>
        <ul className="space-y-3">
          {analysis.strengths?.map((str: string, i: number) => (
            <li key={i} className="flex gap-3 text-[13px] text-gray-700 leading-relaxed">
              <div className="h-5 w-5 rounded-full bg-emerald-100 flex items-center justify-center shrink-0 mt-0.5">
                <Check className="h-3 w-3 text-emerald-600" />
              </div>
              <span>{str}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="rounded-2xl p-5" style={{ background: "linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)", border: "1px solid #fde68a" }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="flex items-center gap-2 text-amber-800 font-bold text-sm">
            <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center">
              <TrendingUp className="h-4 w-4 text-amber-600" />
            </div>
            Areas for Improvement
          </h3>
          <CopyButton text={analysis.improvements?.join("\n") ?? ""} label="Copy" />
        </div>
        <ul className="space-y-3">
          {analysis.improvements?.map((imp: string, i: number) => (
            <li key={i} className="flex gap-3 text-[13px] text-gray-700 leading-relaxed">
              <div className="h-5 w-5 rounded-full bg-amber-100 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-amber-600 text-[10px] font-black">{i + 1}</span>
              </div>
              <span>{imp}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function Section({ title, subtitle, icon, headerRight, children, accent }: {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  headerRight?: React.ReactNode;
  children: React.ReactNode;
  accent?: string;
}) {
  return (
    <div className="rounded-2xl bg-white overflow-visible" style={{ border: "1px solid #e5e7eb", boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)" }}>
      <div className="px-6 py-4 flex items-start justify-between gap-4" style={{ borderBottom: "1px solid #f1f5f9" }}>
        <div className="flex items-start gap-3">
          {icon && (
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5" style={{ background: accent ? `${accent}15` : "#f1f5f9" }}>
              <span style={{ color: accent || "#64748b" }}>{icon}</span>
            </div>
          )}
          <div>
            <h3 className="font-bold text-[15px] text-gray-900">{title}</h3>
            {subtitle && <p className="text-[13px] text-gray-400 mt-0.5">{subtitle}</p>}
          </div>
        </div>
        {headerRight}
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

function IeltsResults({ analysis, originalEssay }: { analysis: any; originalEssay: string }) {
  const overallColor = analysis.overallBand >= 7 ? "#10b981" : analysis.overallBand >= 5.5 ? "#f59e0b" : "#ef4444";

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div
          className="md:col-span-1 rounded-2xl flex flex-col justify-center items-center p-8 text-white relative overflow-hidden"
          style={{ background: `linear-gradient(160deg, ${NAVY} 0%, #0C2A4A 50%, #1E2155 100%)` }}
        >
          <div className="absolute inset-0 opacity-20" style={{ background: `radial-gradient(circle at 30% 40%, ${TEAL}, transparent 60%)` }} />
          <div className="text-center relative z-10">
            <p className="text-white/50 font-semibold uppercase tracking-[0.2em] text-[10px] mb-2">Overall Band</p>
            <div className="text-7xl font-black tracking-tighter" style={{ color: overallColor, textShadow: `0 0 40px ${overallColor}40` }}>
              {analysis.overallBand}
            </div>
            <div className="mt-4 inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider" style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}>
              <Award className="w-3 h-3" />
              {analysis.taskType}
            </div>
          </div>
        </div>

        <div className="md:col-span-2 rounded-2xl bg-white overflow-hidden" style={{ border: "1px solid #e5e7eb", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          <div className="px-6 py-4" style={{ borderBottom: "1px solid #f1f5f9" }}>
            <h3 className="font-bold text-[15px] text-gray-900">Criterion Breakdown</h3>
            <p className="text-[12px] text-gray-400 mt-0.5">Detailed scores across the four IELTS Writing criteria</p>
          </div>
          <div>
            <CriterionRow title="Task Response" band={analysis.scores.taskResponse.band} feedback={analysis.scores.taskResponse.feedback} icon={<BookOpen className="w-4 h-4" />} />
            <CriterionRow title="Coherence & Cohesion" band={analysis.scores.coherenceCohesion.band} feedback={analysis.scores.coherenceCohesion.feedback} icon={<Sparkles className="w-4 h-4" />} />
            <CriterionRow title="Lexical Resource" band={analysis.scores.lexicalResource.band} feedback={analysis.scores.lexicalResource.feedback} icon={<PenLine className="w-4 h-4" />} />
            <CriterionRow title="Grammatical Range" band={analysis.scores.grammaticalRange.band} feedback={analysis.scores.grammaticalRange.feedback} icon={<FileText className="w-4 h-4" />} />
          </div>
        </div>
      </div>

      <StrengthsImprovements analysis={analysis} />

      <Section title="Annotated Essay" subtitle="Click highlighted phrases to see corrections and feedback." icon={<PenLine className="w-4 h-4" />} accent={TEAL}>
        <AnnotationLegend />
        <div className="mt-4">
          <AnnotatedText text={originalEssay} analysis={analysis} />
        </div>
      </Section>

      {analysis.correctedEssay && (
        <Section title="Corrected Essay" subtitle="Your essay with all errors fixed — same ideas, correct language." icon={<CheckCircle2 className="w-4 h-4" />} accent="#10b981" headerRight={<CopyButton text={analysis.correctedEssay} />}>
          <p className="leading-[2] text-gray-700 whitespace-pre-wrap" style={{ fontFamily: "'Georgia', serif" }}>{analysis.correctedEssay}</p>
        </Section>
      )}

      {analysis.exampleEssayBand6 ? (
        <Section title="Band 6 Example Essay" subtitle="A solid Band 5.5–6 rewrite — clear improvement with accessible language." icon={<Award className="w-4 h-4" />} accent="#f59e0b" headerRight={<CopyButton text={analysis.exampleEssayBand6} />}>
          <p className="leading-[2] text-gray-700 whitespace-pre-wrap" style={{ fontFamily: "'Georgia', serif" }}>{analysis.exampleEssayBand6}</p>
        </Section>
      ) : !analysis.exampleBetter && (
        <div className="rounded-2xl p-6 text-center" style={{ background: "rgba(0,0,0,0.02)", border: "1px dashed rgba(0,0,0,0.1)" }}>
          <div className="animate-pulse flex flex-col items-center gap-2">
            <Award className="w-5 h-5 text-gray-300" />
            <span className="text-sm text-gray-400">Loading example essays & study materials...</span>
          </div>
        </div>
      )}

      {analysis.exampleEssayBand8 && (
        <Section title="Band 8 Example Essay" subtitle="An advanced Band 7–8 rewrite — sophisticated vocabulary and complex structures." icon={<Award className="w-4 h-4" />} accent={TEAL} headerRight={<CopyButton text={analysis.exampleEssayBand8} />}>
          <p className="leading-[2] text-gray-700 whitespace-pre-wrap" style={{ fontFamily: "'Georgia', serif" }}>{analysis.exampleEssayBand8}</p>
        </Section>
      )}

      {analysis.exampleBetter && (
        <Section title="Better Version" subtitle="A more natural, expressive rewrite." icon={<Award className="w-4 h-4" />} accent="#f59e0b" headerRight={<CopyButton text={analysis.exampleBetter} />}>
          <p className="leading-[2] text-gray-700 whitespace-pre-wrap" style={{ fontFamily: "'Georgia', serif" }}>{analysis.exampleBetter}</p>
        </Section>
      )}

      {analysis.exampleFormal && (
        <Section title="Formal Version" subtitle="A professional, formal rewrite." icon={<Award className="w-4 h-4" />} accent={TEAL} headerRight={<CopyButton text={analysis.exampleFormal} />}>
          <p className="leading-[2] text-gray-700 whitespace-pre-wrap" style={{ fontFamily: "'Georgia', serif" }}>{analysis.exampleFormal}</p>
        </Section>
      )}

      {(analysis.grammarRecommendations || analysis.linkingWords || analysis.newVocabulary || analysis.finalGuidance) && (
        <>
          <div className="flex items-center gap-3 pt-4">
            <div className="h-px flex-1" style={{ background: `linear-gradient(to right, transparent, ${TEAL}40, transparent)` }} />
            <span className="text-xs font-bold uppercase tracking-widest flex items-center gap-2" style={{ color: TEAL }}>
              <GraduationCap className="w-4 h-4" /> Study Materials
            </span>
            <div className="h-px flex-1" style={{ background: `linear-gradient(to right, transparent, ${TEAL}40, transparent)` }} />
          </div>

          <GrammarRecommendations items={analysis.grammarRecommendations} />
          <LinkingWordsSection items={analysis.linkingWords} />
          <VocabularySection items={analysis.newVocabulary} />
          <FinalGuidance guidance={analysis.finalGuidance} />
        </>
      )}
    </div>
  );
}

function GrammarRecommendations({ items }: { items?: any[] }) {
  const [expanded, setExpanded] = useState<number | null>(null);
  if (!items || items.length === 0) return null;

  return (
    <Section
      title="Grammar Recommendations"
      subtitle="Your simple sentences transformed into complex and compound structures."
      icon={<ArrowRightLeft className="w-4 h-4" />}
      accent="#8b5cf6"
    >
      <div className="space-y-4">
        {items.map((item, i) => (
          <div key={i} className="rounded-xl overflow-hidden" style={{ border: "1px solid #e5e7eb" }}>
            <button
              className="w-full text-left px-5 py-4 flex items-start justify-between gap-3 hover:bg-gray-50 transition-colors"
              onClick={() => setExpanded(expanded === i ? null : i)}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Your Sentence</span>
                  {item.issue && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{ background: "#fef3c7", color: "#92400e" }}>{item.issue}</span>
                  )}
                </div>
                <p className="text-[14px] text-gray-700 leading-relaxed" style={{ fontFamily: "'Georgia', serif" }}>"{item.studentSentence}"</p>
              </div>
              {expanded === i ? <ChevronUp className="w-4 h-4 text-gray-400 mt-1 shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-400 mt-1 shrink-0" />}
            </button>
            {expanded === i && (
              <div className="px-5 pb-5 space-y-4 border-t border-gray-100 pt-4">
                {item.complexVersion && (
                  <div className="rounded-lg p-4" style={{ background: "#f5f3ff", border: "1px solid #ddd6fe" }}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "#7c3aed" }}>Complex Sentence</span>
                    </div>
                    <p className="text-[14px] text-gray-800 leading-relaxed" style={{ fontFamily: "'Georgia', serif" }}>{item.complexVersion}</p>
                  </div>
                )}
                {item.compoundVersion && (
                  <div className="rounded-lg p-4" style={{ background: "#eff6ff", border: "1px solid #bfdbfe" }}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "#2563eb" }}>Compound Sentence</span>
                    </div>
                    <p className="text-[14px] text-gray-800 leading-relaxed" style={{ fontFamily: "'Georgia', serif" }}>{item.compoundVersion}</p>
                  </div>
                )}
                {item.tip && (
                  <p className="text-[13px] text-gray-500 leading-relaxed flex items-start gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                    {item.tip}
                  </p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </Section>
  );
}

function LinkingWordsSection({ items }: { items?: any[] }) {
  if (!items || items.length === 0) return null;

  return (
    <Section
      title="Linking Words"
      subtitle="Replace basic connectors with academic linking words."
      icon={<Link2 className="w-4 h-4" />}
      accent="#0ea5e9"
    >
      <div className="space-y-5">
        {items.map((item, i) => (
          <div key={i} className="rounded-xl p-5" style={{ background: "#f8fafc", border: "1px solid #e2e8f0" }}>
            <div className="flex flex-wrap items-center gap-3 mb-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold" style={{ background: "#fee2e2", color: "#991b1b" }}>
                ✗ {item.studentUsed}
              </span>
              <ChevronRight className="w-4 h-4 text-gray-300" />
              {item.betterAlternatives?.map((alt: string, j: number) => (
                <span key={j} className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold" style={{ background: "#dcfce7", color: "#166534" }}>
                  ✓ {alt}
                </span>
              ))}
            </div>
            {item.context && (
              <div className="mb-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Original</span>
                <p className="text-[13px] text-gray-500 mt-0.5 leading-relaxed" style={{ fontFamily: "'Georgia', serif" }}>"{item.context}"</p>
              </div>
            )}
            {item.rewrittenSentence && (
              <div className="rounded-lg p-3" style={{ background: "#ecfdf5", border: "1px solid #a7f3d0" }}>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Improved</span>
                <p className="text-[13px] text-gray-800 mt-0.5 leading-relaxed" style={{ fontFamily: "'Georgia', serif" }}>{item.rewrittenSentence}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </Section>
  );
}

function VocabularySection({ items }: { items?: any[] }) {
  if (!items || items.length === 0) return null;

  return (
    <Section
      title="New Vocabulary"
      subtitle="Advanced words to study and add to your writing toolkit."
      icon={<BookOpen className="w-4 h-4" />}
      accent="#f59e0b"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {items.map((item, i) => (
          <div key={i} className="rounded-xl p-4 hover:shadow-sm transition-shadow" style={{ background: "#fffbeb", border: "1px solid #fde68a" }}>
            <div className="flex items-start justify-between gap-2 mb-2">
              <div>
                <span className="text-[15px] font-black text-gray-900">{item.word}</span>
                {item.partOfSpeech && (
                  <span className="ml-2 text-[10px] font-bold uppercase tracking-wider text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded">{item.partOfSpeech}</span>
                )}
              </div>
              {item.arabicHint && (
                <span className="text-[13px] text-gray-500 font-medium shrink-0" dir="rtl">{item.arabicHint}</span>
              )}
            </div>
            <p className="text-[13px] text-gray-600 leading-relaxed mb-2">{item.meaning}</p>
            {item.exampleSentence && (
              <p className="text-[12px] text-gray-400 italic leading-relaxed" style={{ fontFamily: "'Georgia', serif" }}>"{item.exampleSentence}"</p>
            )}
          </div>
        ))}
      </div>
    </Section>
  );
}

function FinalGuidance({ guidance }: { guidance?: any }) {
  if (!guidance) return null;

  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: `2px solid ${TEAL}30`, boxShadow: `0 4px 24px ${TEAL}10` }}>
      <div className="px-6 py-5" style={{ background: `linear-gradient(135deg, ${NAVY}, #0C2A4A)` }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${TEAL}25` }}>
            <MessageCircle className="w-5 h-5" style={{ color: TEAL }} />
          </div>
          <div>
            <h3 className="font-bold text-[15px] text-white">Orwell's Guidance</h3>
            <p className="text-[12px] text-white/50">Personalized feedback and next steps for your writing journey</p>
          </div>
        </div>
      </div>
      <div className="p-6 space-y-5 bg-white">
        {guidance.overallFeedback && (
          <p className="text-[15px] text-gray-700 leading-relaxed" style={{ fontFamily: "'Georgia', serif" }}>{guidance.overallFeedback}</p>
        )}

        {guidance.focusAreas && guidance.focusAreas.length > 0 && (
          <div>
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-2">
              <Target className="w-3.5 h-3.5" /> Focus Areas
            </h4>
            <div className="flex flex-wrap gap-2">
              {guidance.focusAreas.map((area: string, i: number) => (
                <span key={i} className="px-3 py-1.5 rounded-lg text-[13px] font-semibold" style={{ background: `${TEAL}10`, color: TEAL, border: `1px solid ${TEAL}25` }}>
                  {area}
                </span>
              ))}
            </div>
          </div>
        )}

        {guidance.nextSteps && guidance.nextSteps.length > 0 && (
          <div>
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-3">Next Steps</h4>
            <div className="space-y-2.5">
              {guidance.nextSteps.map((step: string, i: number) => (
                <div key={i} className="flex items-start gap-3 text-[13px] text-gray-700 leading-relaxed">
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5" style={{ background: `${TEAL}12` }}>
                    <span className="text-[11px] font-black" style={{ color: TEAL }}>{i + 1}</span>
                  </div>
                  {step}
                </div>
              ))}
            </div>
          </div>
        )}

        {guidance.motivationalNote && (
          <div className="rounded-xl p-4 flex items-start gap-3" style={{ background: "linear-gradient(135deg, #ecfdf5, #f0fdf4)", border: "1px solid #bbf7d0" }}>
            <Sparkles className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
            <p className="text-[13px] text-emerald-800 font-medium leading-relaxed">{guidance.motivationalNote}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function ParagraphResults({ analysis, originalText }: { analysis: any; originalText: string }) {
  return (
    <div className="space-y-6">
      <StrengthsImprovements analysis={analysis} />

      <Section title="Annotated Paragraph" subtitle="Click highlighted phrases to see corrections and feedback." icon={<PenLine className="w-4 h-4" />} accent={TEAL}>
        <AnnotationLegend />
        <div className="mt-4">
          <AnnotatedText text={originalText} analysis={analysis} />
        </div>
      </Section>

      {analysis.correctedParagraph && (
        <Section title="Corrected Version" subtitle="Your paragraph with all errors fixed — same meaning, correct language." icon={<CheckCircle2 className="w-4 h-4" />} accent="#10b981" headerRight={<CopyButton text={analysis.correctedParagraph} />}>
          <p className="leading-[2] text-gray-700 whitespace-pre-wrap" style={{ fontFamily: "'Georgia', serif" }}>{analysis.correctedParagraph}</p>
        </Section>
      )}

      {analysis.exampleBetter && (
        <Section title="Better Version" subtitle="A more natural, fluent, and expressive way to write the same message." icon={<Sparkles className="w-4 h-4" />} accent={TEAL} headerRight={<CopyButton text={analysis.exampleBetter} />}>
          <p className="leading-[2] text-gray-700 whitespace-pre-wrap" style={{ fontFamily: "'Georgia', serif" }}>{analysis.exampleBetter}</p>
        </Section>
      )}

      {analysis.exampleFormal && (
        <Section title="Formal Version" subtitle="A professional, formal version — suitable for emails, letters, or official documents." icon={<BookOpen className="w-4 h-4" />} accent="#6366f1" headerRight={<CopyButton text={analysis.exampleFormal} />}>
          <p className="leading-[2] text-gray-700 whitespace-pre-wrap" style={{ fontFamily: "'Georgia', serif" }}>{analysis.exampleFormal}</p>
        </Section>
      )}
    </div>
  );
}

type TabType = "new" | "history";

function ProgressDashboard({ progress }: { progress: any }) {
  if (!progress || progress.totalEssays === 0) return null;

  const stats = [
    { label: "Essays Analyzed", value: progress.totalEssays, icon: <FileText className="w-4 h-4" />, color: TEAL },
    { label: "Average Band", value: progress.avgBand, icon: <TrendingUp className="w-4 h-4" />, color: "#f59e0b" },
    { label: "Best Band", value: progress.bestBand, icon: <Award className="w-4 h-4" />, color: "#10b981" },
    { label: "Improvement", value: `${progress.improvement >= 0 ? "+" : ""}${progress.improvement}`, icon: <Sparkles className="w-4 h-4" />, color: progress.improvement >= 0 ? "#10b981" : "#ef4444" },
  ];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {stats.map((s, i) => (
          <div key={i} className="rounded-xl bg-white p-4 text-center" style={{ border: "1px solid #e5e7eb" }}>
            <div className="w-8 h-8 rounded-lg mx-auto mb-2 flex items-center justify-center" style={{ background: `${s.color}12` }}>
              <span style={{ color: s.color }}>{s.icon}</span>
            </div>
            <div className="text-2xl font-black text-gray-900">{s.value}</div>
            <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {progress.history && progress.history.length >= 2 && (
        <div className="rounded-xl bg-white p-5" style={{ border: "1px solid #e5e7eb" }}>
          <h3 className="text-sm font-bold text-gray-700 mb-4">Band Score Progress</h3>
          <div className="relative h-40">
            <ProgressChart history={progress.history} />
          </div>
        </div>
      )}
    </div>
  );
}

function ProgressChart({ history }: { history: any[] }) {
  const maxBand = 9;
  const minBand = Math.max(0, Math.min(...history.map((h) => h.overallBand ?? 0)) - 1);
  const range = maxBand - minBand || 1;
  const w = 100;
  const h = 100;
  const padX = 6;
  const padY = 8;

  const points = history.map((item, i) => {
    const x = padX + (i / Math.max(1, history.length - 1)) * (w - 2 * padX);
    const y = padY + (1 - ((item.overallBand ?? 0) - minBand) / range) * (h - 2 * padY);
    return { x, y, band: item.overallBand };
  });

  const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const areaD = `${pathD} L ${points[points.length - 1].x} ${h - padY + 4} L ${points[0].x} ${h - padY + 4} Z`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={TEAL} stopOpacity="0.15" />
          <stop offset="100%" stopColor={TEAL} stopOpacity="0" />
        </linearGradient>
      </defs>
      {[minBand, minBand + range / 2, maxBand].map((band, i) => {
        const y = padY + (1 - (band - minBand) / range) * (h - 2 * padY);
        return (
          <g key={i}>
            <line x1={padX} y1={y} x2={w - padX} y2={y} stroke="#e5e7eb" strokeWidth="0.3" strokeDasharray="2,2" />
            <text x={1} y={y + 1} fontSize="3.5" fill="#94a3b8" dominantBaseline="middle">{band.toFixed(1)}</text>
          </g>
        );
      })}
      <path d={areaD} fill="url(#chartGrad)" />
      <path d={pathD} fill="none" stroke={TEAL} strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="1.8" fill="white" stroke={TEAL} strokeWidth="0.8" />
          <text x={p.x} y={p.y - 4} textAnchor="middle" fontSize="3" fill="#374151" fontWeight="bold">{p.band}</text>
        </g>
      ))}
    </svg>
  );
}

function HistoryView({ onViewLog }: { onViewLog: (id: number) => void }) {
  const [logs, setLogs] = useState<any[]>([]);
  const [progress, setProgress] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [logsRes, progressRes] = await Promise.all([
          fetch(`${BASE_URL}/api-intro/ielts/logs`, { credentials: "include" }),
          fetch(`${BASE_URL}/api-intro/ielts/progress`, { credentials: "include" }),
        ]);
        if (logsRes.ok) {
          const data = await logsRes.json();
          setLogs(data.logs || []);
        }
        if (progressRes.ok) {
          const data = await progressRes.json();
          setProgress(data);
        }
      } catch (err) {
        console.error("Failed to fetch history:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: `${TEAL}10` }}>
          <FileText className="w-8 h-8" style={{ color: TEAL }} />
        </div>
        <h3 className="text-lg font-bold text-gray-700 mb-1">No essays yet</h3>
        <p className="text-sm text-gray-400">Submit your first IELTS essay to start tracking your progress</p>
      </div>
    );
  }

  const bandColor = (b: number | null) => {
    if (!b) return "#94a3b8";
    return b >= 7 ? "#10b981" : b >= 5.5 ? "#f59e0b" : "#ef4444";
  };

  return (
    <div className="space-y-6">
      <ProgressDashboard progress={progress} />

      <div className="space-y-3">
        <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-gray-400" /> Essay History
        </h3>
        {logs.map((log: any) => (
          <button
            key={log.id}
            onClick={() => onViewLog(log.id)}
            className="w-full text-left rounded-xl bg-white p-4 sm:p-5 hover:shadow-md transition-all group"
            style={{ border: "1px solid #e5e7eb" }}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded" style={{ background: `${TEAL}10`, color: TEAL }}>{log.taskType}</span>
                  <span className="text-[11px] text-gray-400">{log.wordCount} words</span>
                </div>
                <p className="text-[13px] text-gray-600 leading-relaxed truncate" style={{ fontFamily: "'Georgia', serif" }}>
                  {log.essayPreview}...
                </p>
                <div className="flex items-center gap-4 mt-2">
                  <div className="flex items-center gap-1 text-[11px] text-gray-400">
                    <span className="font-semibold">TR:</span>
                    <span style={{ color: bandColor(log.taskResponseBand) }} className="font-bold">{log.taskResponseBand}</span>
                  </div>
                  <div className="flex items-center gap-1 text-[11px] text-gray-400">
                    <span className="font-semibold">CC:</span>
                    <span style={{ color: bandColor(log.coherenceBand) }} className="font-bold">{log.coherenceBand}</span>
                  </div>
                  <div className="flex items-center gap-1 text-[11px] text-gray-400">
                    <span className="font-semibold">LR:</span>
                    <span style={{ color: bandColor(log.lexicalBand) }} className="font-bold">{log.lexicalBand}</span>
                  </div>
                  <div className="flex items-center gap-1 text-[11px] text-gray-400">
                    <span className="font-semibold">GR:</span>
                    <span style={{ color: bandColor(log.grammarBand) }} className="font-bold">{log.grammarBand}</span>
                  </div>
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-3xl font-black" style={{ color: bandColor(log.overallBand) }}>{log.overallBand}</div>
                <div className="text-[10px] text-gray-400 mt-0.5">
                  {new Date(log.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1.5 mt-3 text-[11px] font-semibold opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: TEAL }}>
              View full analysis <ChevronRight className="w-3 h-3" />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function LogDetailView({ logId, onBack }: { logId: number; onBack: () => void }) {
  const [log, setLog] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLog = async () => {
      try {
        const res = await fetch(`${BASE_URL}/api-intro/ielts/logs/${logId}`, { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          setLog(data.log);
        }
      } catch (err) {
        console.error("Failed to fetch log:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchLog();
  }, [logId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!log) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500">Essay not found</p>
        <button onClick={onBack} className="mt-3 text-sm font-semibold" style={{ color: TEAL }}>Go back</button>
      </div>
    );
  }

  const analysis = log.analysis as any;
  const date = new Date(log.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-gray-700 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to history
        </button>
        <span className="text-[11px] text-gray-400">{date}</span>
      </div>

      {analysis.taskType !== "Paragraph" && (
        <IeltsResults analysis={analysis} originalEssay={log.essay} />
      )}
    </div>
  );
}

const IDX_STORAGE_KEYS: Record<AssignmentCategory, string> = {
  "Task 1": "orwell.task1.idx",
  "Task 2": "orwell.task2.idx",
  "Paragraph": "orwell.paragraph.idx",
};

function loadIndex(cat: AssignmentCategory): number {
  if (typeof window === "undefined") return 0;
  const raw = window.localStorage.getItem(IDX_STORAGE_KEYS[cat]);
  const n = raw ? parseInt(raw, 10) : 0;
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function saveIndex(cat: AssignmentCategory, idx: number) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(IDX_STORAGE_KEYS[cat], String(idx));
}

export default function Writing({ onBack, expiresAt }: Props) {
  const [tab, setTab] = useState<TabType>("new");
  const [text, setText] = useState("");
  const [taskType, setTaskType] = useState<AssignmentCategory>("Task 2");
  const [mode, setMode] = useState<"assignment" | "free">("assignment");
  const [freeCheckType, setFreeCheckType] = useState<AssignmentCategory | null>(null);
  const [indexByCat, setIndexByCat] = useState<Record<AssignmentCategory, number>>({
    "Task 1": loadIndex("Task 1"),
    "Task 2": loadIndex("Task 2"),
    "Paragraph": loadIndex("Paragraph"),
  });
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzeElapsed, setAnalyzeElapsed] = useState(0);
  const [streamingText, setStreamingText] = useState("");
  const [analysis, setAnalysis] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [viewingLogId, setViewingLogId] = useState<number | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const analyzeRequestId = useRef(0);
  const analyzeAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!isAnalyzing) { setAnalyzeElapsed(0); return; }
    const start = Date.now();
    const id = setInterval(() => setAnalyzeElapsed(Math.floor((Date.now() - start) / 1000)), 1000);
    return () => clearInterval(id);
  }, [isAnalyzing]);

  const currentIndex = indexByCat[taskType];
  const assignment = getAssignment(taskType, currentIndex);
  const totalAssignments = ASSIGNMENTS[taskType].length;
  const displayNum = ((currentIndex % totalAssignments) + totalAssignments) % totalAssignments + 1;

  const wordCount = text.trim().split(/\s+/).filter((w) => w.length > 0).length;
  const meetsMinWords = wordCount >= assignment.minWords;

  const advanceIndex = useCallback((cat: AssignmentCategory) => {
    setIndexByCat(prev => {
      const next = { ...prev, [cat]: prev[cat] + 1 };
      saveIndex(cat, next[cat]);
      return next;
    });
  }, []);

  const invalidatePending = () => {
    analyzeRequestId.current += 1;
  };

  const handleRefresh = () => {
    if (isAnalyzing) return;
    invalidatePending();
    advanceIndex(taskType);
    setText("");
    setAnalysis(null);
    setError(null);
  };

  const handleNextAssignment = () => {
    invalidatePending();
    advanceIndex(taskType);
    setText("");
    setAnalysis(null);
    setError(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleAnalyze = async () => {
    if (!text.trim() || isAnalyzing) return;
    setIsAnalyzing(true);
    setError(null);
    setAnalysis(null);
    setStreamingText("");
    const reqId = ++analyzeRequestId.current;

    if (analyzeAbortRef.current) analyzeAbortRef.current.abort();
    const controller = new AbortController();
    analyzeAbortRef.current = controller;
    const timeoutId = setTimeout(() => controller.abort(), 180000);

    try {
      const effectiveTaskType = mode === "free" ? freeCheckType : taskType;
      if (!effectiveTaskType) throw new Error("Please choose a writing type first.");
      const body = mode === "free"
        ? { essay: text, taskType: effectiveTaskType }
        : { essay: text, taskType, prompt: assignment.prompt, subtype: assignment.subtype };
      const res = await fetch(`${BASE_URL}/api-intro/ielts/analyze-stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (reqId !== analyzeRequestId.current) { clearTimeout(timeoutId); return; }

      if (!res.ok || !res.body) {
        clearTimeout(timeoutId);
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Analysis failed (HTTP ${res.status})`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let full = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        if (reqId !== analyzeRequestId.current) { reader.cancel(); clearTimeout(timeoutId); return; }
        const chunk = decoder.decode(value, { stream: true });
        full += chunk;
        setStreamingText(full);
      }

      clearTimeout(timeoutId);
      if (reqId !== analyzeRequestId.current) return;

      const errIdx = full.indexOf("__ERROR__:");
      if (errIdx >= 0) {
        throw new Error(full.slice(errIdx + 10).replace(/__DONE__/g, "").trim() || "Analysis failed");
      }

      const doneIdx = full.indexOf("__DONE__");
      const jsonText = doneIdx >= 0 ? full.slice(0, doneIdx) : full;
      let parsed: any;
      try {
        parsed = JSON.parse(jsonText.trim());
      } catch {
        const match = jsonText.match(/\{[\s\S]*\}/);
        if (!match) throw new Error("Could not parse AI response. Please try again.");
        parsed = JSON.parse(match[0]);
      }

      setAnalysis(parsed);
      setShowFeedback(true);
      setIsAnalyzing(false);
      setStreamingText("");

      const extrasController = new AbortController();
      const extrasTimeout = setTimeout(() => extrasController.abort(), 180000);
      const extrasBody = mode === "free"
        ? { essay: text, taskType: freeCheckType }
        : { essay: text, taskType, prompt: assignment.prompt, subtype: assignment.subtype };
      fetch(`${BASE_URL}/api-intro/ielts/analyze-extras`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(extrasBody),
        signal: extrasController.signal,
      })
        .then(r => { clearTimeout(extrasTimeout); return r.ok ? r.json() : null; })
        .then(extras => {
          if (reqId !== analyzeRequestId.current) return;
          if (extras) setAnalysis((prev: any) => prev ? { ...prev, ...extras } : prev);
        })
        .catch(() => { clearTimeout(extrasTimeout); });
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (reqId !== analyzeRequestId.current) return;
      const msg = err?.name === "AbortError"
        ? "Analysis timed out after 3 minutes. Please try again — the AI server may be slow."
        : (err?.message || "Analysis failed. Please try again.");
      setError(msg);
      setIsAnalyzing(false);
      setStreamingText("");
    }
  };

  const handleChangeTaskType = (cat: AssignmentCategory) => {
    if (isAnalyzing) return;
    invalidatePending();
    setMode("assignment");
    setTaskType(cat);
    setFreeCheckType(null);
    setText("");
    setAnalysis(null);
    setError(null);
  };

  const handleSelectFreeCheck = () => {
    if (isAnalyzing) return;
    invalidatePending();
    setMode("free");
    setFreeCheckType(null);
    setText("");
    setAnalysis(null);
    setError(null);
  };

  const handleSelectFreeCheckType = (cat: AssignmentCategory) => {
    if (isAnalyzing) return;
    setFreeCheckType(cat);
    setText("");
    setAnalysis(null);
    setError(null);
  };

  const placeholder = taskType === "Paragraph"
    ? `Write your response here — at least ${assignment.minWords} words...`
    : `Write your ${taskType} essay here — at least ${assignment.minWords} words...`;

  const inputLabel = taskType === "Paragraph" ? "Your Response" : "Your Essay";

  const taskOptions: { value: AssignmentCategory; label: string; desc: string; icon: React.ReactNode }[] = [
    { value: "Task 1", label: "Task 1", desc: "Report / Chart", icon: <BookOpen className="w-4 h-4" /> },
    { value: "Task 2", label: "Task 2", desc: "Essay", icon: <PenLine className="w-4 h-4" /> },
    { value: "Paragraph", label: "Paragraph", desc: "Letter / Email", icon: <FileText className="w-4 h-4" /> },
  ];

  const tabs: { key: TabType; label: string; icon: React.ReactNode }[] = [
    { key: "new", label: "Assignment", icon: <ClipboardList className="w-4 h-4" /> },
    { key: "history", label: "My History", icon: <BookOpen className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen flex flex-col text-gray-900" style={{ background: "linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)" }}>
      <header className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-xl" style={{ borderBottom: "1px solid rgba(0,0,0,0.06)", boxShadow: "0 1px 3px rgba(0,0,0,0.02)" }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 transition-colors font-medium"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Back</span>
            </button>
            <div className="h-6 w-px bg-gray-200" />
            <div className="flex items-center gap-2.5">
              <img src="/logo.png" alt="LEXO Intro" className="h-9 w-auto" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <DaysLeftBadge expiresAt={expiresAt} />
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${TEAL}15` }}>
                <PenLine className="w-3.5 h-3.5" style={{ color: TEAL }} />
              </div>
              <span className="text-sm font-bold text-gray-900">Orwell <span style={{ color: TEAL }}>AI</span></span>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 py-8 w-full">
        <div className="space-y-8">
          <div className="text-center space-y-3 max-w-xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-widest" style={{ background: `${TEAL}10`, color: TEAL, border: `1px solid ${TEAL}25` }}>
              <Sparkles className="w-3 h-3" /> Real IELTS Assignments
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight">
              Orwell AI <span style={{ color: TEAL }}>المصحح</span>
            </h1>
            <p className="text-gray-400 text-sm leading-relaxed">
              Complete official-style IELTS writing assignments — one at a time — with expert AI scoring and feedback.
            </p>
          </div>

          <div className="flex items-center justify-center gap-1 p-1 rounded-xl mx-auto w-fit" style={{ background: "#f1f5f9" }}>
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => { setTab(t.key); setViewingLogId(null); }}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all"
                style={{
                  background: tab === t.key ? "white" : "transparent",
                  color: tab === t.key ? TEAL : "#94a3b8",
                  boxShadow: tab === t.key ? "0 1px 3px rgba(0,0,0,0.06)" : "none",
                }}
              >
                {t.icon}
                {t.label}
              </button>
            ))}
          </div>

          {tab === "new" && (
            <>
              {/* Task Type Selector */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {taskOptions.map((opt) => {
                  const active = mode === "assignment" && taskType === opt.value;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => handleChangeTaskType(opt.value)}
                      disabled={isAnalyzing}
                      className={`relative flex flex-col items-center gap-1.5 px-3 py-3.5 rounded-xl transition-all ${
                        isAnalyzing ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
                      }`}
                      style={{
                        background: active ? `${TEAL}08` : "#ffffff",
                        border: `2px solid ${active ? TEAL : "#e2e8f0"}`,
                        boxShadow: active ? `0 0 0 3px ${TEAL}15` : "0 1px 2px rgba(0,0,0,0.02)",
                      }}
                    >
                      <span style={{ color: active ? TEAL : "#94a3b8" }}>{opt.icon}</span>
                      <span className="text-sm font-bold" style={{ color: active ? TEAL : "#374151" }}>{opt.label}</span>
                      <span className="text-[11px] text-gray-400">{opt.desc}</span>
                    </button>
                  );
                })}
                {/* Free Check option */}
                <button
                  onClick={handleSelectFreeCheck}
                  disabled={isAnalyzing}
                  className={`relative flex flex-col items-center gap-1.5 px-3 py-3.5 rounded-xl transition-all ${
                    isAnalyzing ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
                  }`}
                  style={{
                    background: mode === "free" ? `${GOLD}10` : "#ffffff",
                    border: `2px solid ${mode === "free" ? GOLD : "#e2e8f0"}`,
                    boxShadow: mode === "free" ? `0 0 0 3px ${GOLD}25` : "0 1px 2px rgba(0,0,0,0.02)",
                  }}
                >
                  <span style={{ color: mode === "free" ? GOLD : "#94a3b8" }}><Wand2 className="w-4 h-4" /></span>
                  <span className="text-sm font-bold" style={{ color: mode === "free" ? "#92400e" : "#374151" }}>Free Check</span>
                  <span className="text-[11px] text-gray-400">Paste any writing</span>
                </button>
              </div>

              {/* Free Check Card */}
              {mode === "free" && (
                <div className="rounded-2xl bg-white overflow-hidden" style={{ border: "1px solid #e5e7eb", boxShadow: "0 4px 16px rgba(0,0,0,0.04), 0 1px 3px rgba(0,0,0,0.02)" }}>
                  <div className="px-6 py-4 flex items-center gap-3" style={{ background: `linear-gradient(135deg, ${NAVY} 0%, #0C2A4A 100%)` }}>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${GOLD}25`, border: `1px solid ${GOLD}50` }}>
                      <Wand2 className="w-5 h-5" style={{ color: GOLD }} />
                    </div>
                    <div className="min-w-0">
                      <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: GOLD }}>Free Check</span>
                      <h3 className="text-white font-bold text-[15px] mt-0.5">Paste any writing — get AI feedback instantly</h3>
                    </div>
                  </div>

                  <div className="p-6 sm:p-8 space-y-6">
                    {/* Step 1: Choose type */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold text-white" style={{ background: TEAL }}>1</div>
                        <label className="text-sm font-bold text-gray-800">Choose the type</label>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {([
                          { value: "Task 1" as AssignmentCategory, label: "Task 1", desc: "Academic report", icon: <BookOpen className="w-4 h-4" /> },
                          { value: "Task 2" as AssignmentCategory, label: "Task 2", desc: "Essay", icon: <PenLine className="w-4 h-4" /> },
                          { value: "Paragraph" as AssignmentCategory, label: "Paragraph", desc: "Letter / Email", icon: <FileText className="w-4 h-4" /> },
                        ]).map((opt) => {
                          const active = freeCheckType === opt.value;
                          return (
                            <button
                              key={opt.value}
                              onClick={() => handleSelectFreeCheckType(opt.value)}
                              disabled={isAnalyzing}
                              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-left ${isAnalyzing ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                              style={{
                                background: active ? `${TEAL}08` : "#f8fafc",
                                border: `2px solid ${active ? TEAL : "#e2e8f0"}`,
                              }}
                            >
                              <span style={{ color: active ? TEAL : "#94a3b8" }}>{opt.icon}</span>
                              <div className="min-w-0">
                                <div className="text-sm font-bold" style={{ color: active ? TEAL : "#374151" }}>{opt.label}</div>
                                <div className="text-[11px] text-gray-400">{opt.desc}</div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Step 2: Paste writing */}
                    {freeCheckType && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold text-white" style={{ background: TEAL }}>2</div>
                            <label className="text-sm font-bold text-gray-800">Paste your writing</label>
                          </div>
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-md" style={{ background: wordCount > 0 ? "#dcfce7" : "#f1f5f9", color: wordCount > 0 ? "#16a34a" : "#94a3b8" }}>
                            {wordCount} words
                          </span>
                        </div>
                        <textarea
                          placeholder={`Paste your ${freeCheckType === "Paragraph" ? "paragraph, message or email" : freeCheckType + " response"} here…`}
                          className="w-full min-h-[260px] resize-y text-[15px] p-5 leading-relaxed rounded-xl focus:outline-none transition-all text-gray-900 bg-white placeholder:text-gray-300"
                          style={{
                            border: "2px solid #e5e7eb",
                            fontFamily: "'Georgia', serif",
                            boxShadow: "inset 0 2px 4px rgba(0,0,0,0.02)",
                          }}
                          onFocus={(e) => { e.target.style.borderColor = TEAL; e.target.style.boxShadow = `0 0 0 3px ${TEAL}15, inset 0 2px 4px rgba(0,0,0,0.02)`; }}
                          onBlur={(e) => { e.target.style.borderColor = "#e5e7eb"; e.target.style.boxShadow = "inset 0 2px 4px rgba(0,0,0,0.02)"; }}
                          value={text}
                          onChange={(e) => setText(e.target.value)}
                          disabled={isAnalyzing}
                        />
                        <button
                          onClick={handleAnalyze}
                          disabled={isAnalyzing || !text.trim()}
                          className="w-full flex items-center justify-center gap-2.5 py-4 rounded-xl font-bold text-[15px] text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-lg active:scale-[0.99]"
                          style={{
                            background: isAnalyzing ? "#64748b" : `linear-gradient(135deg, ${NAVY} 0%, #0C2A4A 100%)`,
                            boxShadow: isAnalyzing ? "none" : `0 4px 16px ${NAVY}40`,
                          }}
                        >
                          {isAnalyzing ? (
                            <>
                              <Loader2 className="h-5 w-5 animate-spin" />
                              {`Analyzing… ${analyzeElapsed}s elapsed`}
                            </>
                          ) : (
                            <>
                              Submit for Feedback
                              <ChevronRight className="h-5 w-5" />
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Assignment Card */}
              {mode === "assignment" && (
              <div className="rounded-2xl bg-white overflow-hidden" style={{ border: "1px solid #e5e7eb", boxShadow: "0 4px 16px rgba(0,0,0,0.04), 0 1px 3px rgba(0,0,0,0.02)" }}>
                <div className="px-6 py-4 flex items-center justify-between gap-4" style={{ background: `linear-gradient(135deg, ${NAVY} 0%, #0C2A4A 100%)` }}>
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}>
                      <ClipboardList className="w-5 h-5 text-white" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-white/60">
                          Assignment {displayNum} of {totalAssignments}
                        </span>
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full" style={{ background: `${TEAL}30`, color: TEAL, border: `1px solid ${TEAL}50` }}>
                          {assignment.subtype}
                        </span>
                      </div>
                      <h3 className="text-white font-bold text-[15px] mt-0.5 truncate">{taskType} — Official IELTS Style</h3>
                    </div>
                  </div>
                  <button
                    onClick={handleRefresh}
                    disabled={isAnalyzing}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-bold text-white transition-all hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{ border: "1px solid rgba(255,255,255,0.18)" }}
                    title="Skip this assignment and get a new one"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Skip
                  </button>
                </div>

                <div className="p-6 sm:p-8 space-y-5">
                  {assignment.visual && (
                    <div>{assignment.visual}</div>
                  )}

                  {assignment.context && (
                    <div className="rounded-xl p-4" style={{ background: "#f8fafc", border: "1px dashed #cbd5e1" }}>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Context</div>
                      <p className="text-[14px] text-gray-700 leading-relaxed">{assignment.context}</p>
                    </div>
                  )}

                  <div className="rounded-xl p-5" style={{ background: `${TEAL}05`, border: `1px solid ${TEAL}25` }}>
                    <div className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: TEAL }}>Your Task</div>
                    <p className="text-[14.5px] text-gray-800 leading-relaxed whitespace-pre-wrap" style={{ fontFamily: "'Georgia', serif" }}>{assignment.prompt}</p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-sm font-bold text-gray-800 tracking-wide">{inputLabel}</label>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-md" style={{ background: meetsMinWords ? "#dcfce7" : wordCount > 0 ? "#fef3c7" : "#f1f5f9", color: meetsMinWords ? "#16a34a" : wordCount > 0 ? "#92400e" : "#94a3b8" }}>
                        {wordCount} / {assignment.minWords} words
                      </span>
                    </div>
                    <textarea
                      placeholder={placeholder}
                      className="w-full min-h-[260px] resize-y text-[15px] p-5 leading-relaxed rounded-xl focus:outline-none transition-all text-gray-900 bg-white placeholder:text-gray-300"
                      style={{
                        border: "2px solid #e5e7eb",
                        fontFamily: "'Georgia', serif",
                        boxShadow: "inset 0 2px 4px rgba(0,0,0,0.02)",
                      }}
                      onFocus={(e) => { e.target.style.borderColor = TEAL; e.target.style.boxShadow = `0 0 0 3px ${TEAL}15, inset 0 2px 4px rgba(0,0,0,0.02)`; }}
                      onBlur={(e) => { e.target.style.borderColor = "#e5e7eb"; e.target.style.boxShadow = "inset 0 2px 4px rgba(0,0,0,0.02)"; }}
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      disabled={isAnalyzing}
                    />
                    {!meetsMinWords && wordCount > 0 && !analysis && (
                      <p className="text-[12px] text-amber-600 flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        At least {assignment.minWords} words recommended for an accurate IELTS score.
                      </p>
                    )}
                  </div>

                  <button
                    onClick={handleAnalyze}
                    disabled={isAnalyzing || !text.trim()}
                    className="w-full flex items-center justify-center gap-2.5 py-4 rounded-xl font-bold text-[15px] text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-lg active:scale-[0.99]"
                    style={{
                      background: isAnalyzing ? "#64748b" : `linear-gradient(135deg, ${NAVY} 0%, #0C2A4A 100%)`,
                      boxShadow: isAnalyzing ? "none" : `0 4px 16px ${NAVY}40`,
                    }}
                  >
                    {isAnalyzing ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        {`Analyzing… ${analyzeElapsed}s elapsed (typically 30–60s, can take up to 2 min)`}
                      </>
                    ) : (
                      <>
                        Submit Assignment
                        <ChevronRight className="h-5 w-5" />
                      </>
                    )}
                  </button>
                </div>
              </div>
              )}

              {isAnalyzing && streamingText && (
                <div className="rounded-2xl p-5" style={{ background: `${TEAL}08`, border: `1px solid ${TEAL}30` }}>
                  <div className="flex items-center gap-2 mb-3">
                    <Loader2 className="h-4 w-4 animate-spin" style={{ color: TEAL }} />
                    <span className="text-[12px] font-bold uppercase tracking-widest" style={{ color: TEAL }}>
                      Live AI Feedback · {analyzeElapsed}s
                    </span>
                  </div>
                  <pre className="text-[13px] text-gray-700 whitespace-pre-wrap font-mono leading-relaxed max-h-80 overflow-y-auto" style={{ wordBreak: "break-word" }}>
                    {streamingText
                      .replace(/__DONE__/g, "")
                      .replace(/[{}\[\]"]/g, "")
                      .replace(/,\s*\n/g, "\n")
                      .replace(/^\s*\w+:\s*/gm, (m) => m.replace(/_/g, " "))
                      .trim()}<span className="inline-block w-2 h-4 ml-0.5 align-middle animate-pulse" style={{ background: TEAL }} />
                  </pre>
                </div>
              )}

              {error && (
                <div className="p-5 bg-red-50 rounded-2xl flex items-start gap-3" style={{ border: "1px solid #fecaca" }}>
                  <div className="w-8 h-8 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                  </div>
                  <div>
                    <h4 className="font-bold text-red-800 text-sm">Analysis Failed</h4>
                    <p className="text-[13px] text-red-600 mt-0.5">{error}</p>
                  </div>
                </div>
              )}

              {analysis && !isAnalyzing && (
                <>
                  <div className="flex items-center gap-3 pt-2">
                    <div className="h-px flex-1 bg-gray-200" />
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Analysis Results</span>
                    <div className="h-px flex-1 bg-gray-200" />
                  </div>
                  {analysis.taskType === "Paragraph"
                    ? <ParagraphResults analysis={analysis} originalText={text} />
                    : <IeltsResults analysis={analysis} originalEssay={text} />
                  }
                  <div className="rounded-2xl p-6 text-center" style={{ background: `linear-gradient(135deg, ${TEAL}08 0%, ${TEAL}15 100%)`, border: `1px solid ${TEAL}30` }}>
                    <div className="w-12 h-12 rounded-xl mx-auto mb-3 flex items-center justify-center" style={{ background: "white", border: `1px solid ${TEAL}30` }}>
                      <CheckCircle2 className="w-6 h-6" style={{ color: TEAL }} />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-1">Assignment complete!</h3>
                    <p className="text-[13px] text-gray-500 mb-5">Ready to move on to the next one?</p>
                    <button
                      onClick={handleNextAssignment}
                      className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-[14px] text-white transition-all hover:shadow-lg active:scale-[0.98]"
                      style={{
                        background: `linear-gradient(135deg, ${NAVY} 0%, #0C2A4A 100%)`,
                        boxShadow: `0 4px 16px ${NAVY}40`,
                      }}
                    >
                      Next Assignment
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="h-12" />
                </>
              )}
            </>
          )}

          {tab === "history" && (
            viewingLogId
              ? <LogDetailView logId={viewingLogId} onBack={() => setViewingLogId(null)} />
              : <HistoryView onViewLog={(id) => setViewingLogId(id)} />
          )}
        </div>
      </main>

      {showFeedback && (
        <FeedbackPopup tool="writing" onClose={() => setShowFeedback(false)} />
      )}
    </div>
  );
}
