export type Lang = "en" | "ar";

type Entry = { en: string; ar: string };

export const translations = {
  // ───────────────────────── COMMON ─────────────────────────
  "common.poweredByAi": { en: "Powered by EduLexo AI", ar: "Powered by EduLexo AI" },
  "common.exploreCourses": { en: "Explore Courses", ar: "استكشف الدورات" },
  "common.seeFeatures": { en: "See Features", ar: "اطّلع على المزايا" },
  "common.viewDetails": { en: "View Details", ar: "عرض التفاصيل" },
  "common.enrollNow": { en: "Enroll Now", ar: "سجّل الآن" },
  "common.backToHome": { en: "Back to home", ar: "العودة للرئيسية" },
  "common.createAccount": { en: "Create an account", ar: "إنشاء حساب" },
  "common.privacy": { en: "Privacy", ar: "الخصوصية" },
  "common.terms": { en: "Terms", ar: "الشروط" },
  "common.contact": { en: "Contact", ar: "تواصل معنا" },
  "common.copyright": { en: "Abu Omar EduLexo · Powered by EduLexo AI", ar: "Abu Omar EduLexo · Powered by EduLexo AI" },
  "common.tagline": { en: "Learn · Practice · Achieve", ar: "Learn · Practice · Achieve" },
  "common.brandPrefix": { en: "Abu Omar ", ar: "Abu Omar " },
  "common.brandSuffix": { en: "EduLexo", ar: "EduLexo" },

  // ───────────────────────── HEADER ─────────────────────────
  "nav.courses": { en: "Courses", ar: "الدورات" },
  "nav.features": { en: "Features", ar: "المزايا" },
  "nav.freeLessons": { en: "Free Lessons", ar: "دروس مجانية" },
  "nav.assessment": { en: "Level Assessment", ar: "تحديد المستوى" },
  "nav.affiliate": { en: "Become an Affiliate", ar: "كن شريكاً" },
  "header.login": { en: "Log In", ar: "تسجيل الدخول" },
  "header.signup": { en: "Sign Up", ar: "إنشاء حساب" },
  "header.dashboard": { en: "My Dashboard", ar: "لوحة التحكم" },
  "header.admin": { en: "Admin Panel", ar: "لوحة الإدارة" },
  "header.logout": { en: "Log Out", ar: "تسجيل الخروج" },
  "header.themeLight": { en: "Switch to light mode", ar: "التبديل للوضع الفاتح" },
  "header.themeDark": { en: "Switch to dark mode", ar: "التبديل للوضع الداكن" },
  "header.toggleMenu": { en: "Toggle menu", ar: "إظهار القائمة" },
  "header.accountMenu": { en: "Account menu", ar: "قائمة الحساب" },
  "header.langSwitchToEn": { en: "Switch to English", ar: "التبديل إلى الإنجليزية" },
  "header.langSwitchToAr": { en: "Switch to Arabic", ar: "التبديل إلى العربية" },

  // ───────────────────── PLATFORM LANDING (HOMEPAGE) ─────────────────────
  "platform.hero.alt": {
    en: "Abu Omar EduLexo — Learn · Practice · Achieve · Powered by EduLexo AI",
    ar: "Abu Omar EduLexo — Learn · Practice · Achieve · Powered by EduLexo AI",
  },
  "platform.hero.headline1": { en: "Two powerful courses.", ar: "مساران قويان…" },
  "platform.hero.headline2": { en: "One smart platform.", ar: "منصة ذكية واحدة." },
  "platform.hero.subtitle": {
    en: "Whether you're starting your journey from your first English words or aiming for an IELTS band 8 — Abu Omar EduLexo gives you AI-powered practice, native audio, bilingual support, and a real teacher beside you.",
    ar: "سواء كنت تبدأ من أولى خطواتك في تعلّم الإنجليزية، أو تسعى لتحقيق درجة 8 في اختبار IELTS — تقدّم لك منصة Abu Omar EduLexo تجربة متكاملة تجمع بين دروس أبو عمر المرئية، وتقنيات الذكاء الاصطناعي، والنطق الأصلي، والدعم الثنائي اللغة، مع إشراف مباشر يرافقك في كل خطوة حتى تحقق هدفك.",
  },
  "platform.products.eyebrow": { en: "Our Courses", ar: "دوراتنا" },
  "platform.products.title": { en: "Choose the right path for you", ar: "اختر المسار المناسب لك" },
  "platform.products.subtitle": {
    en: "Two complete courses, both built with the same AI-powered platform.",
    ar: "دورتان متكاملتان، كلتاهما مبنيّتان على المنصّة نفسها المدعومة بالذكاء الاصطناعي.",
  },
  "platform.products.courseOne": { en: "Course One", ar: "الدورة الأولى" },
  "platform.products.courseTwo": { en: "Course Two", ar: "الدورة الثانية" },
  "platform.products.englishName": { en: "LEXO for English", ar: "LEXO for English" },
  "platform.products.ieltsName": { en: "LEXO for IELTS", ar: "LEXO for IELTS" },
  "platform.products.englishDesc": {
    en: "Master everyday English from the ground up — built on the Oxford 3000 wordlist with native British audio, bilingual translations, and progressive packages from A1 to C1.",
    ar: "أتقن الإنجليزية اليوميّة من الصفر — مبنية على قائمة أكسفورد 3000 بصوت بريطاني أصلي وترجمات ثنائية اللغة وباقات متدرّجة من A1 إلى C1.",
  },
  "platform.products.ieltsDesc": {
    en: "Your AI-powered companion for IELTS success. Master vocabulary, ace your speaking and writing with Churchill & Orwell AI, and prepare with full mock tests for Listening and Reading.",
    ar: "رفيقك الذكي للنجاح في الأيلتس. أتقن المفردات، طوّر مهارات المحادثة والكتابة مع تشرشل وأورويل AI، واستعد باختبارات تجريبية كاملة للاستماع والقراءة.",
  },
  "platform.products.mostAdvanced": { en: "Most Advanced", ar: "الأكثر تطوّراً" },
  "platform.eng.h1": { en: "2,988 Oxford 3000 words", ar: "2,988 كلمة من أكسفورد 3000" },
  "platform.eng.h2": { en: "Native British audio", ar: "صوت بريطاني أصلي" },
  "platform.eng.h3": { en: "AI Speaking practice", ar: "تدريب على المحادثة بالذكاء الاصطناعي" },
  "platform.eng.h4": { en: "From A1 to C1", ar: "من A1 إلى C1" },
  "platform.ielts.h1": { en: "Churchill AI Speaking coach", ar: "مدرّب المحادثة تشرشل AI" },
  "platform.ielts.h2": { en: "Orwell AI essay checker", ar: "مدقّق المقالات أورويل AI" },
  "platform.ielts.h3": { en: "Listening + Reading tests", ar: "اختبارات استماع وقراءة" },
  "platform.ielts.h4": { en: "Full IELTS Mock Tests", ar: "اختبارات أيلتس تجريبية كاملة" },

  "platform.features.eyebrow": { en: "Why EduLexo", ar: "لماذا EduLexo" },
  "platform.features.title": {
    en: "What makes our platform different",
    ar: "ما الذي يميّز منصّتنا",
  },
  "platform.features.subtitle": {
    en: "Real AI tools, real native audio, real bilingual support — all wrapped in a clear path from beginner to fluent.",
    ar: "أدوات ذكاء اصطناعي حقيقية، وصوت أصلي حقيقي، ودعم ثنائي اللغة حقيقي — كل ذلك ضمن مسار واضح من المبتدئ إلى الطلاقة.",
  },
  "platform.feat1.title": { en: "AI-Powered Practice", ar: "تدريب بالذكاء الاصطناعي" },
  "platform.feat1.desc": {
    en: "Personal AI coaches for speaking and writing. Instant, detailed feedback.",
    ar: "مدرّبون شخصيّون بالذكاء الاصطناعي للمحادثة والكتابة، مع ملاحظات فوريّة ومفصّلة.",
  },
  "platform.feat2.title": { en: "Native Audio", ar: "صوت أصلي" },
  "platform.feat2.desc": {
    en: "Hear every word in clear native English — train your ear from day one.",
    ar: "اسمع كل كلمة بنطق إنجليزي أصلي وواضح، ودرّب أذنك من اليوم الأول.",
  },
  "platform.feat3.title": { en: "Bilingual EN ↔ AR", ar: "ثنائي اللغة EN ↔ AR" },
  "platform.feat3.desc": {
    en: "Every lesson, definition, and example available in both English and Arabic.",
    ar: "كل درس وتعريف ومثال متوفّر بالإنجليزيّة والعربيّة.",
  },
  "platform.feat4.title": { en: "Live Teacher Support", ar: "دعم من معلّم مباشر" },
  "platform.feat4.desc": {
    en: "Real teachers, not just bots. Get help from Abu Omar and the team.",
    ar: "معلّمون حقيقيّون لا روبوتات فقط — احصل على دعم من Abu Omar والفريق.",
  },
  "platform.feat5.title": { en: "Track Your Progress", ar: "تابع تقدّمك" },
  "platform.feat5.desc": {
    en: "Daily streaks, XP, weak-word decks, and clear path from A1 to C1 mastery.",
    ar: "سلاسل يوميّة، نقاط خبرة، كلمات الضعف، ومسار واضح من A1 إلى الإتقان C1.",
  },
  "platform.feat6.title": { en: "Built for Real Exams", ar: "مصمّم للامتحانات الحقيقيّة" },
  "platform.feat6.desc": {
    en: "Mock tests, exam-style questions, and grading that mirror the real IELTS.",
    ar: "اختبارات تجريبيّة وأسئلة على نمط الامتحان وتصحيح مطابق للأيلتس الحقيقي.",
  },

  "platform.cta.title": { en: "Ready to start your journey?", ar: "هل أنت مستعد لبدء رحلتك؟" },
  "platform.cta.subtitle": {
    en: "Pick the course that fits your goals. Both come with the full power of EduLexo.",
    ar: "اختر الدورة التي تناسب أهدافك. كلتاهما بكامل قدرات منصّة EduLexo.",
  },

  // ─────────────────── ENGLISH COURSE LANDING ───────────────────
  "english.eyebrow": { en: "EduLexo", ar: "EduLexo" },
  "english.hero.headline1": { en: "Master English", ar: "أتقن الإنجليزيّة" },
  "english.hero.headline2": { en: "the smart way.", ar: "بالطريقة الذكيّة." },
  "english.hero.subtitle": {
    en: "Your smart journey to learning English — built on the Oxford 3000, with native British audio and AI-powered practice. Video lessons with Abu Omar. Smart interactive exercises. Progress tracking that follows your level. From your first words to complete fluency, all in one place.",
    ar: "رحلتك الذكيّة لتعلّم الإنجليزيّة — مبنيّة على مفردات أكسفورد 3000، بصوت بريطاني أصلي، وتدريب بالذكاء الاصطناعي. دروس مرئيّة مع Abu Omar. تمارين تفاعليّة ذكيّة. متابعة لمستوى تقدّمك. من أولى الكلمات إلى الطلاقة الكاملة، كل ذلك في مكان واحد.",
  },
  "english.hero.cta1": { en: "Start Learning Free", ar: "ابدأ التعلّم مجاناً" },
  "english.hero.cta2": { en: "Try the Flashcards", ar: "جرّب البطاقات" },
  "english.highlight.audio": { en: "Native British Audio", ar: "صوت بريطاني أصلي" },
  "english.highlight.bilingual": { en: "Bilingual EN ↔ AR", ar: "ثنائي اللغة EN ↔ AR" },
  "english.highlight.cefr": { en: "CEFR Aligned", ar: "وفق إطار CEFR" },
  "english.highlight.teacher": { en: "Teacher Approved", ar: "بإشراف معلّم" },
  "english.brandAlt": {
    en: "LEXO for English — Master English the smart way",
    ar: "LEXO for English — أتقن الإنجليزية بالطريقة الذكية",
  },
  "english.preview.today": { en: "Today", ar: "اليوم" },
  "english.preview.british": { en: "British", ar: "بريطاني" },
  "english.preview.words": { en: "2,988 Oxford words", ar: "2,988 كلمة من أكسفورد" },
  "english.preview.families": { en: "75 families", ar: "75 مجموعة كلمات" },

  "english.packages.eyebrow": { en: "Three Programs", ar: "ثلاث باقات" },
  "english.packages.title": {
    en: "Pick the path for your level",
    ar: "اختر المسار المناسب لمستواك",
  },
  "english.packages.subtitle": {
    en: "Three carefully designed packages, one platform.",
    ar: "ثلاث باقات مصمّمة بعناية على منصّة واحدة.",
  },
  "english.packages.bestValue": { en: "BEST VALUE", ar: "الأفضل قيمةً" },
  "english.pkg1.label": { en: "Levels 1 – 3", ar: "المستويات 1 – 3" },
  "english.pkg1.name": { en: "Foundation Package", ar: "باقة التأسيس" },
  "english.pkg1.desc": {
    en: "From your first words to confident everyday conversation.",
    ar: "من أولى الكلمات إلى محادثات يوميّة بثقة.",
  },
  "english.pkg2.label": { en: "Levels 1 – 6", ar: "المستويات 1 – 6" },
  "english.pkg2.name": { en: "Mastery Package", ar: "باقة الإتقان" },
  "english.pkg2.desc": {
    en: "The full journey from first words to confident mastery — every level, every module.",
    ar: "الرحلة الكاملة من أولى الكلمات إلى الإتقان التام — جميع المستويات وكل الوحدات.",
  },
  "english.pkg3.label": { en: "Levels 4 – 6", ar: "المستويات 4 – 6" },
  "english.pkg3.name": { en: "Fluency Package", ar: "باقة الطلاقة" },
  "english.pkg3.desc": {
    en: "Polish, precision, and the vocabulary to express any idea.",
    ar: "إتقان ودقّة ومفردات تعبّر بها عن أي فكرة.",
  },

  "english.modules.eyebrow": { en: "What's Inside", ar: "ماذا يوجد بالداخل" },
  "english.modules.title": {
    en: "Everything you need, in one place",
    ar: "كل ما تحتاجه في مكان واحد",
  },
  "english.modules.subtitle": {
    en: "Vocabulary, lessons, speaking, writing, listening, reading & assessment.",
    ar: "مفردات ودروس ومحادثة وكتابة واستماع وقراءة وتقييم.",
  },
  "english.modules.live": { en: "Live", ar: "متاح الآن" },
  "english.modules.soon": { en: "Coming Soon", ar: "قريباً" },
  "english.modules.open": { en: "Open", ar: "افتح" },
  "english.mod.vocab.title": { en: "Vocabulary", ar: "المفردات" },
  "english.mod.vocab.desc": {
    en: "Oxford 3000 flashcards with native British audio, Arabic translations, and 75 themed Word Families.",
    ar: "بطاقات أكسفورد 3000 بصوت بريطاني أصلي وترجمات عربيّة و75 مجموعة كلمات مترابطة.",
  },
  "english.mod.lessons.title": { en: "Lessons", ar: "الدروس" },
  "english.mod.lessons.desc": {
    en: "Structured video lessons curated by your teacher, organized by package and level.",
    ar: "دروس فيديو منظّمة من إعداد معلّمك، مرتّبة حسب الباقة والمستوى.",
  },
  "english.mod.speaking.title": { en: "Speaking", ar: "المحادثة" },
  "english.mod.speaking.desc": {
    en: "Conversation practice with an AI partner — by voice or text. Build fluency at your own pace.",
    ar: "تدرّب على المحادثة مع مساعد ذكي بالصوت أو بالكتابة، وطوّر طلاقتك بإيقاعك.",
  },
  "english.mod.writing.title": { en: "Writing", ar: "الكتابة" },
  "english.mod.writing.desc": {
    en: "Submit writing homework and receive detailed AI feedback on grammar, structure, and style.",
    ar: "ارفع واجبات الكتابة واحصل على تقييم تفصيلي للقواعد والبنية والأسلوب.",
  },
  "english.mod.listening.title": { en: "Listening", ar: "الاستماع" },
  "english.mod.listening.desc": {
    en: "Audio lessons and homework to sharpen your ear for natural English.",
    ar: "دروس صوتيّة وواجبات لتطوير الاستماع للإنجليزيّة الطبيعيّة.",
  },
  "english.mod.reading.title": { en: "Reading", ar: "القراءة" },
  "english.mod.reading.desc": {
    en: "Short stories with multiple-choice questions to build comprehension and vocabulary in context.",
    ar: "قصص قصيرة مع أسئلة اختيار من متعدّد لتعزيز الفهم والمفردات في سياقها.",
  },
  "english.mod.test.title": { en: "Final Test", ar: "الاختبار النهائي" },
  "english.mod.test.desc": {
    en: "Comprehensive assessment to measure your progress and certify your level.",
    ar: "تقييم شامل لقياس تقدّمك واعتماد مستواك.",
  },

  "english.cta.title": { en: "Ready to start your journey?", ar: "هل أنت مستعد لبدء رحلتك؟" },
  "english.cta.subtitle": {
    en: "Try the Vocabulary module right now — no signup required.",
    ar: "جرّب وحدة المفردات الآن — دون الحاجة للتسجيل.",
  },
  "english.cta.button": { en: "Try the Demo", ar: "جرّب العرض التجريبي" },
  "english.footer.copyright": {
    en: "LEXO for English · Oxford 3000™ · Native British Audio",
    ar: "LEXO for English · Oxford 3000™ · صوت بريطاني أصلي",
  },
  "english.footer.brand": { en: "for English", ar: "for English" },

  // ─────────────────── IELTS COURSE ───────────────────
  "ielts.hero.headline1": { en: "Your AI companion", ar: "رفيقك الذكي" },
  "ielts.hero.headline2": { en: "for IELTS success.", ar: "للنجاح في الأيلتس." },
  "ielts.hero.subtitle": {
    en: "Master IELTS vocabulary, practice speaking with Churchill AI, get your essays graded by Orwell AI, and sit full mock tests for Listening and Reading — all in one platform.",
    ar: "أتقن مفردات الأيلتس، تدرّب على المحادثة مع تشرشل AI، احصل على تقييم مقالاتك من أورويل AI، واجلس لاختبارات تجريبية كاملة للاستماع والقراءة — كل ذلك في منصّة واحدة.",
  },
  "ielts.hero.cta1": { en: "Enroll Now", ar: "سجّل الآن" },
  "ielts.hero.cta2": { en: "See What's Inside", ar: "اطّلع على المحتوى" },
  "ielts.value.vocab": { en: "2,198 IELTS-tuned words", ar: "2,198 كلمة مخصّصة للأيلتس" },
  "ielts.value.coaches": { en: "AI Speaking + Writing coaches", ar: "مدرّبا محادثة وكتابة بالذكاء الاصطناعي" },
  "ielts.value.tests": { en: "Full Listening + Reading mock tests", ar: "اختبارات استماع وقراءة تجريبيّة كاملة" },
  "ielts.value.bilingual": { en: "Bilingual EN ↔ AR", ar: "ثنائي اللغة EN ↔ AR" },
  "ielts.brandAlt": {
    en: "LEXO for IELTS — AI-powered IELTS preparation",
    ar: "LEXO for IELTS — تحضير للأيلتس Powered by EduLexo AI",
  },
  "ielts.preview.vocab": { en: "Vocab", ar: "مفردات" },
  "ielts.preview.tests": { en: "Tests", ar: "اختبارات" },
  "ielts.preview.ai": { en: "AI", ar: "ذكاء" },
  "ielts.preview.coaches": { en: "2 Coaches", ar: "مدرّبان" },

  "ielts.modules.eyebrow": { en: "What's Inside", ar: "ماذا يوجد بالداخل" },
  "ielts.modules.title": {
    en: "Everything you need to ace IELTS",
    ar: "كل ما تحتاجه للنجاح في الأيلتس",
  },
  "ielts.modules.subtitle": {
    en: "Twelve integrated tools, two AI coaches, and full mock-test simulation.",
    ar: "اثنتا عشرة أداة متكاملة، ومدرّبان بالذكاء الاصطناعي، ومحاكاة كاملة للاختبار التجريبي.",
  },
  "ielts.modules.included": { en: "Included", ar: "مُضمَّن" },
  "ielts.mod.vocab.title": { en: "Vocabulary", ar: "المفردات" },
  "ielts.mod.vocab.desc": {
    en: "2,198 CEFR-corrected IELTS-tuned flashcards with Arabic translations and bilingual examples.",
    ar: "2,198 بطاقة مفردات مضبوطة على إطار CEFR ومخصّصة للأيلتس مع ترجمات عربية وأمثلة ثنائية اللغة.",
  },
  "ielts.mod.churchill.title": { en: "Churchill AI · Speaking", ar: "تشرشل AI · المحادثة" },
  "ielts.mod.churchill.desc": {
    en: "AI speaking coach with topic banks for IELTS Parts 1, 2 & 3. Practice anytime, get instant feedback.",
    ar: "مدرّب محادثة بالذكاء الاصطناعي مع بنوك أسئلة لأجزاء الأيلتس 1 و2 و3. تدرّب في أي وقت واحصل على ملاحظات فوريّة.",
  },
  "ielts.mod.orwell.title": { en: "Orwell AI · Writing", ar: "أورويل AI · الكتابة" },
  "ielts.mod.orwell.desc": {
    en: "Submit IELTS Task 1 & 2 essays — get a detailed band-score evaluation and improvement plan.",
    ar: "أرسل مقالات الأيلتس Task 1 و2 — واحصل على تقييم تفصيلي لدرجة Band مع خطة تحسين.",
  },
  "ielts.mod.listening.title": { en: "Listening Test", ar: "اختبار الاستماع" },
  "ielts.mod.listening.desc": {
    en: "Full IELTS-format listening sections with native audio and auto-grading.",
    ar: "أقسام استماع كاملة بصيغة الأيلتس بصوت أصلي وتصحيح تلقائي.",
  },
  "ielts.mod.reading.title": { en: "Reading Test", ar: "اختبار القراءة" },
  "ielts.mod.reading.desc": {
    en: "Authentic-style reading passages with timed practice and detailed answer explanations.",
    ar: "نصوص قراءة بنمط الامتحان مع تدريب مؤقّت وشرح تفصيلي للإجابات.",
  },
  "ielts.mod.mock.title": { en: "Full Mock Tests", ar: "اختبارات تجريبيّة كاملة" },
  "ielts.mod.mock.desc": {
    en: "Sit complete IELTS mock tests under exam conditions, with band-level grading.",
    ar: "اجلس لاختبارات أيلتس تجريبيّة كاملة بظروف الامتحان مع تصحيح بمستوى Band.",
  },
  "ielts.mod.chat.title": { en: "LEXO AI Chat", ar: "محادثة LEXO AI" },
  "ielts.mod.chat.desc": {
    en: "Ask anything IELTS-related: grammar, strategy, exam tips. Powered by Claude Sonnet.",
    ar: "اسأل أي شيء عن الأيلتس: قواعد، استراتيجية، نصائح للامتحان. مدعوم بـ Claude Sonnet.",
  },
  "ielts.mod.stories.title": { en: "Stories & Exercises", ar: "قصص وتمارين" },
  "ielts.mod.stories.desc": {
    en: "Reading-comprehension stories with AI-generated exercises to reinforce vocabulary in context.",
    ar: "قصص للفهم القرائي مع تمارين مولّدة بالذكاء الاصطناعي لتعزيز المفردات في سياقها.",
  },
  "ielts.mod.spell.title": { en: "Spell It Game", ar: "لعبة التهجئة" },
  "ielts.mod.spell.desc": {
    en: "Timed spelling challenges with text-to-speech to lock in spelling and pronunciation.",
    ar: "تحديات تهجئة مؤقّتة مع تحويل النص إلى كلام لتثبيت التهجئة والنطق.",
  },
  "ielts.mod.spaced.title": { en: "Spaced Repetition", ar: "التكرار المتباعد" },
  "ielts.mod.spaced.desc": {
    en: "SM-2 algorithm schedules reviews exactly when you're about to forget — proven memory science.",
    ar: "خوارزمية SM-2 تجدول المراجعة في الوقت الذي توشك فيه على النسيان — علم ذاكرة مُثبت.",
  },
  "ielts.mod.grammar.title": { en: "Grammar & Phrasal Verbs", ar: "القواعد والأفعال المركّبة" },
  "ielts.mod.grammar.desc": {
    en: "Topic-based grammar lessons, synonyms, antonyms, and a deep phrasal-verbs library.",
    ar: "دروس قواعد منظّمة بالمواضيع، مرادفات، أضداد، ومكتبة عميقة للأفعال المركّبة.",
  },
  "ielts.mod.streaks.title": { en: "Daily Streaks & Plans", ar: "السلاسل اليوميّة والخطط" },
  "ielts.mod.streaks.desc": {
    en: "Daily learning plans, XP, streak tracking, and a downloadable bilingual study plan PDF.",
    ar: "خطط تعلّم يوميّة ونقاط خبرة وسلاسل وملف PDF ثنائي اللغة قابل للتحميل.",
  },

  "ielts.cta.eyebrow": { en: "Enroll in LEXO for IELTS", ar: "سجّل في LEXO for IELTS" },
  "ielts.cta.title": {
    en: "Start your path to your target band",
    ar: "ابدأ مسارك نحو الدرجة المستهدفة",
  },
  "ielts.cta.subtitle": {
    en: "Sign up, choose your payment plan, and get instant access to the full IELTS course.",
    ar: "سجّل، اختر طريقة الدفع المناسبة، واحصل على وصول فوري لكامل دورة الأيلتس.",
  },
  "ielts.cta.button": { en: "Enroll Now", ar: "سجّل الآن" },
  "ielts.cta.back": { en: "Back to Platform", ar: "العودة للمنصّة" },
  "ielts.cta.note": {
    en: "Payment processing launches soon — sign up now to be the first to enroll.",
    ar: "خدمة الدفع ستُطلق قريباً — سجّل الآن لتكون من الأوائل.",
  },
  "ielts.footer.brand": { en: "LEXO for IELTS", ar: "LEXO for IELTS" },

  // ─────────────────── AUTH ───────────────────
  "auth.signup.title": { en: "Create your account", ar: "أنشئ حسابك" },
  "auth.signup.subtitle": {
    en: "Start learning with Abu Omar — it's free to sign up.",
    ar: "ابدأ التعلّم مع Abu Omar — التسجيل مجاني.",
  },
  "auth.signup.haveAccount": { en: "Already have an account?", ar: "لديك حساب بالفعل؟" },
  "auth.signup.fullName": { en: "Full name", ar: "الاسم الكامل" },
  "auth.signup.fullNamePh": { en: "Your full name", ar: "اسمك الكامل" },
  "auth.signup.email": { en: "Email", ar: "البريد الإلكتروني" },
  "auth.signup.emailPh": { en: "you@example.com", ar: "you@example.com" },
  "auth.signup.phone": { en: "Phone (optional)", ar: "الهاتف (اختياري)" },
  "auth.signup.phonePh": { en: "+971 50 123 4567", ar: "+971 50 123 4567" },
  "auth.signup.password": { en: "Password", ar: "كلمة المرور" },
  "auth.signup.passwordPh": { en: "At least 8 characters", ar: "8 أحرف على الأقل" },
  "auth.signup.confirm": { en: "Confirm password", ar: "تأكيد كلمة المرور" },
  "auth.signup.submit": { en: "Create account", ar: "إنشاء الحساب" },
  "auth.signup.errPasswordShort": {
    en: "Password must be at least 8 characters.",
    ar: "يجب أن تكون كلمة المرور 8 أحرف على الأقل.",
  },
  "auth.signup.errPasswordMismatch": {
    en: "Passwords do not match.",
    ar: "كلمتا المرور غير متطابقتين.",
  },
  "auth.signup.errFailed": { en: "Signup failed", ar: "فشل التسجيل" },

  "auth.login.title": { en: "Welcome back", ar: "مرحباً بعودتك" },
  "auth.login.subtitle": {
    en: "Log in to continue your learning journey.",
    ar: "سجّل دخولك لمتابعة رحلة التعلّم.",
  },
  "auth.login.newHere": { en: "New here?", ar: "جديد هنا؟" },
  "auth.login.email": { en: "Email", ar: "البريد الإلكتروني" },
  "auth.login.password": { en: "Password", ar: "كلمة المرور" },
  "auth.login.forgot": { en: "Forgot?", ar: "نسيت؟" },
  "auth.login.submit": { en: "Log in", ar: "تسجيل الدخول" },
  "auth.login.errFailed": { en: "Login failed", ar: "فشل تسجيل الدخول" },

  "auth.forgot.title": { en: "Forgot your password?", ar: "نسيت كلمة المرور؟" },
  "auth.forgot.subtitle": {
    en: "Enter your email and we'll send you a link to choose a new one.",
    ar: "أدخل بريدك الإلكتروني وسنرسل لك رابطاً لاختيار كلمة مرور جديدة.",
  },
  "auth.forgot.remembered": { en: "Remembered it?", ar: "تذكّرتها؟" },
  "auth.forgot.email": { en: "Email", ar: "البريد الإلكتروني" },
  "auth.forgot.submit": { en: "Send reset link", ar: "إرسال رابط الاستعادة" },
  "auth.forgot.errFailed": { en: "Something went wrong", ar: "حدث خطأ ما" },
  "auth.forgot.doneTitle": { en: "Check your inbox", ar: "تحقّق من بريدك" },
  "auth.forgot.doneBodyPrefix": {
    en: "If",
    ar: "إذا كان",
  },
  "auth.forgot.doneBodySuffix": {
    en: "is registered, we just sent a password-reset link to that address. The link expires in 60 minutes.",
    ar: "مُسجَّلاً، فقد أرسلنا رابطاً لإعادة تعيين كلمة المرور إلى ذلك العنوان. تنتهي صلاحية الرابط بعد 60 دقيقة.",
  },
  "auth.forgot.backToLogin": { en: "Back to log in", ar: "العودة لتسجيل الدخول" },

  "auth.reset.title": { en: "Choose a new password", ar: "اختر كلمة مرور جديدة" },
  "auth.reset.newPassword": { en: "New password", ar: "كلمة المرور الجديدة" },
  "auth.reset.newPasswordPh": { en: "At least 8 characters", ar: "8 أحرف على الأقل" },
  "auth.reset.confirm": { en: "Confirm new password", ar: "تأكيد كلمة المرور الجديدة" },
  "auth.reset.submit": { en: "Update password", ar: "تحديث كلمة المرور" },
  "auth.reset.errMissingToken": {
    en: "Missing reset token. Please use the link from your email.",
    ar: "رمز إعادة التعيين مفقود. يرجى استخدام الرابط من بريدك الإلكتروني.",
  },
  "auth.reset.errPasswordShort": {
    en: "Password must be at least 8 characters.",
    ar: "يجب أن تكون كلمة المرور 8 أحرف على الأقل.",
  },
  "auth.reset.errPasswordMismatch": {
    en: "Passwords do not match.",
    ar: "كلمتا المرور غير متطابقتين.",
  },
  "auth.reset.errFailed": { en: "Reset failed", ar: "فشل إعادة التعيين" },
  "auth.reset.doneTitle": { en: "Password updated", ar: "تم تحديث كلمة المرور" },
  "auth.reset.doneBody": {
    en: "Your password has been reset. You can now log in with your new password.",
    ar: "تمّت إعادة تعيين كلمة المرور. يمكنك الآن تسجيل الدخول بكلمة المرور الجديدة.",
  },
  "auth.reset.goLogin": { en: "Go to log in", ar: "الذهاب لتسجيل الدخول" },

  // ─────────────────── DASHBOARD ───────────────────
  "dashboard.eyebrow": { en: "My Dashboard", ar: "لوحة التحكم" },
  "dashboard.welcome": { en: "Welcome back,", ar: "مرحباً بعودتك،" },
  "dashboard.subtitle": {
    en: "Pick up where you left off, browse free lessons, or take the level assessment to find your starting point.",
    ar: "تابع من حيث توقّفت، تصفّح الدروس المجانية، أو اخضع لاختبار تحديد المستوى لمعرفة نقطة الانطلاق.",
  },
  "dashboard.action.ielts.title": { en: "LEXO for IELTS", ar: "LEXO for IELTS" },
  "dashboard.action.ielts.desc": {
    en: "Band 7+ in 12 weeks with AI-powered practice.",
    ar: "Band 7+ خلال 12 أسبوعاً مع تدريب بالذكاء الاصطناعي.",
  },
  "dashboard.action.english.title": { en: "LEXO for English", ar: "LEXO for English" },
  "dashboard.action.english.desc": {
    en: "Master Oxford 3000 and build everyday fluency.",
    ar: "أتقن مفردات أكسفورد 3000 وابنِ طلاقتك اليوميّة.",
  },
  "dashboard.action.assessment.title": { en: "Level Assessment", ar: "تحديد المستوى" },
  "dashboard.action.assessment.desc": {
    en: "Find out exactly where to begin — A1 to C2.",
    ar: "اعرف بدقّة من أين تبدأ — من A1 إلى C2.",
  },
  "dashboard.enrollments.title": { en: "My enrollments", ar: "تسجيلاتي" },
  "dashboard.enrollments.empty": {
    en: "You haven't enrolled in a course yet.",
    ar: "لم تسجّل في أي دورة بعد.",
  },
  "dashboard.enrollments.browseIelts": { en: "Browse LEXO for IELTS", ar: "تصفّح LEXO for IELTS" },
  "dashboard.enrollments.browseEnglish": { en: "Browse LEXO for English", ar: "تصفّح LEXO for English" },
  "dashboard.profile.title": { en: "My profile", ar: "ملفّي الشخصي" },
  "dashboard.profile.email": { en: "Email", ar: "البريد الإلكتروني" },
  "dashboard.profile.phone": { en: "Phone", ar: "الهاتف" },
  "dashboard.profile.accountType": { en: "Account type", ar: "نوع الحساب" },
  "dashboard.profile.admin": { en: "Administrator", ar: "مدير" },
  "dashboard.profile.student": { en: "Student", ar: "طالب" },
  "dashboard.profile.memberSince": { en: "Member since", ar: "عضو منذ" },

  // ─────────────────── COMING SOON ───────────────────
  "comingSoon.eyebrow": { en: "Coming soon", ar: "قريباً" },
  "comingSoon.freeLessons.title": { en: "Free Lessons", ar: "الدروس المجانيّة" },
  "comingSoon.freeLessons.desc": {
    en: "Sample lessons from LEXO for English and LEXO for IELTS — coming soon.",
    ar: "دروس نموذجيّة من LEXO for English وLEXO for IELTS — قريباً.",
  },
  "comingSoon.assessment.title": { en: "Level Assessment", ar: "تحديد المستوى" },
  "comingSoon.assessment.desc": {
    en: "Take a quick test and we'll place you on the right CEFR level — coming soon.",
    ar: "اخضع لاختبار سريع وسنحدّد مستواك على إطار CEFR — قريباً.",
  },
  "comingSoon.affiliate.title": { en: "Affiliate Program", ar: "برنامج الشراكة" },
  "comingSoon.affiliate.desc": {
    en: "Refer students and earn — full affiliate dashboard launching soon.",
    ar: "أحِل طلاباً واربح — لوحة الشراكة الكاملة ستُطلق قريباً.",
  },
  "comingSoon.admin.title": { en: "Admin Dashboard", ar: "لوحة الإدارة" },
  "comingSoon.admin.desc": {
    en: "Full admin tools — students, enrollments, FAQs, free lessons, affiliates, analytics — are coming in Iteration 4.",
    ar: "أدوات الإدارة الكاملة — الطلاب، التسجيلات، الأسئلة الشائعة، الدروس المجانية، الشركاء، التحليلات — قادمة في المرحلة الرابعة.",
  },
} as const;

export type TranslationKey = keyof typeof translations;
// Type-check: every entry must have both en and ar
type _CheckEntries = {
  [K in TranslationKey]: (typeof translations)[K] extends Entry ? true : never;
};
type _Check = _CheckEntries[TranslationKey];
const _check: _Check = true;
void _check;
