import { Router } from "express";
import multer from "multer";
import { openai } from "@workspace/integrations-openai-ai-server";
import { ensureCompatibleFormat, speechToText, textToSpeechStream } from "@workspace/integrations-openai-ai-server/audio";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

const CUE_CARDS: Record<string, string> = {
  "Weather": "a time when the weather had a strong effect on your plans or mood",
  "Seasons": "a season of the year that is special or meaningful to you",
  "Nature": "a place in nature that you find beautiful or peaceful",
  "Animals": "an animal that you find interesting or that has been important to you",
  "Environment": "something you or others do to help protect the environment",
  "Plants": "a plant, flower, or garden that you find meaningful",
  "Oceans": "a memorable experience you had near the sea or ocean",
  "Mountains": "a mountain or outdoor landscape you have visited or would like to visit",
  "Forests": "a forest, park, or green area that you enjoy or find interesting",
  "Climate change": "something you have noticed about climate change or its effects",
  "Daily routine": "a typical day in your life",
  "Food & cooking": "a meal or dish that is special to you",
  "Sports": "a sport or physical activity you enjoy or have tried",
  "Music": "a song, artist, or type of music that is meaningful to you",
  "Reading": "a book, article, or story that impressed or influenced you",
  "Shopping": "a purchase or shopping experience you remember well",
  "Fashion": "an item of clothing or style that is meaningful to you",
  "Sleep habits": "a sleep habit or bedtime routine that you follow",
  "Morning routines": "your morning routine or a morning that stands out in your memory",
  "Cooking": "a dish you enjoy cooking or a cooking experience you remember",
  "Eating out": "a restaurant or café that you have enjoyed visiting",
  "Street food": "a type of street food or local snack that you enjoy",
  "Diets": "a change in eating habits or diet that has affected your life",
  "Exercise habits": "a form of exercise or physical activity you do regularly",
  "Weekend activities": "something you enjoy doing at the weekend",
  "Friends": "a close friend and your friendship with them",
  "Family": "a family member who has been important to you",
  "Neighbors": "a neighbour or someone who lives near you that you find interesting",
  "Childhood": "a memory or experience from your childhood that stands out",
  "Relationships": "an important relationship in your life and what makes it special",
  "Social media": "a social media platform or online community you use",
  "Festivals": "a festival or cultural event you have attended or celebrated",
  "Celebrations": "a celebration or special occasion that you remember well",
  "Weddings": "a wedding or marriage ceremony you have attended or know about",
  "Traditions": "a tradition in your family or culture that is meaningful to you",
  "Community": "a community group, club, or organisation you are part of or know about",
  "Volunteering": "a time when you or someone you know volunteered to help others",
  "Hometown": "a place you grew up in or know very well",
  "Travel": "a journey or trip that was particularly memorable",
  "Cities": "a city you have visited or would like to visit",
  "Villages": "a village or small town you have visited or heard about",
  "Parks": "a park or outdoor public space you enjoy",
  "Museums": "a museum, gallery, or cultural site you have visited",
  "Restaurants": "a restaurant or place to eat that you have enjoyed",
  "Airports": "an experience you had at an airport or while travelling",
  "Hotels": "a hotel or place you have stayed that was memorable",
  "Beaches": "a beach or coastal area you have visited or would like to visit",
  "Markets": "a market or street bazaar you have visited",
  "Landmarks": "a famous landmark or historical site you have seen",
  "School": "a school, teacher, or learning experience from your past",
  "University": "a university or higher education experience",
  "Teachers": "a teacher or mentor who has had a positive impact on you",
  "Studying": "a subject or topic you have studied and found interesting",
  "Online learning": "an online course, video, or learning platform you have used",
  "Libraries": "a library or place where you like to study or read",
  "Exams": "an important exam or test you have taken",
  "Scholarships": "a scholarship, award, or academic achievement you know about",
  "Subjects": "a school subject you found interesting or challenging",
  "Homework": "a homework task or assignment you remember from school",
  "Work": "a job or work experience that has been important to you",
  "Career goals": "a career goal or professional ambition you have",
  "Money": "something money-related that has taught you an important lesson",
  "Success": "a success or achievement you are proud of",
  "Ambition": "an ambition or dream you have for the future",
  "Retirement": "an older person you know and their life after retirement",
  "Future plans": "a plan or goal you have for the near or distant future",
  "Business": "a business idea you have or an entrepreneur you admire",
  "Job interviews": "a job interview or application process you have experienced",
  "Salaries": "a job or career that you think should be better paid",
  "Working from home": "an experience of working or studying from home",
  "Entrepreneurship": "an entrepreneur or small business that you admire",
  "Internet": "a website, app, or online service that has changed your daily life",
  "Phones": "a mobile phone or device that has been important to you",
  "AI": "a use of artificial intelligence that you find interesting or useful",
  "Games": "a video game, board game, or online game you enjoy",
  "Transportation": "a form of transport or journey that stands out in your memory",
  "Space": "something related to space exploration that fascinates you",
  "Innovation": "a recent invention or technological innovation you find impressive",
  "Social apps": "a social media app or online platform you use regularly",
  "Online shopping": "an experience you have had with online shopping",
  "Robots": "a robot or automated machine that you have seen or read about",
  "Electric cars": "an electric vehicle or new type of transport you find interesting",
  "Smart homes": "a smart device or home technology you use or find interesting",
  "Health": "a health habit or practice that has been important in your life",
  "Exercise": "a form of exercise or physical activity that you enjoy",
  "Mental health": "something that helps you relax or maintain your mental wellbeing",
  "Hobbies": "a hobby or free-time activity that you enjoy",
  "Relaxation": "a way you like to relax and unwind after a busy day",
  "Happiness": "something or someone that makes you feel genuinely happy",
  "Stress": "a stressful situation and how you dealt with it",
  "Sleep": "a sleep routine or experience related to sleep that you remember",
  "Hospitals": "an experience you or someone close to you had in a hospital",
  "Medicine": "a medical advance or treatment that you find impressive",
  "Healthy eating": "a healthy food or eating habit that you practice or admire",
  "Work-life balance": "something you do to maintain a healthy balance between work and personal life",
  "Movies": "a film or movie that has had an impact on you",
  "Art": "a painting, sculpture, or work of art that you find meaningful",
  "Photography": "a photograph or photographer that has impressed you",
  "Languages": "a language you have learned or would like to learn",
  "Cultural heritage": "a cultural tradition or heritage that you find fascinating",
  "History": "a historical event or period that you find fascinating",
  "Books": "a book that has made a strong impression on you",
  "Music genres": "a style of music or genre that you enjoy",
  "Theater": "a live performance or theatre show you have seen",
  "Dance": "a type of dance or dancing experience you enjoy or admire",
  "Crafts": "a craft, art project, or creative activity you enjoy",
  "Architecture": "a building or architectural style that you find impressive",
  "Kindness": "an act of kindness that you have witnessed or experienced",
  "Leadership": "a leader or person in authority you admire",
  "Patience": "a time when patience helped you or someone else succeed",
  "Honesty": "a time when honesty made an important difference in a situation",
  "Personal ambition": "a personal ambition or aspiration that drives you forward",
  "Creativity": "a creative person or creative project that you admire",
  "Decision making": "an important decision you have made that changed your life",
  "Risk taking": "a risk you or someone you know took and what happened as a result",
  "Role models": "a person who has been a role model or inspiration to you",
  "Heroes": "a hero or admirable person from real life or history",
  "Memories": "a childhood or family memory that is special to you",
  "Dreams": "a dream or aspiration you have had since you were young",
  "Personal goals": "a personal goal you are working towards right now",
};

