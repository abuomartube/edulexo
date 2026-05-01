const SAMPLE_HEADLINE = "أتقن الإنجليزيّة بالطريقة الذكيّة";
const SAMPLE_BODY =
  "رحلتك الذكيّة لتعلّم الإنجليزيّة — مبنيّة على مفردات أكسفورد 3000، بصوت بريطاني أصلي، وتدريب بالذكاء الاصطناعي. دروس مرئيّة مع Abu Omar وتمارين تفاعليّة ذكيّة.";
const SAMPLE_NAV = ["الدورات", "المزايا", "دروس مجانية", "تحديد المستوى", "كن شريكاً"];
const SAMPLE_BUTTON = "ابدأ التعلّم مجاناً";

type FontSample = {
  id: string;
  name: string;
  family: string;
  vibe: string;
  best: string;
};

const FONTS: FontSample[] = [
  {
    id: "1",
    name: "Cairo (current)",
    family: "'Cairo', sans-serif",
    vibe: "Modern · clean · tech-forward",
    best: "Default. Geometric letters, very legible at all sizes.",
  },
  {
    id: "2",
    name: "Tajawal",
    family: "'Tajawal', sans-serif",
    vibe: "Minimalist · friendly · neutral",
    best: "Designed in Latin/Arabic harmony — pairs perfectly with Inter.",
  },
  {
    id: "3",
    name: "IBM Plex Sans Arabic",
    family: "'IBM Plex Sans Arabic', sans-serif",
    vibe: "Premium · editorial · corporate",
    best: "Looks like a serious learning brand (think Coursera/IBM).",
  },
  {
    id: "4",
    name: "Readex Pro",
    family: "'Readex Pro', sans-serif",
    vibe: "Warm · distinctive · contemporary",
    best: "Built for high readability, slightly playful character.",
  },
  {
    id: "5",
    name: "Almarai",
    family: "'Almarai', sans-serif",
    vibe: "Soft · approachable · everyday",
    best: "Comfortable for long body text, very Gulf/MSA-friendly.",
  },
  {
    id: "6",
    name: "El Messiri",
    family: "'El Messiri', sans-serif",
    vibe: "Sophisticated · semi-traditional",
    best: "Beautiful blend of modern and classical — strong personality.",
  },
  {
    id: "7",
    name: "Noto Kufi Arabic",
    family: "'Noto Kufi Arabic', sans-serif",
    vibe: "Geometric kufic · sharp · architectural",
    best: "Bold display look — great for headlines, less for body.",
  },
];

export default function FontSamples() {
  const params = new URLSearchParams(window.location.search);
  const start = Number(params.get("start") || "1");
  const end = Number(params.get("end") || String(FONTS.length));
  const visible = FONTS.filter((f) => Number(f.id) >= start && Number(f.id) <= end);
  return (
    <div dir="rtl" lang="ar" className="min-h-screen bg-slate-50 dark:bg-slate-950 py-12 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="mb-10 text-center">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2" style={{ fontFamily: "'Inter', sans-serif" }}>
            Arabic Font Samples
          </h1>
          <p className="text-slate-600 dark:text-slate-400" style={{ fontFamily: "'Inter', sans-serif" }}>
            Pick the one you like best — I'll make it the default everywhere.
          </p>
        </div>

        <div className="space-y-6">
          {visible.map((font) => (
            <div
              key={font.id}
              className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 shadow-sm"
            >
              <div className="flex items-start justify-between mb-6 gap-4" dir="ltr">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 font-bold">
                      {font.id}
                    </span>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white" style={{ fontFamily: "'Inter', sans-serif" }}>
                      {font.name}
                    </h2>
                  </div>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-2" style={{ fontFamily: "'Inter', sans-serif" }}>
                    <span className="font-semibold">Vibe:</span> {font.vibe}
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400" style={{ fontFamily: "'Inter', sans-serif" }}>
                    <span className="font-semibold">Best for:</span> {font.best}
                  </p>
                </div>
              </div>

              <div style={{ fontFamily: font.family }}>
                {/* Big headline */}
                <h3 className="text-4xl md:text-5xl font-extrabold text-slate-900 dark:text-white leading-tight mb-4">
                  {SAMPLE_HEADLINE}
                </h3>

                {/* Body */}
                <p className="text-lg text-slate-700 dark:text-slate-300 leading-relaxed mb-6">
                  {SAMPLE_BODY}
                </p>

                {/* Nav-style row */}
                <div className="flex flex-wrap gap-6 mb-6 text-base text-slate-700 dark:text-slate-300 font-medium">
                  {SAMPLE_NAV.map((item) => (
                    <span key={item}>{item}</span>
                  ))}
                </div>

                {/* Button */}
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-violet-600 to-blue-600 px-6 py-3 text-white font-semibold text-base shadow-lg"
                >
                  {SAMPLE_BUTTON}
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center text-sm text-slate-500 dark:text-slate-400" style={{ fontFamily: "'Inter', sans-serif" }}>
          Tell me the number (1–7) you prefer and I'll apply it across the whole site.
        </div>
      </div>
    </div>
  );
}
