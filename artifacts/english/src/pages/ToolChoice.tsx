import { useT, useLanguage } from "@/lib/i18n";
import { ArrowLeft } from "lucide-react";
import type { EnglishEnrollment } from "@/lib/api";
import { bestTier } from "@/lib/api";
import type { TranslationKey } from "@/lib/translations";

type ToolId =
  | "speaking"
  | "writing"
  | "listening"
  | "reading"
  | "lessons"
  | "flashcards";

const BASE_URL = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

interface PortraitCard {
  id: ToolId;
  image: string;
  imgFit: "top" | "center";
  tagKey: TranslationKey;
  nameKey: TranslationKey;
  subKey: TranslationKey;
  bullets: TranslationKey[];
  color: string;
  rgba: (a: number) => string;
}

const TOP_ROW: PortraitCard[] = [
  {
    id: "speaking",
    image: `${BASE_URL}/churchill.png`,
    imgFit: "top",
    tagKey: "tool_tag_speaking",
    nameKey: "hub_speaking",
    subKey: "tool_sub_churchill",
    bullets: [
      "tool_churchill_b1",
      "tool_churchill_b2",
      "tool_churchill_b3",
      "tool_churchill_b4",
      "tool_churchill_b5",
    ],
    color: "#00B4C8",
    rgba: (a) => `rgba(0,180,200,${a})`,
  },
  {
    id: "writing",
    image: `${BASE_URL}/orwell.png`,
    imgFit: "top",
    tagKey: "tool_tag_writing",
    nameKey: "hub_writing",
    subKey: "tool_sub_orwell",
    bullets: [
      "tool_orwell_b1",
      "tool_orwell_b2",
      "tool_orwell_b3",
      "tool_orwell_b4",
      "tool_orwell_b5",
    ],
    color: "#F5C518",
    rgba: (a) => `rgba(245,197,24,${a})`,
  },
  {
    id: "listening",
    image: `${BASE_URL}/attenborough.png`,
    imgFit: "center",
    tagKey: "tool_tag_listening",
    nameKey: "hub_listening",
    subKey: "tool_sub_attenborough",
    bullets: [
      "tool_atten_b1",
      "tool_atten_b2",
      "tool_atten_b3",
      "tool_atten_b4",
      "tool_atten_b5",
    ],
    color: "#6EE7B7",
    rgba: (a) => `rgba(110,231,183,${a})`,
  },
  {
    id: "reading",
    image: `${BASE_URL}/hemingway.png`,
    imgFit: "top",
    tagKey: "tool_tag_reading",
    nameKey: "hub_reading",
    subKey: "tool_sub_hemingway",
    bullets: [
      "tool_heming_b1",
      "tool_heming_b2",
      "tool_heming_b3",
      "tool_heming_b4",
      "tool_heming_b5",
    ],
    color: "#A78BFA",
    rgba: (a) => `rgba(167,139,250,${a})`,
  },
];

const BOTTOM_ROW: PortraitCard[] = [
  {
    id: "lessons",
    image: `${BASE_URL}/abu-omar.png`,
    imgFit: "top",
    tagKey: "tool_tag_lessons",
    nameKey: "tool_lessons_name",
    subKey: "tool_sub_lessons",
    bullets: [
      "tool_lessons_b1",
      "tool_lessons_b2",
      "tool_lessons_b3",
      "tool_lessons_b4",
    ],
    color: "#7C3AED",
    rgba: (a) => `rgba(124,58,237,${a})`,
  },
  {
    id: "flashcards",
    image: `${BASE_URL}/flashcards-cover.png`,
    imgFit: "center",
    tagKey: "tool_tag_flashcards",
    nameKey: "tool_flashcards_name",
    subKey: "tool_sub_flashcards",
    bullets: [
      "tool_flash_b1",
      "tool_flash_b2",
      "tool_flash_b3",
      "tool_flash_b4",
    ],
    color: "#10B981",
    rgba: (a) => `rgba(16,185,129,${a})`,
  },
];

const PACKAGE_LABELS: Record<string, { en: string; ar: string }> = {
  beginner: { en: "A1 – B1", ar: "A1 – B1" },
  intermediate: { en: "B1+ – C1", ar: "B1+ – C1" },
  advanced: { en: "Full Package A1 to C1", ar: "الباقة الشاملة A1 إلى C1" },
};

interface Props {
  enrollments: EnglishEnrollment[];
  onBack: () => void;
  onNavigate: (toolId: string) => void;
}