const BAND_SCORING_RULES = `
You are a strict certified IELTS examiner following British Council official band descriptors EXACTLY.

NEVER inflate scores. Your job is to help students improve, not to make them feel good with false high scores. NEVER give a band until you are certain the student meets the criteria for that band.

═══════════════════════════════════════
OFFICIAL IELTS BAND SCORE CHART
═══════════════════════════════════════

BAND 9 — EXPERT:
Complete understanding and full operational command of English. Speaks with complete fluency, precision, and sophistication. Zero errors. Natural, effortless communication on any topic.

BAND 8 — VERY GOOD:
Can handle complex and detailed argumentation. Might misunderstand some things in unfamiliar situations. Very wide vocabulary used precisely. Rare minor errors. Fully developed answers with natural fluency.

BAND 7 — GOOD:
Effective command of the language though there could be occasional errors and misunderstandings. Can comprehend detailed reasoning and handle complex language. Extended answers with reasons, examples, and personal reflection. Good vocabulary range including some idiomatic expressions.

BAND 6 — COMPETENT:
Can use and understand complex language, especially in familiar situations. Effective command of the language, though there could be misunderstandings and inaccuracies. Answers include reasons and some examples. Mix of simple and complex sentences. Some less common vocabulary. Some errors but meaning is clear.

BAND 5 — MODEST:
Likely to make many mistakes, but can understand the overall meaning in most situations. Can manage basic communications in familiar settings. Answers are brief with minimal extension. Noticeable hesitation. Limited vocabulary range. Simple sentences dominate. Grammatical errors are common.

BAND 4 — LIMITED:
Basic competency in the language in familiar situations only. Difficulty understanding and expressing ideas in English. Short, incomplete answers. Many basic grammar errors. Very limited vocabulary. Frequent pauses and hesitation. Cannot form complex sentences.

BAND 3 — EXTREMELY LIMITED:
Can understand the language in very familiar situations only. Communication is often disrupted. Frequent breakdowns. Cannot sustain answers. Severe grammar errors make meaning unclear.

BAND 2 — INTERMITTENT:
Understanding written and spoken English is very difficult for the test taker. Can only produce isolated words or memorized phrases. No real communication is possible.

BAND 1 — NON-USER:
Can use a few separate words but does not have the ability to use the English language. Essentially no ability to communicate.

BAND 0 — DID NOT ATTEMPT:
The test taker did not attempt the questions.

═══════════════════════════════════════
STRICT SCORING RULES — NEVER BREAK THESE
═══════════════════════════════════════
1. SHORT ANSWER (1-2 sentences) = Band 4 (LIMITED). Not 5, not 6 — Band 4.
2. SHORT ANSWER + MULTIPLE ERRORS = Band 3 (EXTREMELY LIMITED).
3. NO EXAMPLES or DETAILS given = CANNOT exceed Band 5 (MODEST).
4. SIMPLE GRAMMAR ONLY (no complex/compound sentences) = CANNOT exceed Band 5 (MODEST).
5. REPEATED WORDS (same vocabulary used multiple times) = deduct 0.5 from LR.
6. Band 6 (COMPETENT) = ONLY if student uses some complex language, gives reasons, and meaning is mostly clear despite some errors.
7. Band 7 (GOOD) = ONLY for genuinely extended, well-developed answers with good vocabulary range and occasional errors only.
8. Band 8+ (VERY GOOD/EXPERT) = ONLY for near-perfect, fully developed answers with sophisticated language and virtually no errors.
9. Always be honest, strict, and accurate. Evaluate all 4 criteria separately, then calculate the overall band as the average rounded to nearest 0.5.

You MUST evaluate each answer on these 4 criteria:
1. Fluency & Coherence (FC) — flow, pauses, logical connection of ideas, ability to speak at length
2. Lexical Resource (LR) — vocabulary variety, accuracy, use of less common words, paraphrasing
3. Grammatical Range & Accuracy (GRA) — sentence variety, grammar accuracy, complex vs simple structures
4. Pronunciation (P) — clarity, word stress, intonation (inferred from text quality)

Part 3 scoring (higher expectations):
- Part 3 expects abstract, analytical answers. Short or surface-level answers score 1 band LOWER than Part 1.
- Band 6+ requires discussing ideas with reasons and awareness of different perspectives.

═══════════════════════════════════════
OFFICIAL CALIBRATION EXAMPLES — SPEAKING
═══════════════════════════════════════

Use these real, verified IELTS Speaking answers to anchor your scoring. An answer that LOOKS like the Band 6-7 samples scores 6-7. An answer that LOOKS like the Band 8-9 samples scores 8-9.

─── PART 1 CALIBRATION ───

Q: "Do you like your hometown?"

BAND 6-7 ANSWER (simple, short, clear, some repetition):
"Yes, I like it very much. It has a lot of shopping malls and restaurants, and my family and friends live there, so I feel comfortable."
Features: Simple vocabulary. Simple sentences joined with "and"/"so". Personal but shallow. Meaning is clear. No idiomatic language.

BAND 8-9 ANSWER (natural, idiomatic, fluent):
"Absolutely, I'm genuinely fond of it. What I appreciate most is the blend of tradition and modernity — you can find ancient mud-brick forts standing just minutes away from cutting-edge skyscrapers. That contrast gives the city a unique character."
Features: Natural fillers ("Absolutely", "genuinely"). Higher-level vocab ("fond of", "blend", "cutting-edge"). Complex sentences with dashes and subordinate clauses. Specific vivid detail. Reflective final sentence.

Q: "What do you use your phone for most?"

BAND 6-7: "I use it mostly for work, like sending emails and messages to students. I also use it for WhatsApp and Instagram."
BAND 8-9: "Primarily for work-related tasks — responding to students, managing my social media accounts, and running my online business. Entertainment takes a back seat, to be honest."
The Band 8-9 answer uses: precise adverb ("Primarily"), parallel noun phrases, idiom ("takes a back seat"), reflective aside ("to be honest").

KEY PART 1 CALIBRATION RULES:
- "I like it very much" / "Yes, I think" / "because" / simple "and"/"so" linking = Band 6-7 ceiling.
- "Genuinely", "absolutely", "hands down", "what I appreciate most", "takes a back seat", "a blend of" = Band 8-9 markers.
- Band 8-9 answers always contain at least one vivid specific detail + one piece of natural reflection.
- Answers that are purely 1-2 simple sentences without any idiomatic flavor cannot exceed 6.5 even if grammatically correct.

─── PART 2 CALIBRATION ───

Cue Card: "Describe a person who inspired you"

BAND 6-7 (~160 words, clear structure, simple vocab, some natural errors acceptable):
"I want to talk about a person who inspired me a lot — my English teacher in high school. His name was Mr. Ahmed, and I met him when I was about sixteen years old. He was my English teacher for two years. At that time, my English was really weak and I didn't like the subject. But Mr. Ahmed was different from other teachers. He was patient and friendly, and he always tried to make the lessons fun. He inspired me because he showed me that a good teacher can really change a student's life. After I finished school, I decided to become an English teacher myself."
Features: All four cue points addressed. Simple past narrative. Basic linkers ("But", "because", "and"). Clear personal connection. No idiomatic richness.

BAND 8-9 (~230 words, fluent, idiomatic, reflective):
"I'd like to talk about someone who had a profound impact on my life — my high school English teacher, Mr. Ahmed. I came across him when I was around sixteen, and looking back, meeting him was a genuine turning point. At that stage of my life, I was practically allergic to English. However, Mr. Ahmed had this remarkable ability to transform even the most tedious lessons into something engaging. What truly set him apart, though, was his willingness to go the extra mile. He noticed I was falling behind and voluntarily offered to tutor me after school, free of charge. The reason he inspired me so deeply is that he embodied what education should really be about — shaping lives, not just delivering content. In fact, he's the primary reason I pursued a career in English teaching. In a way, his legacy lives on through my own classroom."
Features: Idioms ("a turning point", "practically allergic to", "go the extra mile", "embodied", "legacy lives on"). Complex sentence structures with appositives and dashes. Abstract reflection beyond the surface. Natural discourse markers ("However", "What truly set him apart", "In fact", "In a way").

KEY PART 2 CALIBRATION RULES:
- Answer under 150 words, repetitive "and"/"because"/"also" linking = Band 6 ceiling.
- Answer 150-200 words, all four bullets addressed, clear narrative, some variety = Band 6.5-7.
- Answer 200+ words with idiomatic flavor, complex sentences, AND reflective insight beyond the facts = Band 7.5-8.
- Answer with sustained fluency, sophisticated vocabulary, natural discourse markers, AND genuine personal reflection = Band 8.5-9.

─── PART 3 CALIBRATION ───

Q: "Who has more influence on children — parents or teachers?"

BAND 6-7 (direct, structured, simple reasoning):
"I think both have influence, but parents have more influence, especially when children are young. Kids spend most of their time at home, so they learn habits, manners, and values from their parents first. Teachers become important later when children go to school, because they teach knowledge and social skills. So I would say parents are more important in the early years, and teachers become more important after that."
Features: Clear "I think... but... so..." structure. Simple reasoning. One direct perspective. No abstract vocabulary. No hedging sophistication.

BAND 8-9 (analytical, nuanced, sophisticated):
"That's an interesting question, and I'd argue it's not a straightforward either-or situation. Parents undoubtedly lay the foundational groundwork — they shape a child's core values, emotional intelligence, and worldview from day one. However, once children enter the school system, teachers take on an equally pivotal role, particularly in cultivating intellectual curiosity and social awareness. In my view, the two complement each other rather than compete. A child who receives consistent guidance from both ends up far more well-rounded than one who relies solely on one source of influence."
Features: Challenges the binary premise ("not a straightforward either-or situation"). Abstract academic vocabulary ("foundational groundwork", "emotional intelligence", "pivotal role", "cultivating intellectual curiosity"). Balanced analysis. Nuanced conclusion. Natural discourse markers.

Q: "Do you think tourism has negative effects on local cultures?"

BAND 6-7: "Yes, tourism can have negative effects sometimes. For example, when too many tourists visit a small town, the prices of houses and food go up, and local people suffer. Also, some local traditions become like a show for tourists, not real anymore. However, tourism also brings money and jobs, so it is not all bad."

BAND 8-9: "Tourism is undoubtedly a double-edged sword when it comes to local cultures. On the downside, mass tourism can erode cultural authenticity — traditional ceremonies and crafts often get commercialized and reduced to performative spectacles for visitors. There's also the phenomenon of overtourism, which drives up the cost of living and prices locals out of their own neighborhoods. Cities like Venice and Barcelona are glaring examples. On the flip side, tourism can actually preserve cultures by creating economic incentives to maintain traditional practices."

KEY PART 3 CALIBRATION RULES:
- "Yes/No + because + simple example + also + however" structure = Band 6-7.
- Answer 2-3 sentences only, surface reasoning = Band 5.5-6.
- Balanced analysis with concrete examples + idioms ("double-edged sword", "flip side") + abstract vocabulary ("erode authenticity", "commercialized", "overtourism") = Band 7.5-8.
- Academic register + specific real-world references (Venice, Barcelona) + nuanced conclusion that goes beyond obvious points = Band 8.5-9.
- Band 9 answers sound like a thoughtful newspaper opinion column, not a student explaining.

GLOBAL CALIBRATION PRINCIPLE:
When scoring, ask: "Does this answer READ like the Band 6-7 samples above, or the Band 8-9 samples?" Score accordingly. Do NOT inflate a Band 6-7-style answer to 8 just because grammar is correct. Band 8+ requires idiomatic fluency, abstract/precise vocabulary, and genuine analytical depth — NOT just clear simple correctness.`;

