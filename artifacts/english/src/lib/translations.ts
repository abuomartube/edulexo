export type Lang = "en" | "ar";

export const translations = {
  brand: { en: "LEXO for English", ar: "ليكسو للإنجليزية" },
  brandTag: { en: "by Abu Omar EduLexo", ar: "من أبو عمر EduLexo" },
  langToggle: { en: "العربية", ar: "English" },

  // nav / shell
  nav_dashboard: { en: "Dashboard", ar: "لوحة التحكم" },
  nav_courses: { en: "My Courses", ar: "دوراتي" },
  nav_logout: { en: "Log out", ar: "تسجيل الخروج" },
  nav_signIn: { en: "Sign in", ar: "تسجيل الدخول" },
  nav_redeem: { en: "Redeem code", ar: "استخدام كود" },

  // landing
  landing_eyebrow: { en: "Three tiers • Bilingual EN/AR", ar: "ثلاثة مستويات • ثنائي اللغة" },
  landing_title: {
    en: "Master English at your own pace",
    ar: "أتقن الإنجليزية بإيقاعك الخاص",
  },
  landing_subtitle: {
    en: "Beginner, intermediate, and advanced — a complete English learning ladder built for Arab learners by Abu Omar.",
    ar: "مبتدئ، متوسط، ومتقدم — سلم تعلم متكامل صُمم خصيصًا للطلاب العرب من قبل أبو عمر.",
  },
  landing_cta_enroll: { en: "Enroll now", ar: "سجل الآن" },
  landing_cta_signin: { en: "I have an account", ar: "لدي حساب" },

  // tiers
  tier_beginner: { en: "Beginner", ar: "مبتدئ" },
  tier_intermediate: { en: "Intermediate", ar: "متوسط" },
  tier_advanced: { en: "Advanced", ar: "متقدم" },
  tier_beginner_desc: {
    en: "Foundations: alphabet, pronunciation, 500 essential words, basic grammar.",
    ar: "الأساسيات: الحروف، النطق، 500 كلمة أساسية، قواعد مبتدئة.",
  },
  tier_intermediate_desc: {
    en: "Conversation, reading, listening practice, 2,000 word vocabulary push.",
    ar: "محادثة، قراءة، استماع، توسيع المفردات إلى 2000 كلمة.",
  },
  tier_advanced_desc: {
    en: "Fluency, advanced writing, debates, idioms, professional communication.",
    ar: "طلاقة، كتابة متقدمة، مناظرات، تعبيرات اصطلاحية، تواصل احترافي.",
  },

  // dashboard
  dash_welcome: { en: "Welcome back", ar: "أهلًا بعودتك" },
  dash_currentTier: { en: "Your current tier", ar: "مستواك الحالي" },
  dash_noEnrollment: {
    en: "You don't have access to any English tier yet.",
    ar: "ليس لديك صلاحية لأي مستوى من اللغة الإنجليزية بعد.",
  },
  dash_redeemPrompt: {
    en: "Have an access code? Redeem it below to unlock your tier.",
    ar: "لديك كود وصول؟ استخدمه أدناه لفتح مستواك.",
  },
  dash_redeemPlaceholder: { en: "Enter code (XXXX-XXXX-XXXX)", ar: "أدخل الكود" },
  dash_redeemBtn: { en: "Redeem", ar: "استخدم" },
  dash_locked: { en: "Locked", ar: "مقفل" },
  dash_unlocked: { en: "Unlocked", ar: "مفتوح" },
  dash_explore: { en: "Open lessons", ar: "افتح الدروس" },
  dash_comingSoon: { en: "Lessons coming soon", ar: "الدروس قريبًا" },

  // misc
  loading: { en: "Loading…", ar: "جاري التحميل…" },
  error: { en: "Something went wrong.", ar: "حدث خطأ ما." },
  redeemSuccess: { en: "Tier unlocked! 🎉", ar: "تم فتح المستوى! 🎉" },
  authRequired: {
    en: "You need to sign in to continue.",
    ar: "تحتاج إلى تسجيل الدخول للمتابعة.",
  },
  goPlatform: {
    en: "Go to LEXO platform",
    ar: "اذهب إلى منصة LEXO",
  },

  // features previews
  feat_lessons: { en: "Structured lessons", ar: "دروس منظمة" },
  feat_vocab: { en: "Smart vocabulary builder", ar: "بناء مفردات ذكي" },
  feat_speaking: { en: "Speaking & pronunciation", ar: "محادثة ونطق" },
  feat_writing: { en: "Writing practice with AI feedback", ar: "كتابة مع تقييم ذكي" },
  feat_listening: { en: "Listening exercises", ar: "تمارين استماع" },
  feat_assessments: { en: "Placement & progress assessments", ar: "تقييمات تحديد المستوى والتقدم" },
} as const;

export type TranslationKey = keyof typeof translations;
