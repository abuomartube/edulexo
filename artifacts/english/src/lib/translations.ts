export type Lang = "en" | "ar";

export const translations = {
  brand: { en: "LEXO for English", ar: "ليكسو للإنجليزية" },
  brandTag: { en: "by Abu Omar EduLexo", ar: "من أبو عمر EduLexo" },
  langToggle: { en: "العربية", ar: "English" },

  // nav / shell
  nav_dashboard: { en: "Dashboard", ar: "لوحة التحكم" },
  nav_courses: { en: "My Courses", ar: "دوراتي" },
  nav_logout: { en: "Log out", ar: "تسجيل الخروج" },
  nav_redeem: { en: "Redeem code", ar: "استخدام كود" },

  // landing
  landing_eyebrow: {
    en: "Three packages • Bilingual EN/AR",
    ar: "ثلاث باقات • ثنائي اللغة",
  },
  landing_title: {
    en: "Master English at your own pace",
    ar: "أتقن الإنجليزية بإيقاعك الخاص",
  },
  landing_subtitle: {
    en: "A1 to C1 — a complete English learning ladder with AI-powered practice tools, built for Arab learners by Abu Omar.",
    ar: "من A1 إلى C1 — سلم تعلم متكامل مع أدوات تدريب ذكية، صُمم خصيصًا للطلاب العرب من قبل أبو عمر.",
  },

  // tiers (CEFR packages)
  tier_beginner: { en: "A1 – B1", ar: "A1 – B1" },
  tier_intermediate: { en: "B1+ – C1", ar: "B1+ – C1" },
  tier_advanced: { en: "Full Package A1 to C1", ar: "الباقة الشاملة A1 إلى C1" },
  tier_beginner_desc: {
    en: "Foundations: alphabet, pronunciation, 500 essential words, basic grammar, simple conversations.",
    ar: "الأساسيات: الحروف، النطق، 500 كلمة أساسية، قواعد مبتدئة، محادثات بسيطة.",
  },
  tier_intermediate_desc: {
    en: "Fluency push: conversation practice, reading, listening, 2,000+ word vocabulary.",
    ar: "نحو الطلاقة: تدريب محادثة، قراءة، استماع، أكثر من 2000 كلمة.",
  },
  tier_advanced_desc: {
    en: "Full A1–C1 access: professional writing, debates, idioms, and business communication.",
    ar: "وصول كامل A1–C1: كتابة احترافية، مناظرات، تعبيرات اصطلاحية، تواصل مهني.",
  },

  // dashboard
  dash_welcome: { en: "Welcome back", ar: "أهلًا بعودتك" },
  dash_currentTier: { en: "Your package", ar: "باقتك" },
  dash_noEnrollment: {
    en: "You don't have access to any English package yet.",
    ar: "ليس لديك صلاحية لأي باقة إنجليزية بعد.",
  },
  dash_redeemPrompt: {
    en: "Have an access code? Redeem it below to unlock your package.",
    ar: "لديك كود وصول؟ استخدمه أدناه لفتح باقتك.",
  },
  dash_redeemPlaceholder: {
    en: "Enter code (XXXX-XXXX-XXXX)",
    ar: "أدخل الكود",
  },
  dash_redeemBtn: { en: "Redeem", ar: "استخدم" },
  dash_locked: { en: "Locked", ar: "مقفل" },
  dash_unlocked: { en: "Unlocked", ar: "مفتوح" },
  dash_explore: { en: "Open lessons", ar: "افتح الدروس" },
  dash_comingSoon: { en: "Lessons coming soon", ar: "الدروس قريبًا" },

  // misc
  loading: { en: "Loading…", ar: "جاري التحميل…" },
  error: { en: "Something went wrong.", ar: "حدث خطأ ما." },
  redeemSuccess: { en: "Package unlocked! 🎉", ar: "تم فتح الباقة! 🎉" },
  authRequired: {
    en: "You need to sign in to continue.",
    ar: "تحتاج إلى تسجيل الدخول للمتابعة.",
  },
  goPlatform: {
    en: "Go to LEXO platform",
    ar: "اذهب إلى منصة LEXO",
  },

  // features previews
  feat_lessons: { en: "Structured video lessons", ar: "دروس فيديو منظمة" },
  feat_vocab: { en: "Smart vocabulary builder", ar: "بناء مفردات ذكي" },
  feat_speaking: { en: "AI conversation practice", ar: "تدريب محادثة ذكي" },
  feat_writing: {
    en: "Writing practice with AI feedback",
    ar: "كتابة مع تقييم ذكي",
  },
  feat_listening: { en: "Listening exercises", ar: "تمارين استماع" },
  feat_assessments: {
    en: "Placement & progress assessments",
    ar: "تقييمات تحديد المستوى والتقدم",
  },

  // tool choice hub
  hub_title: { en: "Choose Your Tool", ar: "اختر أداتك" },
  hub_subtitle: {
    en: "Practice English with AI-powered tools designed for your level.",
    ar: "تدرّب على الإنجليزية بأدوات ذكية مصممة لمستواك.",
  },
  hub_lessons: { en: "Lexo For English", ar: "Lexo للإنجليزية" },
  hub_lessons_desc: {
    en: "Watch structured video lessons and track your progress.",
    ar: "شاهد دروس فيديو منظمة وتابع تقدمك.",
  },
  les_locked_msg: {
    en: "This lesson belongs to another package.",
    ar: "هذا الدرس خاص بباقة أخرى.",
  },
  les_no_lessons: {
    en: "No lessons available for this level yet.",
    ar: "لا توجد دروس متاحة لهذا المستوى بعد.",
  },
  hub_flashcards: { en: "Flashcards", ar: "البطاقات" },
  hub_flashcards_desc: {
    en: "Build your vocabulary with smart flashcards and audio.",
    ar: "طوّر مفرداتك ببطاقات ذكية مع صوت.",
  },
  hub_speaking: { en: "Churchill Speaking", ar: "محادثة Churchill" },
  hub_speaking_desc: {
    en: "Practice everyday English conversations with a friendly AI tutor.",
    ar: "تدرّب على محادثات الإنجليزية اليومية مع معلم ذكي ودود.",
  },
  hub_writing: { en: "Orwell Writing", ar: "كتابة Orwell" },
  hub_writing_desc: {
    en: "Write paragraphs and get AI feedback on grammar, vocabulary, and clarity.",
    ar: "اكتب فقرات واحصل على تقييم ذكي للقواعد والمفردات والوضوح.",
  },
  hub_listening: { en: "Attenborough Listening", ar: "استماع Attenborough" },
  hub_listening_desc: {
    en: "Practice listening with audio exercises matched to your level.",
    ar: "تدرّب على الاستماع بتمارين صوتية مناسبة لمستواك.",
  },
  hub_reading: { en: "Hemingway Reading", ar: "قراءة Hemingway" },
  hub_reading_desc: {
    en: "Read passages and answer comprehension questions at your level.",
    ar: "اقرأ نصوصاً وأجب على أسئلة الفهم بمستواك.",
  },
  hub_stats: { en: "My Progress", ar: "تقدمي" },
  hub_stats_desc: {
    en: "Track your streak, scores, and overall improvement.",
    ar: "تابع سلسلتك ونتائجك وتحسنك العام.",
  },
  hub_locked: { en: "Locked", ar: "مقفل" },
  hub_locked_hint: {
    en: "Upgrade your package to unlock this tool.",
    ar: "قم بترقية باقتك لفتح هذه الأداة.",
  },
  hub_coming_soon: { en: "Coming soon", ar: "قريباً" },
  hub_back: { en: "Back to Dashboard", ar: "العودة للوحة" },
  hub_start: { en: "Start", ar: "ابدأ" },
  hub_eyebrow: { en: "Mentor AI · by Abu Omar", ar: "مرشد الذكاء الاصطناعي · من أبو عمر" },
  hub_hero_title: { en: "Your Personal English Mentor", ar: "مرشدك الشخصي للإنجليزية" },
  hub_hero_sub: {
    en: "Six AI tools. One goal — fluent, confident English.",
    ar: "ست أدوات ذكية. هدف واحد — إنجليزية بطلاقة وثقة.",
  },
  hub_pkg_label: { en: "Your package", ar: "باقتك" },

  // tool eyebrow tags
  tool_tag_speaking: { en: "Speaking", ar: "محادثة" },
  tool_tag_writing: { en: "Writing", ar: "كتابة" },
  tool_tag_listening: { en: "Listening", ar: "استماع" },
  tool_tag_reading: { en: "Reading", ar: "قراءة" },
  tool_tag_lessons: { en: "Lessons", ar: "دروس" },
  tool_tag_flashcards: { en: "Vocabulary", ar: "مفردات" },

  // tool subtitles
  tool_sub_churchill: { en: "AI Conversation Coach", ar: "مدرب محادثة ذكي" },
  tool_sub_orwell: { en: "AI Writing Analyst", ar: "محلل كتابة ذكي" },
  tool_sub_attenborough: { en: "Listening Coach", ar: "مدرب استماع" },
  tool_sub_hemingway: { en: "Reading Coach", ar: "مدرب قراءة" },
  tool_sub_lessons: { en: "Lexo For English", ar: "Lexo للإنجليزية" },
  tool_sub_flashcards: { en: "Oxford 3000 Vocabulary", ar: "مفردات Oxford 3000" },
  tool_lessons_name: { en: "Video Lessons", ar: "دروس مرئية" },
  tool_lessons_author: { en: "Abu Omar", ar: "أبو عمر" },
  tool_flashcards_name: { en: "Flashcards", ar: "البطاقات" },
  tool_flashcards_author: { en: "Oxford 3000", ar: "Oxford 3000" },

  // tool feature bullets — Churchill
  tool_churchill_b1: { en: "🎙️ Real-time voice conversations", ar: "🎙️ محادثات صوتية فورية" },
  tool_churchill_b2: { en: "🎯 Topics for every CEFR level", ar: "🎯 مواضيع لكل مستويات CEFR" },
  tool_churchill_b3: { en: "📊 Instant feedback & corrections", ar: "📊 تقييم وتصحيح فوري" },
  tool_churchill_b4: { en: "📝 Grammar & vocabulary upgrades", ar: "📝 تطوير القواعد والمفردات" },
  tool_churchill_b5: { en: "🤖 Trained on real teacher data", ar: "🤖 مدرب على بيانات معلمين حقيقيين" },

  // tool feature bullets — Orwell
  tool_orwell_b1: { en: "✍️ Paragraph & essay writing", ar: "✍️ كتابة فقرات ومقالات" },
  tool_orwell_b2: { en: "📚 Prompts for every level", ar: "📚 مواضيع لكل المستويات" },
  tool_orwell_b3: { en: "🎯 Detailed scoring on 4 criteria", ar: "🎯 تقييم مفصل على 4 معايير" },
  tool_orwell_b4: { en: "🔧 Grammar fixes & sample answers", ar: "🔧 تصحيحات وإجابات نموذجية" },
  tool_orwell_b5: { en: "📖 Bilingual EN/AR feedback", ar: "📖 تقييم ثنائي اللغة" },

  // tool feature bullets — Attenborough
  tool_atten_b1: { en: "🎧 Short, focused listening tests", ar: "🎧 اختبارات استماع قصيرة ومركزة" },
  tool_atten_b2: { en: "🗂️ A2 → C1 progression", ar: "🗂️ تدرّج من A2 إلى C1" },
  tool_atten_b3: { en: "🧠 MCQ, matching & completion", ar: "🧠 اختيار، مطابقة، إكمال" },
  tool_atten_b4: { en: "🎯 Instant scoring & review", ar: "🎯 تقييم ومراجعة فورية" },
  tool_atten_b5: { en: "🤖 Friendly AI feedback", ar: "🤖 تقييم ذكي ودود" },

  // tool feature bullets — Hemingway
  tool_heming_b1: { en: "📖 Authentic reading passages", ar: "📖 نصوص قراءة أصيلة" },
  tool_heming_b2: { en: "🗂️ A2, B1, B2 question banks", ar: "🗂️ بنوك أسئلة A2, B1, B2" },
  tool_heming_b3: { en: "✅ True/False, matching & more", ar: "✅ صح/خطأ، مطابقة والمزيد" },
  tool_heming_b4: { en: "🎯 Per-question explanations", ar: "🎯 شرح لكل سؤال" },
  tool_heming_b5: { en: "🏆 Progress tracking", ar: "🏆 تتبع التقدم" },

  // tool feature bullets — Lessons
  tool_lessons_b1: { en: "🎬 Curated video lessons", ar: "🎬 دروس فيديو مختارة" },
  tool_lessons_b2: { en: "📚 Organized by CEFR level", ar: "📚 منظمة حسب مستوى CEFR" },
  tool_lessons_b3: { en: "🇸🇦 Arabic-friendly explanations", ar: "🇸🇦 شروحات بالعربية" },
  tool_lessons_b4: { en: "⏱️ Watch at your own pace", ar: "⏱️ شاهد بإيقاعك الخاص" },

  // tool feature bullets — Flashcards
  tool_flash_b1: { en: "🎴 Oxford 3000 essential words", ar: "🎴 كلمات Oxford 3000 الأساسية" },
  tool_flash_b2: { en: "🔤 Word families & themes", ar: "🔤 عائلات وموضوعات الكلمات" },
  tool_flash_b3: { en: "🔊 Audio pronunciation", ar: "🔊 نطق صوتي" },
  tool_flash_b4: { en: "🇸🇦 Arabic translations", ar: "🇸🇦 ترجمة عربية" },
  hub_other_package: {
    en: "This content belongs to another package.",
    ar: "هذا المحتوى خاص بباقة أخرى.",
  },

  // Churchill Speaking
  churchill_title: { en: "Churchill Speaking", ar: "محادثة Churchill" },
  churchill_subtitle: {
    en: "Practice English conversations with a friendly AI tutor.",
    ar: "تدرّب على محادثات الإنجليزية مع معلم ذكي ودود.",
  },
  churchill_step_mode: { en: "Choose Mode", ar: "اختر الوضع" },
  churchill_mode_text: { en: "Text", ar: "كتابة" },
  churchill_mode_text_desc: {
    en: "Type your messages and practice writing in English.",
    ar: "اكتب رسائلك وتدرّب على الكتابة بالإنجليزية.",
  },
  churchill_mode_voice: { en: "Voice", ar: "صوت" },
  churchill_mode_voice_desc: {
    en: "Speak and listen in a real conversation.",
    ar: "تحدث واستمع في محادثة حقيقية.",
  },
  churchill_voice_coming_soon: {
    en: "Voice mode coming soon",
    ar: "وضع الصوت قريبًا",
  },
  churchill_step_level: { en: "Choose Level", ar: "اختر المستوى" },
  churchill_level_locked: {
    en: "This level belongs to another package.",
    ar: "هذا المستوى خاص بباقة أخرى.",
  },
  churchill_step_type: { en: "Conversation Type", ar: "نوع المحادثة" },
  churchill_type_free: { en: "Free Conversation", ar: "محادثة حرة" },
  churchill_type_free_desc: {
    en: "Chat about anything — let the conversation flow naturally.",
    ar: "تحدث عن أي شيء — دع المحادثة تسير بشكل طبيعي.",
  },
  churchill_type_topic: { en: "Topic-Based", ar: "حسب الموضوع" },
  churchill_type_topic_desc: {
    en: "Choose a topic and practice focused conversation.",
    ar: "اختر موضوعًا وتدرّب على محادثة مركزة.",
  },
  churchill_step_topic: { en: "Choose a Topic", ar: "اختر موضوعًا" },
  churchill_free_topic: { en: "General chat", ar: "محادثة عامة" },
  churchill_start: { en: "Start Conversation", ar: "ابدأ المحادثة" },
  churchill_send: { en: "Send", ar: "أرسل" },
  churchill_placeholder: {
    en: "Type your message…",
    ar: "اكتب رسالتك…",
  },
  churchill_end: {
    en: "Finish conversation & get feedback",
    ar: "إنهاء المحادثة والحصول على التقييم",
  },
  churchill_thinking: { en: "Churchill is typing…", ar: "Churchill يكتب…" },
  churchill_back: { en: "Back", ar: "رجوع" },
  churchill_new: { en: "New Conversation", ar: "محادثة جديدة" },
  churchill_welcome_greeting: {
    en: "Hi, I'm Churchill. Let's practice English together.",
    ar: "مرحباً، أنا تشرشل. خلنا نتدرّب على الإنجليزية مع بعض.",
  },
  churchill_welcome_ready: {
    en: "Ready to start?",
    ar: "مستعد تبدأ؟",
  },
  churchill_welcome_level: { en: "Level", ar: "المستوى" },
  churchill_welcome_mode_label: { en: "Mode", ar: "الوضع" },
  churchill_welcome_topic_label: { en: "Topic", ar: "الموضوع" },
  churchill_empty_hint: {
    en: "Try answering: What is your favorite food?",
    ar: "جرب تجاوب: ما هو أكلك المفضل؟",
  },
  churchill_feedback_title: { en: "Your Feedback Report", ar: "تقرير تقييمك" },
  churchill_feedback_summary: { en: "Overall Summary", ar: "ملخص عام" },
  churchill_feedback_grammar: { en: "Grammar", ar: "القواعد" },
  churchill_feedback_vocab: { en: "Vocabulary", ar: "المفردات" },
  churchill_feedback_expressions: { en: "Better Expressions", ar: "تعبيرات أفضل" },
  churchill_feedback_fluency: { en: "Fluency & Naturalness", ar: "الطلاقة والطبيعية" },
  churchill_feedback_tips: { en: "Tips for Improvement", ar: "نصائح للتحسين" },
  churchill_feedback_voice: {
    en: "Voice feedback coming soon.",
    ar: "تقييم المحادثة الصوتية قريبًا.",
  },
  churchill_feedback_loading: {
    en: "Churchill is preparing your feedback…",
    ar: "تشرشل يحضّر تقييمك…",
  },
  churchill_feedback_error: {
    en: "Could not generate feedback. Please try again.",
    ar: "لم نتمكن من إنشاء التقييم. حاول مرة أخرى.",
  },
  churchill_feedback_retry: { en: "Try again", ar: "حاول مرة أخرى" },
  churchill_feedback_original: { en: "You said", ar: "قلت" },
  churchill_feedback_correction: { en: "Better", ar: "الأفضل" },
  churchill_feedback_why: { en: "Why", ar: "لماذا" },
  churchill_no_messages: {
    en: "Have a conversation first to get feedback.",
    ar: "أجرِ محادثة أولاً للحصول على تقييم.",
  },

  // Orwell Writing
  orwell_title: { en: "Orwell Writing", ar: "كتابة Orwell" },
  orwell_subtitle: {
    en: "Practice paragraph writing with AI feedback on grammar, vocabulary, and structure.",
    ar: "تدرّب على كتابة الفقرات مع تقييم ذكي للقواعد والمفردات والتركيب.",
  },
  orwell_back: { en: "Back", ar: "رجوع" },
  orwell_step_level: { en: "Choose Level", ar: "اختر المستوى" },
  orwell_level_locked: {
    en: "This level belongs to another package.",
    ar: "هذا المستوى خاص بباقة أخرى.",
  },
  orwell_step_task: { en: "Choose a Writing Task", ar: "اختر مهمة كتابة" },
  orwell_your_task: { en: "Your Task", ar: "مهمتك" },
  orwell_placeholder: {
    en: "Write your paragraph here…",
    ar: "اكتب فقرتك هنا…",
  },
  orwell_submit: {
    en: "Submit & get feedback",
    ar: "أرسل واحصل على التقييم",
  },
  orwell_new: { en: "Write Again", ar: "اكتب مرة أخرى" },
  orwell_feedback_title: { en: "Your Writing Feedback", ar: "تقييم كتابتك" },
  orwell_feedback_loading: {
    en: "Orwell is reviewing your writing…",
    ar: "أورويل يراجع كتابتك…",
  },
  orwell_feedback_error: {
    en: "Could not generate feedback. Please try again.",
    ar: "لم نتمكن من إنشاء التقييم. حاول مرة أخرى.",
  },
  orwell_feedback_retry: { en: "Try again", ar: "حاول مرة أخرى" },
  orwell_fb_summary: { en: "Overall Summary", ar: "ملخص عام" },
  orwell_fb_corrected: { en: "Corrected Version", ar: "النسخة المصححة" },
  orwell_fb_improved: { en: "Improved Version", ar: "النسخة المحسّنة" },
  orwell_fb_show_corrected: { en: "Show corrected version", ar: "عرض النسخة المصححة" },
  orwell_fb_show_improved: { en: "Show improved version", ar: "عرض النسخة المحسّنة" },
  orwell_fb_grammar: { en: "Grammar", ar: "القواعد" },
  orwell_fb_vocab: { en: "Vocabulary", ar: "المفردات" },
  orwell_fb_sentences: { en: "Sentence Structure", ar: "بنية الجمل" },
  orwell_fb_organization: { en: "Paragraph Organization", ar: "تنظيم الفقرة" },
  orwell_fb_tips: { en: "Tips for Improvement", ar: "نصائح للتحسين" },

  // Attenborough Listening
  atten_title: { en: "Attenborough Listening", ar: "استماع Attenborough" },
  atten_subtitle: {
    en: "Practice listening comprehension with scripts and questions at your level.",
    ar: "تدرّب على فهم الاستماع مع نصوص وأسئلة مناسبة لمستواك.",
  },
  atten_back: { en: "Back", ar: "رجوع" },
  atten_step_level: { en: "Choose Level", ar: "اختر المستوى" },
  atten_level_locked: {
    en: "This level belongs to another package.",
    ar: "هذا المستوى خاص بباقة أخرى.",
  },
  atten_step_topic: { en: "Choose a Listening Topic", ar: "اختر موضوع استماع" },
  atten_loading: {
    en: "Attenborough is preparing your exercise…",
    ar: "أتينبورو يحضّر تمرينك…",
  },
  atten_error: {
    en: "Could not generate exercise. Please try again.",
    ar: "لم نتمكن من إنشاء التمرين. حاول مرة أخرى.",
  },
  atten_retry: { en: "Try again", ar: "حاول مرة أخرى" },
  atten_topics_error: {
    en: "Could not load topics. Please try again.",
    ar: "لم نتمكن من تحميل المواضيع. حاول مرة أخرى.",
  },
  atten_audio_soon: { en: "Audio coming soon", ar: "الصوت قريباً" },
  atten_questions: { en: "Questions", ar: "الأسئلة" },
  atten_short_placeholder: { en: "Type your answer…", ar: "اكتب إجابتك…" },
  atten_check: { en: "Check Answers", ar: "تحقق من الإجابات" },
  atten_score: { en: "Your Score", ar: "نتيجتك" },
  atten_vocab: { en: "Vocabulary from the Script", ar: "مفردات من النص" },
  atten_new: { en: "Try Another Exercise", ar: "جرّب تمرينًا آخر" },

  hem_title: { en: "Hemingway Reading", ar: "قراءة Hemingway" },
  hem_subtitle: {
    en: "Read passages and test your comprehension at your level",
    ar: "اقرأ نصوصًا واختبر فهمك حسب مستواك",
  },
  hem_back: { en: "Back", ar: "رجوع" },
  hem_step_level: { en: "Choose Level", ar: "اختر المستوى" },
  hem_level_locked: {
    en: "Locked",
    ar: "مقفل",
  },
  hem_step_topic: { en: "Choose a Reading Topic", ar: "اختر موضوع قراءة" },
  hem_loading: {
    en: "Generating your reading exercise…",
    ar: "جارٍ إنشاء تمرين القراءة…",
  },
  hem_error: {
    en: "Something went wrong. Please try again.",
    ar: "حدث خطأ. يرجى المحاولة مرة أخرى.",
  },
  hem_retry: { en: "Try again", ar: "حاول مرة أخرى" },
  hem_topics_error: {
    en: "Could not load topics. Please try again.",
    ar: "تعذر تحميل المواضيع. يرجى المحاولة مرة أخرى.",
  },
  hem_questions: { en: "Questions", ar: "الأسئلة" },
  hem_short_placeholder: { en: "Type your answer…", ar: "اكتب إجابتك…" },
  hem_check: { en: "Check Answers", ar: "تحقق من الإجابات" },
  hem_score: { en: "Your Score", ar: "نتيجتك" },
  hem_vocab: { en: "Vocabulary from the Passage", ar: "مفردات من النص" },
  hem_new: { en: "Try Another Exercise", ar: "جرّب تمرينًا آخر" },

  // Package details pages
  pkg_best_value: { en: "Best Value", ar: "أفضل قيمة" },
  pkg_start_course: { en: "Start the course", ar: "ابدأ الدورة" },
  pkg_complete_title: {
    en: "The complete journey from beginner to professional",
    ar: "رحلة كاملة من البداية حتى الاحتراف",
  },
  pkg_back: { en: "Back", ar: "رجوع" },
  pkg_view_details: { en: "View details", ar: "عرض التفاصيل" },
  pkg_cta_join: { en: "Join this course", ar: "التحق بهذه الدورة" },
  pkg_cta_hint: {
    en: "You will be redirected to the main platform to complete enrollment.",
    ar: "سيتم توجيهك إلى المنصة الرئيسية لإتمام التسجيل.",
  },
  pkg_section_learn: { en: "What you will learn", ar: "ماذا ستتعلم" },
  pkg_section_skills: { en: "Skills included", ar: "المهارات المتضمنة" },
  pkg_section_special: {
    en: "What makes this course special",
    ar: "ما يميز هذه الدورة",
  },
  pkg_section_audience: {
    en: "Who this course is for",
    ar: "لمن هذه الدورة",
  },

  // Skills
  pkg_skill_speaking: { en: "Churchill Speaking", ar: "محادثة Churchill" },
  pkg_skill_speaking_desc: {
    en: "Practice real conversations with a friendly AI tutor that adapts to your level.",
    ar: "تدرّب على محادثات حقيقية مع معلم ذكي ودود يتكيف مع مستواك.",
  },
  pkg_skill_writing: { en: "Orwell Writing", ar: "كتابة Orwell" },
  pkg_skill_writing_desc: {
    en: "Write paragraphs and essays with detailed AI feedback on grammar, vocabulary, and structure.",
    ar: "اكتب فقرات ومقالات مع تقييم ذكي مفصل للقواعد والمفردات والتركيب.",
  },
  pkg_skill_listening: {
    en: "Attenborough Listening",
    ar: "استماع Attenborough",
  },
  pkg_skill_listening_desc: {
    en: "Sharpen your listening skills with audio exercises and comprehension questions.",
    ar: "طوّر مهارات الاستماع بتمارين صوتية وأسئلة فهم.",
  },
  pkg_skill_reading: { en: "Hemingway Reading", ar: "قراءة Hemingway" },
  pkg_skill_reading_desc: {
    en: "Read engaging passages and test your comprehension with targeted questions.",
    ar: "اقرأ نصوصًا شيقة واختبر فهمك بأسئلة مركزة.",
  },
  pkg_skill_lessons: { en: "Video Lessons", ar: "دروس فيديو" },
  pkg_skill_lessons_desc: {
    en: "Structured Vimeo video lessons organized by CEFR level with progress tracking.",
    ar: "دروس فيديو منظمة حسب مستوى CEFR مع تتبع التقدم.",
  },

  // What makes this special
  pkg_special_ai: {
    en: "AI-powered practice across all skills",
    ar: "تدريب ذكي على جميع المهارات",
  },
  pkg_special_structured: {
    en: "Structured learning path from start to finish",
    ar: "مسار تعلم منظم من البداية للنهاية",
  },
  pkg_special_improvement: {
    en: "Real, measurable improvement in your English",
    ar: "تحسن حقيقي وملموس في إنجليزيتك",
  },

  // A1–B1 package
  pkg_a1b1_subtitle: {
    en: "Build a strong English foundation — from the alphabet to confident daily conversations.",
    ar: "ابنِ أساسًا قويًا في الإنجليزية — من الحروف إلى محادثات يومية واثقة.",
  },
  pkg_a1b1_level: { en: "CEFR A1 – B1", ar: "مستوى A1 – B1" },
  pkg_a1b1_learn1: {
    en: "Master the English alphabet, pronunciation, and phonics.",
    ar: "أتقن الحروف الإنجليزية والنطق والصوتيات.",
  },
  pkg_a1b1_learn2: {
    en: "Build a core vocabulary of 500+ essential everyday words.",
    ar: "ابنِ حصيلة أساسية من 500+ كلمة يومية ضرورية.",
  },
  pkg_a1b1_learn3: {
    en: "Learn foundational grammar: tenses, sentence structure, and common patterns.",
    ar: "تعلم القواعد الأساسية: الأزمنة، تركيب الجمل، والأنماط الشائعة.",
  },
  pkg_a1b1_learn4: {
    en: "Practice simple conversations for daily life situations.",
    ar: "تدرّب على محادثات بسيطة لمواقف الحياة اليومية.",
  },
  pkg_a1b1_learn5: {
    en: "Develop basic reading and listening comprehension skills.",
    ar: "طوّر مهارات القراءة والاستماع الأساسية.",
  },
  pkg_a1b1_audience: {
    en: "Perfect for complete beginners and those who want to rebuild their English from scratch. If you struggle with basic sentences or need confidence in everyday situations, this package is for you.",
    ar: "مثالي للمبتدئين تمامًا ولمن يريد إعادة بناء إنجليزيته من الصفر. إذا كنت تواجه صعوبة في الجمل الأساسية أو تحتاج ثقة في المواقف اليومية، هذه الباقة لك.",
  },

  // B1+–C1 package
  pkg_b1c1_subtitle: {
    en: "Push past the intermediate plateau — develop fluency, nuance, and professional-level English.",
    ar: "تجاوز مرحلة الركود المتوسطة — طوّر الطلاقة والدقة والإنجليزية المهنية.",
  },
  pkg_b1c1_level: { en: "CEFR B1+ – C1", ar: "مستوى B1+ – C1" },
  pkg_b1c1_learn1: {
    en: "Expand vocabulary to 2,000+ words including academic and professional terms.",
    ar: "وسّع مفرداتك لأكثر من 2000 كلمة تشمل المصطلحات الأكاديمية والمهنية.",
  },
  pkg_b1c1_learn2: {
    en: "Master complex grammar: conditionals, reported speech, passive voice, and more.",
    ar: "أتقن القواعد المتقدمة: الشرطية، الكلام المنقول، المبني للمجهول، والمزيد.",
  },
  pkg_b1c1_learn3: {
    en: "Practice extended conversations, debates, and opinion exchange.",
    ar: "تدرّب على محادثات مطولة ومناظرات وتبادل آراء.",
  },
  pkg_b1c1_learn4: {
    en: "Develop professional writing skills: emails, reports, and structured essays.",
    ar: "طوّر مهارات الكتابة المهنية: إيميلات وتقارير ومقالات منظمة.",
  },
  pkg_b1c1_learn5: {
    en: "Improve listening comprehension with native-speed audio and varied accents.",
    ar: "حسّن فهم الاستماع مع صوتيات بسرعة المتحدث الأصلي ولهجات متنوعة.",
  },
  pkg_b1c1_audience: {
    en: "Ideal for intermediate learners who understand basic English but want to become truly fluent. If you can have simple conversations but struggle with complex topics, professional settings, or nuanced expression, this is your next step.",
    ar: "مثالي للمتعلمين المتوسطين الذين يفهمون الإنجليزية الأساسية لكنهم يريدون الطلاقة الحقيقية. إذا كنت تستطيع إجراء محادثات بسيطة لكن تواجه صعوبة في المواضيع المعقدة أو بيئة العمل، هذه خطوتك القادمة.",
  },

  // Full package
  pkg_full_subtitle: {
    en: "The complete English mastery journey — from absolute beginner to advanced professional in one package.",
    ar: "رحلة إتقان الإنجليزية الكاملة — من مبتدئ تمامًا إلى مستوى مهني متقدم في باقة واحدة.",
  },
  pkg_full_level: { en: "CEFR A1 – C1 (Full Access)", ar: "مستوى A1 – C1 (وصول كامل)" },
  pkg_full_learn1: {
    en: "Everything in A1–B1 and B1+–C1 packages combined.",
    ar: "كل ما في باقتي A1–B1 و B1+–C1 مجتمعًا.",
  },
  pkg_full_learn2: {
    en: "Seamless progression from foundations through advanced mastery.",
    ar: "تقدم سلس من الأساسيات إلى الإتقان المتقدم.",
  },
  pkg_full_learn3: {
    en: "Access all CEFR levels: A1, A2, B1, B1+, B2, and C1.",
    ar: "وصول لجميع مستويات CEFR: من A1 إلى C1.",
  },
  pkg_full_learn4: {
    en: "Business communication, academic writing, debates, and idioms.",
    ar: "تواصل مهني، كتابة أكاديمية، مناظرات، وتعبيرات اصطلاحية.",
  },
  pkg_full_learn5: {
    en: "Unlimited access to all AI tools at every level.",
    ar: "وصول غير محدود لجميع أدوات الذكاء الاصطناعي في كل المستويات.",
  },
  pkg_full_audience: {
    en: "Best value for serious learners who want the complete journey. Whether you're starting from zero or already intermediate, you get full access to every level, every tool, and every lesson — no restrictions, no upgrades needed.",
    ar: "أفضل قيمة للمتعلمين الجادين الذين يريدون الرحلة الكاملة. سواء كنت تبدأ من الصفر أو متوسط بالفعل، ستحصل على وصول كامل لكل المستويات والأدوات والدروس — بدون قيود أو ترقيات.",
  },
} as const;

export type TranslationKey = keyof typeof translations;