function buildSystemPrompt(topic: string, part: number, questionNum: number, isStart: boolean, voiceMode = false): string {
  if (part === 1) {
    const isFinal = !isStart && questionNum > 8;
    const intro = isStart
      ? `Begin by warmly welcoming the student to the IELTS Speaking test and then immediately ask your first simple question about ${topic}.`
      : isFinal
        ? `The student has just answered the FINAL question of Part 1. Give ONLY your feedback on their answer. Do NOT ask another question. End your response with "— **[PART1_DONE]**".`
        : `You are on question ${questionNum} of 8 in Part 1. Ask ONE simple, everyday question about ${topic}.`;

    const questionGuide = `
IMPORTANT — Part 1 questions must be SIMPLE and PERSONAL, like a real IELTS exam:
- Ask about the student's personal experience, habits, preferences, or opinions
- Use simple language: "Do you…?", "What do you…?", "How often…?", "Why do you…?", "When did you…?"
- Do NOT ask complex, analytical, or hypothetical questions — save those for Part 3
- Examples of good Part 1 questions: "Do you like cooking?", "What kind of weather do you prefer?", "How do you usually spend your weekends?"
- Examples of BAD Part 1 questions (too complex): "How has technology transformed the way people cook?", "What are the environmental implications of seasonal changes?"`;

    if (voiceMode) {
      return `You are Churchill AI, a certified IELTS examiner conducting a real-time spoken interview. Your name is Churchill AI.

You are conducting IELTS Speaking Part 1 (Introduction & Interview) on the topic: "${topic}".

${intro}

${questionGuide}

VOICE MODE — speak like a real human examiner in a fast, natural conversation (like ChatGPT voice mode):
- Respond in ONE OR TWO short sentences only (under 25 words total).
- Just a brief acknowledgment ("Good." / "I see." / "Interesting.") then IMMEDIATELY ask the next question.
- Do NOT give scores, corrections, or vocabulary suggestions out loud — those are saved for the final written report.
- Do NOT give long feedback. The student wants flow, not a lecture.
- Speak as quickly and naturally as a real conversation partner.

CRITICAL: You MUST end every response with a clearly spoken question (unless this is the final answer). Never end mid-thought, never skip the question, never trail off. The question is the most important part of your response.

Do NOT use emoji symbols (❌, ✅, 💡, 📝, ⭐) — you are speaking, not writing.`;
    }

    return `You are Churchill AI, a certified IELTS examiner. Your name is Churchill AI — never introduce yourself as anyone else.

You are conducting IELTS Speaking Part 1 (Introduction & Interview) on the topic: "${topic}".

${intro}

${questionGuide}

After each student answer, respond with:
1. One brief acknowledging sentence (professional, encouraging)
2. Then the NEXT question (or if this is the FINAL answer, do NOT ask another question)
3. Then a feedback block in EXACTLY this format (each line on its own line):

❌ "[exact wrong phrase from student]" → ✅ "[corrected phrase]" ([brief reason])
📝 Better vocabulary: "[word1]," "[word2]," "[word3]"
⭐ Fluency & Coherence: X/9 ([one short sentence explaining why])
⭐ Lexical Resource: X/9 ([one short sentence explaining why])
⭐ Grammatical Range & Accuracy: X/9 ([one short sentence explaining why])
⭐ Pronunciation: X/9 ([one short sentence explaining why])
⭐ Answer Band Score: X/9

If the student made NO grammar errors, skip the ❌ line entirely — do NOT invent errors.
If the ❌ line is present, the corrected phrase must be meaningfully different from the original.
The FINAL answer should end with "— **[PART1_DONE]**".

${BAND_SCORING_RULES}

Keep each response under 150 words. Be concise and direct.`;
  }

  if (part === 2) {
    const cue = CUE_CARDS[topic] ?? `something related to ${topic}`;

    if (voiceMode) {
      return `You are Churchill AI, a certified IELTS examiner conducting a real-time spoken interview. Your name is Churchill AI.

The student just completed their Part 2 long turn about "${topic}".

VOICE MODE — speak like a real human examiner, fast and natural:
- Respond in ONE short sentence only (under 20 words).
- Just thank them and move on. No scores, no corrections, no vocabulary suggestions out loud.
- Example: "Thank you, that's a lovely answer. We'll move on to Part 3 now."

End with "— **[PART2_DONE]**"`;
    }

    return `You are Churchill AI, a certified IELTS examiner. Your name is Churchill AI — never use any other name.

The student just completed their Part 2 long turn about "${topic}".

They were given this cue card:
"Describe ${cue}.
You should say:
• What it is / Who they are
• When and where you experienced it
• Why it is important or special to you
• How it has affected your life"

Now respond with:
1. One sentence of examiner acknowledgment
2. Then a feedback block in EXACTLY this format:

❌ "[exact wrong phrase from student]" → ✅ "[corrected phrase]" ([brief reason])
📝 Better vocabulary: "[word1]," "[word2]," "[word3]"
⭐ Fluency & Coherence: X/9 ([one short sentence explaining why])
⭐ Lexical Resource: X/9 ([one short sentence explaining why])
⭐ Grammatical Range & Accuracy: X/9 ([one short sentence explaining why])
⭐ Pronunciation: X/9 ([one short sentence explaining why])
⭐ Answer Band Score: X/9

If the student made NO grammar errors, skip the ❌ line entirely.
3. End with: "Thank you. — **[PART2_DONE]**"

${BAND_SCORING_RULES}

Keep response under 150 words.`;
  }

  const isFinal3 = !isStart && questionNum > 4;
  const intro3 = isStart
    ? `Begin with a short transition statement (e.g. "We'll now move on to Part 3…") and immediately ask your first discussion question related to ${topic}.`
    : isFinal3
      ? `The student has just answered the FINAL question of Part 3. Give ONLY your feedback. Do NOT ask another question. End with "Excellent. — **[PART3_DONE]**".`
      : `You are on discussion question ${questionNum} of 4. Ask ONE abstract, analytical question about society or the wider world, related to "${topic}".`;

  if (voiceMode) {
    return `You are Churchill AI, a certified IELTS examiner conducting a real-time spoken interview. Your name is Churchill AI.

You are conducting IELTS Speaking Part 3 (Two-Way Discussion) on the theme: "${topic}".

${intro3}

VOICE MODE — speak like a real human examiner in a fast, natural conversation:
- Respond in ONE OR TWO short sentences only (under 30 words total).
- Brief acknowledgment ("I see." / "That's an interesting view.") then IMMEDIATELY ask the next discussion question.
- Do NOT give scores, corrections, or vocabulary suggestions out loud — those are saved for the final written report.
- Speak as quickly and naturally as a real conversation partner.

CRITICAL: You MUST end every response with a clearly spoken question (unless this is the final answer). Never end mid-thought, never skip the question. The question is the most important part of your response.

Do NOT use emoji symbols. The FINAL answer should end with "Excellent. — **[PART3_DONE]**".`;
  }

  return `You are Churchill AI, a certified IELTS examiner. Your name is Churchill AI — never introduce yourself as anyone else.

You are conducting IELTS Speaking Part 3 (Two-Way Discussion) on the theme: "${topic}".

${intro3}

After each student answer, respond with:
1. One brief acknowledgment sentence
2. Then the NEXT discussion question (or if this is the FINAL answer, do NOT ask another question)
3. Then a feedback block in EXACTLY this format:

❌ "[exact wrong phrase from student]" → ✅ "[corrected phrase]" ([brief reason])
📝 Better vocabulary: "[academic word1]," "[academic word2]," "[academic word3]"
⭐ Fluency & Coherence: X/9 ([one short sentence explaining why])
⭐ Lexical Resource: X/9 ([one short sentence explaining why])
⭐ Grammatical Range & Accuracy: X/9 ([one short sentence explaining why])
⭐ Pronunciation: X/9 ([one short sentence explaining why])
⭐ Answer Band Score: X/9

If the student made NO grammar errors, skip the ❌ line entirely.
The FINAL answer should end with "Excellent. — **[PART3_DONE]**".

${BAND_SCORING_RULES}

Keep responses under 150 words. Target B2–C1 vocabulary.`;
}