export default function ToolChoice({ enrollments, onBack, onNavigate }: Props) {
  const t = useT();
  const { lang } = useLanguage();
  const best = bestTier(enrollments);

  const renderCard = (c: PortraitCard) => (
    <button
      key={c.id}
      onClick={() => onNavigate(c.id)}
      className="group flex flex-col items-center transition-all hover:scale-[1.02] active:scale-[0.98] text-start"
    >
      <div className="relative mb-[-40px] z-10">
        <div
          className="absolute inset-[-20px] rounded-full blur-2xl opacity-40 group-hover:opacity-60 transition-opacity duration-500"
          style={{
            background: `radial-gradient(circle, ${c.color} 0%, transparent 70%)`,
          }}
        />
        <img
          src={c.image}
          alt={t(c.nameKey)}
          className={`relative w-44 h-56 sm:w-48 sm:h-60 object-cover rounded-2xl drop-shadow-2xl ${
            c.imgFit === "top" ? "object-top" : "object-center"
          }`}
          style={{ border: `2px solid ${c.rgba(0.3)}` }}
        />
      </div>

      <div
        className="relative w-full rounded-2xl pt-14 pb-5 px-5 text-center overflow-hidden"
        style={{
          background: "rgba(255,255,255,0.04)",
          border: `1px solid ${c.rgba(0.25)}`,
          backdropFilter: "blur(12px)",
        }}
      >
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
          style={{
            background: `linear-gradient(180deg, ${c.rgba(0.1)} 0%, ${c.rgba(0.02)} 100%)`,
          }}
        />
        <div className="relative space-y-3">
          <div>
            <div
              className="inline-block px-2.5 py-0.5 rounded-full text-[9px] font-black tracking-[0.2em] uppercase mb-1"
              style={{
                background: c.rgba(0.15),
                color: c.color,
              }}
            >
              {t(c.tagKey)}
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white leading-tight">
              {t(c.nameKey)}
            </h2>
            <p className="text-[11px] font-semibold text-white/50">
              {t(c.subKey)}
            </p>
          </div>
          <ul
            className={`text-xs text-white/75 leading-relaxed space-y-1.5 ${lang === "ar" ? "text-right" : "text-left"}`}
          >
            {c.bullets.map((bk) => (
              <li key={bk} className="flex items-start gap-2">
                <span>{t(bk)}</span>
              </li>
            ))}
          </ul>
          <div
            className="flex items-center justify-center gap-1.5 pt-2 text-[11px] font-bold uppercase tracking-wider"
            style={{ color: c.color }}
          >
            {t("hub_start")} <span>{lang === "ar" ? "←" : "→"}</span>
          </div>
        </div>
      </div>
    </button>
  );

  return (
    <div
      className="min-h-screen text-white"
      style={{
        background:
          "linear-gradient(160deg, #071422 0%, #0A1A30 40%, #0C2040 100%)",
      }}
    >
      <div className="mx-auto max-w-6xl px-4 py-6 sm:py-10">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-sm text-white/50 hover:text-white/80 transition mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("hub_back")}
        </button>

        {/* Hero */}
        <div className="text-center space-y-3 pt-2 pb-8">
          <div
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[11px] font-black tracking-[0.2em] uppercase"
            style={{
              background:
                "linear-gradient(135deg, rgba(0,180,200,0.15), rgba(245,197,24,0.15))",
              border: "1px solid rgba(0,180,200,0.35)",
              color: "#00B4C8",
            }}
          >
            {t("hub_eyebrow")}
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-[1.05] max-w-3xl mx-auto">
            {t("hub_hero_title")}
          </h1>
          <p className="text-white/70 text-sm sm:text-base max-w-xl mx-auto font-medium">
            {t("hub_hero_sub")}
          </p>
          {best && (
            <p className="pt-1 text-xs text-white/50">
              {t("hub_pkg_label")}:{" "}
              <span className="font-bold text-white">
                {PACKAGE_LABELS[best]?.[lang] ?? best}
              </span>
            </p>
          )}
        </div>

        {/* Top row: 4 character portrait cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-5 lg:gap-6 w-full pt-12">
          {TOP_ROW.map(renderCard)}
        </div>

        {/* Bottom row: VIDEO LESSONS + Flashcards (same portrait style) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8 mt-16 max-w-3xl mx-auto pt-12">
          {BOTTOM_ROW.map(renderCard)}
        </div>
      </div>
    </div>
  );
}