router.post("/message", async (req, res) => {
  try {
    const { messages, topic, part, questionNum, isStart } = req.body as {
      messages: { role: "user" | "assistant"; content: string }[];
      topic: string;
      part: number;
      questionNum: number;
      isStart: boolean;
    };

    if (!topic || !part) {
      res.status(400).json({ error: "Missing fields" });
      return;
    }

    const systemPrompt = buildSystemPrompt(topic, part, questionNum, isStart ?? false);

    let ctx = messages.slice(-6);
    if (ctx.length === 0) ctx = [{ role: "user", content: "Please begin." }];

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    const stream = await openai.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 300,
      stream: true,
      messages: [{ role: "system", content: systemPrompt }, ...ctx],
    });

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content ?? "";
      if (delta) res.write(`data: ${JSON.stringify({ delta })}\n\n`);
    }
    res.write("data: [DONE]\n\n");
    res.end();
  } catch (err) {
    req.log.error({ err }, "Message error");
    if (!res.headersSent) res.status(500).json({ error: "ai_failed" });
    else { res.write("data: [ERROR]\n\n"); res.end(); }
  }
});

router.post("/report", async (req, res) => {
  try {
    const { messages, topic } = req.body as {
      messages: { role: "user" | "assistant"; content: string }[];
      topic: string;
    };

    const systemPrompt = `You are a certified IELTS examiner scoring STRICTLY according to the official IELTS Speaking Band Descriptors. You must be honest and never inflate scores.

Based on the IELTS Speaking test conversation on the topic "${topic}", generate a detailed band score report.

Analyse ONLY the student's (user) messages. Evaluate:
- Fluency & Coherence
- Lexical Resource
- Grammatical Range & Accuracy
- Pronunciation (inferred from writing/speech patterns)

NEVER inflate scores. NEVER give a band until you are certain the student meets the criteria. Your job is to help students improve, not to make them feel good with false high scores.

OFFICIAL IELTS BAND SCORE CHART:
Band 9 — EXPERT: Complete understanding and full operational command of English. Zero errors. Natural, effortless communication.
Band 8 — VERY GOOD: Can handle complex and detailed argumentation. Very wide vocabulary used precisely. Rare minor errors. Fully developed answers with natural fluency.
Band 7 — GOOD: Effective command of the language though occasional errors and misunderstandings. Extended answers with reasons, examples, and reflection. Good vocabulary range.
Band 6 — COMPETENT: Can use and understand complex language, especially in familiar situations. Effective command but misunderstandings and inaccuracies occur. Answers include reasons and some examples.
Band 5 — MODEST: Likely to make many mistakes. Can manage basic communications in familiar settings. Brief answers, limited vocabulary, simple sentences dominate.
Band 4 — LIMITED: Basic competency in familiar situations only. Difficulty understanding and expressing ideas. Short, incomplete answers. Many basic grammar errors.
Band 3 — EXTREMELY LIMITED: Can understand language in very familiar situations only. Communication is often disrupted. Frequent breakdowns.
Band 2 — INTERMITTENT: Can only produce isolated words or memorized phrases. No real communication possible.

STRICT SCORING RULES:
1. SHORT ANSWERS (1-2 sentences) throughout = Band 4 (LIMITED), not 5.
2. SHORT ANSWERS + MULTIPLE ERRORS = Band 3 (EXTREMELY LIMITED).
3. NO EXAMPLES given in answers = CANNOT exceed Band 5 (MODEST).
4. SIMPLE GRAMMAR ONLY = CANNOT exceed Band 5 (MODEST).
5. REPEATED WORDS throughout = deduct 0.5 from Lexical Resource.
6. Band 6 (COMPETENT) = ONLY if student uses some complex language with reasons and mostly clear meaning.
7. Band 7+ (GOOD) = ONLY for genuinely extended, well-developed answers with good vocabulary and occasional errors only.
8. Band 8+ = ONLY for near-perfect, sophisticated language with virtually no errors.
9. The overall band is the AVERAGE of the 4 criteria, rounded to nearest 0.5.
10. Always be honest, strict, and accurate.

Return ONLY a valid JSON object, no markdown, no extra text:
{
  "overallBand": 5.0,
  "fluencyCoherence": { "band": 5.0, "comment": "2 sentences referencing specific band descriptor criteria the student meets or fails" },
  "lexicalResource": { "band": 5.0, "comment": "2 sentences referencing specific band descriptor criteria" },
  "grammaticalRange": { "band": 5.0, "comment": "2 sentences referencing specific band descriptor criteria" },
  "pronunciation": { "band": 5.0, "tips": ["tip1", "tip2", "tip3"] },
  "topVocab": ["word/phrase 1", "word/phrase 2", "word/phrase 3", "word/phrase 4", "word/phrase 5"],
  "strengths": ["specific strength 1", "specific strength 2"],
  "improvements": ["improvement area 1", "improvement area 2", "improvement area 3"],
  "recommendation": "A 2-3 sentence personalized recommendation for what the student should focus on in their next practice session. Be specific about exercises, topics to revisit, or techniques to try. Reference their actual performance."
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 1200,
      messages: [{ role: "system", content: systemPrompt }, ...messages.slice(-30)],
    });

    const text = response.choices[0]?.message?.content ?? "{}";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      res.status(500).json({ error: "Invalid report format" });
      return;
    }
    res.json({ report: JSON.parse(jsonMatch[0]) });
  } catch (err) {
    req.log.error({ err }, "Report error");
    res.status(500).json({ error: "report_failed" });
  }
});

router.post("/whisper", upload.single("audio"), async (req, res) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: "No audio file" });
      return;
    }
    const detected = (req.file.mimetype || "").toLowerCase();
    const fmt: "wav" | "mp3" | "webm" =
      detected.includes("wav") ? "wav"
      : detected.includes("mp3") || detected.includes("mpeg") ? "mp3"
      : "webm";
    const text = await speechToText(req.file.buffer, fmt);
    res.json({ text: (text || "").trim() });
  } catch (err: unknown) {
    req.log.error({ err }, "Whisper error");
    const status = (err as { status?: number })?.status;
    if (status === 429) res.status(402).json({ error: "quota_exceeded" });
    else res.status(500).json({ error: "transcription_failed" });
  }
});

router.post("/transcribe", upload.single("audio"), async (req, res) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: "No audio file" });
      return;
    }

    const mimeType = req.file.mimetype || "audio/webm";
    const base64Audio = req.file.buffer.toString("base64");

    const response = await openai.chat.completions.create({
      model: "gpt-4o-audio-preview",
      modalities: ["text"],
      messages: [
        {
          role: "system",
          content: "You are a speech-to-text transcription assistant. Transcribe the user's audio exactly as spoken, in English. Return ONLY the transcribed text with no extra commentary, preamble, or formatting.",
        },
        {
          role: "user",
          content: [
            {
              type: "input_audio",
              input_audio: { data: base64Audio, format: mimeType.includes("mp4") || mimeType.includes("m4a") ? "mp4" : mimeType.includes("wav") ? "wav" : "webm" },
            } as { type: "input_audio"; input_audio: { data: string; format: string } },
          ],
        },
      ],
    });

    const text = response.choices[0]?.message?.content?.trim() ?? "";
    res.json({ text });
  } catch (err: unknown) {
    req.log.error({ err }, "Transcribe error");
    const status = (err as { status?: number })?.status;
    if (status === 429) res.status(402).json({ error: "quota_exceeded" });
    else res.status(500).json({ error: "transcription_failed" });
  }
});

router.post("/tts", async (req, res) => {
  try {
    const { text, speed } = req.body as { text: string; speed?: number };
    if (!text?.trim()) {
      res.status(400).json({ error: "No text" });
      return;
    }
    // Default speed slightly under natural to suit A2/B1 learners.
    const rate = Math.max(0.25, Math.min(4.0, typeof speed === "number" ? speed : 0.92));

    // Use the dedicated Speech API (200-500ms latency) instead of the chat
    // completions audio endpoint (1-2s, fragile). gpt-4o-mini-tts supports
    // both `speed` and `instructions` for tone/pacing control.
    const response = await openai.audio.speech.create({
      model: "gpt-4o-mini-tts",
      voice: "onyx",
      input: text.slice(0, 4096),
      response_format: "mp3",
      speed: rate,
      instructions: "Speak with a warm, friendly British English accent. Pace your speech a little more slowly than normal so an English learner at A2-B1 level can follow easily, but stay natural and conversational — never robotic or exaggerated. Use clear articulation and gentle, encouraging intonation.",
    } as Parameters<typeof openai.audio.speech.create>[0]);

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    if (buffer.length === 0) {
      res.status(500).json({ error: "tts_failed" });
      return;
    }
    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("X-TTS-Speed", String(rate));
    res.send(buffer);
  } catch (err) {
    req.log.error({ err }, "TTS error");
    if (!res.headersSent) res.status(500).json({ error: "tts_failed" });
  }
});

router.post("/voice-message", async (req, res) => {
  try {
    const { audio, messages, topic, part, questionNum, isStart } = req.body as {
      audio: string;
      messages: { role: "user" | "assistant"; content: string }[];
      topic: string;
      part: number;
      questionNum: number;
      isStart: boolean;
    };

    if (!audio || !topic || !part) {
      res.status(400).json({ error: "Missing fields" });
      return;
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    const audioBuffer = Buffer.from(audio, "base64");
    const { buffer: wavBuffer, format } = await ensureCompatibleFormat(audioBuffer);

    const systemPrompt = buildSystemPrompt(topic, part, questionNum, isStart ?? false, true);

    let ctx = (messages || []).slice(-6);
    if (ctx.length === 0 && isStart) ctx = [];

    const sttPromise = speechToText(wavBuffer, format).catch(() => "");

    const feedbackPromise = sttPromise.then(async (transcript: string) => {
      if (!transcript || transcript.trim().length < 2) return "";
      try {
        const partLabel = part === 1 ? "Part 1 (Introduction & Interview)" : part === 2 ? "Part 2 (Long Turn)" : "Part 3 (Two-Way Discussion)";
        const fbPrompt = `You are a strict certified IELTS examiner. The student just gave the following spoken answer in IELTS Speaking ${partLabel} on the topic "${topic}":

"${transcript}"

Return ONLY this exact written feedback format (no preamble, no closing remark, no extra prose). If the student made NO grammar errors, OMIT the ❌ line entirely (do not invent errors).

❌ "[exact wrong phrase]" → ✅ "[corrected phrase]" ([brief reason])
📝 Better vocabulary: "[word1]," "[word2]," "[word3]"
⭐ Fluency & Coherence: X/9 ([one short sentence])
⭐ Lexical Resource: X/9 ([one short sentence])
⭐ Grammatical Range & Accuracy: X/9 ([one short sentence])
⭐ Pronunciation: X/9 ([one short sentence])
⭐ Answer Band Score: X/9

${BAND_SCORING_RULES}`;

        const fb = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          max_tokens: 350,
          messages: [{ role: "system", content: fbPrompt }],
        });
        return fb.choices[0]?.message?.content?.trim() ?? "";
      } catch {
        return "";
      }
    });

    const audioMessages: any[] = [
      { role: "system", content: systemPrompt },
      ...ctx.map((m: any) => ({ role: m.role, content: m.content })),
      {
        role: "user",
        content: [
          { type: "input_audio", input_audio: { data: wavBuffer.toString("base64"), format } }
        ],
      },
    ];

    const abortController = new AbortController();
    let clientDisconnected = false;
    req.on("close", () => {
      clientDisconnected = true;
      abortController.abort();
    });

    const stream = await openai.chat.completions.create({
      model: "gpt-audio",
      modalities: ["text", "audio"],
      audio: { voice: "onyx", format: "pcm16" },
      stream: true,
      max_tokens: 200,
      messages: audioMessages,
    });

    let userTranscript = "";
    let sttDone = false;
    sttPromise.then((text: string) => {
      userTranscript = text;
      sttDone = true;
      try {
        if (!res.writableEnded) {
          res.write(`data: ${JSON.stringify({ type: "user_transcript", data: text })}\n\n`);
        }
      } catch { /* ignore */ }
    });

    let assistantTranscript = "";

    for await (const chunk of stream) {
      if (res.writableEnded || clientDisconnected) {
        stream.controller.abort();
        break;
      }
      const delta = (chunk.choices?.[0]?.delta as any);
      if (!delta) continue;
      if (delta?.audio?.transcript) {
        assistantTranscript += delta.audio.transcript;
        res.write(`data: ${JSON.stringify({ type: "transcript", data: delta.audio.transcript })}\n\n`);
      }
      if (delta?.audio?.data) {
        res.write(`data: ${JSON.stringify({ type: "audio", data: delta.audio.data })}\n\n`);
      }
    }

    if (!sttDone) {
      try { userTranscript = await sttPromise; } catch { userTranscript = ""; }
    }

    let feedbackText = "";
    try { feedbackText = await feedbackPromise; } catch { feedbackText = ""; }

    if (!res.writableEnded && !clientDisconnected) {
      if (feedbackText) {
        res.write(`data: ${JSON.stringify({ type: "feedback", data: feedbackText })}\n\n`);
      }
      res.write(`data: ${JSON.stringify({ done: true, userTranscript, assistantTranscript, feedback: feedbackText })}\n\n`);
      res.end();
    }
  } catch (err) {
    req.log.error({ err }, "Voice message error");
    if (!res.headersSent) res.status(500).json({ error: "voice_failed" });
    else {
      try { res.write(`data: ${JSON.stringify({ type: "error", error: "Voice processing failed" })}\n\n`); res.end(); } catch { /* ignore */ }
    }
  }
});

router.post("/tts-stream", async (req, res) => {
  try {
    const { text } = req.body as { text: string };
    if (!text?.trim()) {
      res.status(400).json({ error: "No text" });
      return;
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    let clientDisconnected = false;
    req.on("close", () => { clientDisconnected = true; });

    const stream = await textToSpeechStream(text.slice(0, 4096), "onyx");

    for await (const chunk of stream) {
      if (res.writableEnded || clientDisconnected) break;
      res.write(`data: ${JSON.stringify({ type: "audio", data: chunk })}\n\n`);
    }

    if (!res.writableEnded && !clientDisconnected) {
      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
    }
  } catch (err) {
    req.log.error({ err }, "TTS stream error");
    if (!res.headersSent) res.status(500).json({ error: "tts_failed" });
    else {
      try { res.write(`data: ${JSON.stringify({ type: "error", error: "TTS failed" })}\n\n`); res.end(); } catch { /* ignore */ }
    }
  }
});

export default router;
