import { Router } from "express";
import { anthropic } from "@workspace/integrations-anthropic-ai";
import { db } from "@workspace/db";
import { essayLogs } from "@workspace/db/schema";
import { eq, desc, sql, count, avg } from "drizzle-orm";
import { getStudentToken } from "./auth";

const router = Router();

const IELTS_ANALYSIS_PROMPT = `You are a certified IELTS examiner with 15+ years of experience. You score essays STRICTLY according to the official IELTS Writing Band Descriptors published by the British Council / IDP / Cambridge. You must be honest, precise, and never inflate scores.

OFFICIAL BAND DESCRIPTOR GUIDELINES — apply these rigorously:

BAND 3 (Extremely Limited):
- Task Response: Does not adequately address the task. No clear position. Few ideas, largely undeveloped or irrelevant.
- Coherence: No apparent logical organization. Very limited use of cohesive devices, often inaccurate.
- Lexical Resource: Very limited vocabulary, frequent errors in word choice/spelling that severely impede meaning.
- Grammar: Attempts at sentences but errors predominate. Punctuation often faulty. Cannot use complex sentences at all.

BAND 4 (Limited):
- Task Response: Responds to the task only in a minimal way or is tangential. Position is unclear. Main ideas hard to identify, may be repetitive or irrelevant.
- Coherence: Information and ideas are not arranged coherently. Basic cohesive devices are inaccurate or repetitive (and, but, also, because only).
- Lexical Resource: Uses only basic vocabulary. May be repetitive. Frequent errors in spelling, word formation.
- Grammar: Uses only a very limited range of structures. Subordinate clauses are rare. Frequent grammatical errors that impede communication.

BAND 5 (Modest):
- Task Response: Addresses the task only partially. Position expressed but not always clear. Some main ideas but limited development. May have irrelevant detail.
- Coherence: Some organization but lacks overall progression. Inadequate, inaccurate or over-use of cohesive devices. May be repetitive. No clear paragraphing strategy.
- Lexical Resource: Limited vocabulary, minimally adequate for the task. Noticeable errors in spelling and word formation that may cause difficulty for the reader.
- Grammar: Uses only a limited range of structures. Attempts complex sentences but these tend to be faulty. Frequent grammatical errors. Punctuation errors.

BAND 6 (Competent):
- Task Response: Addresses all parts of the task, though some parts more fully than others. Presents a relevant position, though conclusions may be unclear or repetitive. Main ideas are relevant but some may be under-developed.
- Coherence: Arranges information coherently with clear overall progression. Uses cohesive devices effectively but cohesion within and/or between sentences may be faulty or mechanical. May not always use referencing clearly.
- Lexical Resource: Uses an adequate range of vocabulary for the task. Attempts less common vocabulary but with some inaccuracy. Makes some errors in spelling and word formation but they do not impede communication.
- Grammar: Uses a mix of simple and complex sentence forms. Makes some errors in grammar and punctuation but they rarely reduce communication.

BAND 7 (Good):
- Task Response: Addresses ALL parts of the task. Presents a clear position throughout. Main ideas are extended and supported, though there may be a tendency to over-generalize or lack focus at times.
- Coherence: Logically organizes information and ideas with clear progression throughout. Uses a range of cohesive devices appropriately, though there may be some under/over-use.
- Lexical Resource: Uses a SUFFICIENT range of vocabulary to allow some flexibility and precision. Uses less common lexical items with SOME awareness of style and collocation, with OCCASIONAL errors.
- Grammar: Uses a variety of complex structures. Produces FREQUENT error-free sentences. Has good control of grammar and punctuation, with FEW errors.

BAND 8 (Very Good):
- Task Response: Sufficiently addresses all parts of the task. Presents a well-developed response with relevant, extended and supported ideas.
- Coherence: Sequences information and ideas logically. Manages all aspects of cohesion well. Uses paragraphing sufficiently and appropriately.
- Lexical Resource: Uses a WIDE range of vocabulary fluently and flexibly. Skillfully uses uncommon lexical items with occasional minor inaccuracies. Rare errors in spelling/word formation.
- Grammar: Uses a WIDE range of structures. The MAJORITY of sentences are error-free. Makes only very occasional errors or inappropriacies.

SCORING RULES — FOLLOW STRICTLY:
1. NEVER give Band 6+ for Task Response if the essay does not address ALL parts of the question.
2. NEVER give Band 6+ for Coherence if the essay lacks clear paragraphing or logical progression.
3. NEVER give Band 6+ for Lexical Resource if the student relies on basic, repetitive vocabulary (good, bad, important, thing, people, etc.).
4. NEVER give Band 6+ for Grammar if the essay is dominated by simple sentences or contains frequent grammatical errors.
5. If the essay has more than 5 clear grammatical errors per 100 words, the Grammar band should NOT exceed 5.
6. If the student uses fewer than 3 different cohesive devices correctly, Coherence should NOT exceed 5.
7. Word count matters: Task 2 under 250 words or Task 1 under 150 words = penalize Task Response by at least 1 band.
8. Off-topic or partially off-topic essays should receive Band 4-5 for Task Response maximum.
9. The overall band is the AVERAGE of the 4 criteria bands, rounded to the nearest 0.5.
10. Be STRICT. Most student essays with basic English should score Band 4-5. Band 6+ requires genuine competence. Band 7+ requires strong, consistent quality across all criteria.
11. Do NOT be generous to avoid hurting feelings. Accurate scoring helps students improve.

Return ONLY a valid JSON object, no markdown, no extra text:

{
  "taskType": "Task 1" or "Task 2",
  "overallBand": 5.0,
  "scores": {
    "taskResponse": { "band": 5, "feedback": "2-3 sentence feedback referencing specific band descriptor criteria" },
    "coherenceCohesion": { "band": 5, "feedback": "2-3 sentence feedback referencing specific band descriptor criteria" },
    "lexicalResource": { "band": 5, "feedback": "2-3 sentence feedback referencing specific band descriptor criteria" },
    "grammaticalRange": { "band": 5, "feedback": "2-3 sentence feedback referencing specific band descriptor criteria" }
  },
  "grammarErrors": [
    { "original": "exact phrase from essay", "correction": "fixed version", "explanation": "brief reason", "type": "grammar" }
  ],
  "vocabularyUpgrades": [
    { "original": "basic word", "better": "advanced word", "example": "short example sentence", "reason": "brief reason" }
  ],
  "coherenceIssues": [
    { "original": "exact phrase from essay", "correction": "improved version", "explanation": "brief reason" }
  ],
  "strengths": ["strength 1", "strength 2", "strength 3"],
  "improvements": ["improvement 1", "improvement 2", "improvement 3"],
  "revisedIntroduction": "rewritten introduction paragraph only",
  "correctedEssay": "full essay with all errors fixed, same ideas and structure"
}

ADDITIONAL RULES:
- Limit grammarErrors to the 5 most important errors only.
- Limit vocabularyUpgrades to the 5 best upgrades only.
- Limit coherenceIssues to the 4 most impactful only.
- original fields must be exact phrases copied from the essay.
- correctedEssay: fix errors only, do not change the student's ideas or add content.
- Feedback MUST reference which band descriptor criteria the student meets or fails to meet.

---

CAMBRIDGE CALIBRATION EXAMPLES — use these to calibrate your scoring accuracy:

EXAMPLE 1 — Task 1, Band 5.5 (Official Cambridge Assessment)

Student Essay:
"The chart describes the data about families weekly expenditure prospects in 1968 and 2018.
The most significant spent rate is on food with a 90% rate in the year 1968. Housing and clothing come next with the same prospect of 6% of the weekly income. Expenditure on leisure, transport, personal goods and household goods are almost same percentage, the former one is slightly more. Lastly, spent rates on fuel and the others are recorded the least with a 6% in the year of 1968.
Turning to 2018, food expenditure of families had dropped dramatically to a percentage between 15 to 10. On the other hand, housing spent had risen significantly with an almost 30% slightly more than food expenditures. The most crucial rise was recorded on leisure spent rates. It had soared about 6% in 50 years. Transportation expenditures comes after and followed by household goods and the other categories respectively. Last three had remained the least just as in 1968 which is fuel and power, clothing and footwear and personal goods.
Overall, weekly expenditure averages of families had dramatically changed over 50 years. Some spent rates had remained the same whereas some of the alterations are quite noticeable."

Official Cambridge Examiner Comment (Band 5.5):
Task Achievement / Coherence: "This response clearly presents the data from the bar graph. The candidate presents all the data for 1968 first and then the data for 2018. There is an overview in the final sentence, but it should summarise the main changes from the bar chart rather than just saying that expenditure 'had ... changed'. Information is arranged coherently into four paragraphs, and there is clear overall progression. A range of cohesive devices is used [Turning to 2018 | followed by | whereas] with an awareness of referencing [former one | the other categories | Last three]."
Lexical / Grammar: "There are some less common examples of vocabulary [dropped dramatically to | risen significantly | soared]. Errors remain [spent rates / expenditure | housing spent / housing costs] but do not impede communication. Similarly, grammatical structures include some complex forms [had dropped ... to] and sentences with multiple clauses; however, there are errors, including inconsistent use of articles and with past tenses."
How to improve: "A summary of the main trends from the bar chart is needed in the overview; for example, the candidate could say that there has been a significant decrease in spending on food over the 50 year period, but the cost of leisure, housing and transport has significantly increased."

CALIBRATION LESSON from this example:
- A response with FOUR coherent paragraphs, good cohesive devices, and some less-common vocabulary still only earns Band 5.5 if the overview is weak (just says things "changed" without specifying the main trends).
- Grammar errors with articles and tense, and word-choice errors like "spent rates" instead of "expenditure", cap the score at Band 5.5 even when complex sentences are attempted.
- "Soared", "dropped dramatically", "risen significantly" = good vocabulary, but errors elsewhere prevent Band 6+.
- For Task 1, a strong overview that names the key trends (biggest increase/decrease) is essential for Band 6+.
- Band 5.5 = coherent structure + some good vocab + overview present but weak + noticeable grammar/word-choice errors.

---

EXAMPLE 2 — Task 1, Band 6.0 (Official Cambridge Assessment) — Map/Plan task

Student Essay:
"The two maps illustrates the northern area in the present days, as well as, the planned development.
Overall, the northern industrial area is located at the east side of the town, with a river on the north, separating the farmland from the industrial area, which is located in the center of the map, represented by a few factory buildings and roads, followed by the main road at the extreme south of the map.
The planned development shows a substantially growth and modifications of the overall infrastructure of the area between the farmland and the main road.
Firstly, the planned development of the northern area replaces what once were factories for housing.
Moreover, the roads have been developed to accomodate all the new buildings that have been planned for the area, which are, a school and a playground to the east side of the roundabout located in the center of the map, as well as shops and a medical center around the round about.
Secondly, a bridge is planned for the north of the map to cross this river and provide access to the houses that will be located in farmland."

Official Cambridge Examiner Comment (Band 6.0):
Task Achievement / Coherence: "This response covers the key changes to be made to the industrial area, although more detail could be provided, for example, housing to the west of the roundabout. There is an overview in the second paragraph and the response could be improved by adding a summary of the main changes. Ideas are arranged coherently, with some effective use of cohesive devices [what once were], sequencing adverbs [Firstly | Secondly] and referencing [which | that]."
Lexical / Grammar: "There is some less common vocabulary but spelling is often inaccurate [acomodate / accommodate | buildings] and word formation is incorrect [substantially growth / substantial growth]. To achieve a higher score, the candidate would need to reduce the number of errors in vocabulary and sentence structure."

CALIBRATION LESSON from Example 2:
- Band 6.0 = covers key changes + coherent paragraphs + some good cohesive devices, BUT has spelling errors, incorrect word formation ("substantially growth" instead of "substantial growth"), and misses some map details.
- Overview exists but doesn't summarise the main overall change clearly enough for Band 7.
- Spelling errors like "acomodate" and wrong word forms cap Lexical Resource at Band 5-6.
- For map/plan tasks: must mention ALL significant changes, not just some; overview should state the overall transformation.

---

EXAMPLE 3 — Task 1, Band 7.5 (Official Cambridge Assessment) — Table + Pie Charts task

Student Essay:
"The table illustrates the data on the police budget in which the money came from and the two pie charts describe the distribution of this amount of money in the two of year 2017 and 2018 in an area of Britain. Overall, there was an upward trend in all three different sources while the money spent on salaries was always the majority of contribution.
Looking into more details, the highest amount of money on the police budget belongs to National Government, 175.5 million pounds in 2017 and it kept rising to 177.8 million pounds. This was followed by Local Taxes, at 91.5 million pounds in 2017, after one year, it increases significantly to 102.9 million pounds.
In terms of the how the money was spent, the majority of police budget goes to salaries which was for officers and staff, dropping slightly from 75% in 2017 to 64% in 2018. Meanwhile, the proportion of 'Buildings and transport' remained constantly at 17% each year. An opposite pattern can be seen in the category of technology, its figure rose sharply from 8% in 2017 to 19% in 2018, which was always the lowest rate during the given period."

Official Cambridge Examiner Comment (Band 7.5):
Task Achievement / Coherence: "This is a strong response. The candidate provides a clear overview at the end of the first paragraph which highlights the consistently increasing trend from the table and identifies the largest category from the pie charts. Full details are given for the first two sources of the budget but, to achieve a higher rating, key features in the table could be more fully extended. Information is presented in the order of the table first and then the charts, in a logical manner. The test taker demonstrates a good range of cohesive devices [while | which was] and uses three paragraphs appropriately to organise and sequence the required data."
Lexical / Grammar: "There is a wide range of vocabulary [figure rose sharply | during the given period] with accurate spelling, although there are occasional errors in word choice. The range of grammatical structures is wide, including modal [can] and continuous forms — although there are occasional errors e.g. using present tenses [goes on] to describe data from 2017 and 2018."
How to improve: "The key features presented from the table could be more fully extended. The candidate could also reduce the few errors in sentence structure."

CALIBRATION LESSON from Example 3:
- Band 7.5 = strong overview naming overall trend + logical organisation + wide vocabulary range + wide grammar range, with only OCCASIONAL errors.
- Even at Band 7.5, tense errors (using present tense for past data) and minor word choice errors are present — these alone do NOT drop the score below 7.
- Multi-data tasks (table + charts): must cover ALL data sources, not just the most prominent ones, for Band 7.5+.
- A clear overview at the END of the first paragraph identifying the biggest trend earns high marks.
- Three well-structured paragraphs covering different data sources = strong coherence.

---

EXAMPLE 4 — Task 1, Band 7.5 (Official Cambridge Assessment) — Line Graph task

Student Essay:
"The line graph shows trends in shop closures and openings of new shops in a particular country between the years 2011 and 2018.
In 2011 approximately 6,500 shops closed. The number of closures fluctuated over the next four years until 2015, when there was a dramatic fall in closures to roughly 700 drops. The following year the number of shops closing their doors rose sharply, reaching over 5,000. The figures remained steady for the next two years, with just over 5,000 closures in 2018.
The number of new shops opening decreased dramatically between 2011 (approximately 8,500) and 2012 (just under 4,000) but rebounded by roughly 50% by 2014. In 2015, the number of openings then fell to the 2012 level, but remained stable for the next two years. The last recorded year, 2018, saw a further fall to 3,000 new openings, the lowest point in this seven year period.
Overall, the number of shop closures has remained within the 5,000 to 7,000 range (with the exception of 2015). In contrast, new shop openings have shown a wider range of figures, but generally indicate a downward trend over the same period."

Official Cambridge Examiner Comment (Band 7.5):
Task Achievement / Coherence: "This is a strong response which provides a clear overview in the final paragraph. Data is presented and key features are highlighted appropriately. Closures are dealt with first, and the details are clearly presented, including the [dramatic fall] key feature. Shop openings are dealt with separately, in similar detail. Key peaks and low points are appropriately flagged. For the highest task score, there could be more detail provided during the periods of [fluctuation] between 2011 to 2014 and 2016 to 2018. Ideas are logically organised, taking each line on the graph in turn, and paragraphing is used appropriately, apart from the single sentence first paragraph. Cohesion is well managed."
Lexical / Grammar: "The range of vocabulary is wide, with some skilful use [rebounded by roughly | further fall | exception of]. The grammar includes a variety of complex structures, with numerous long sentences containing a number of clauses. This is a good example of a higher-level response to this Task 1 question."

CALIBRATION LESSON from Example 4:
- Band 7.5 = covers ALL key features of both lines + flags peaks and low points + clear final overview comparing both trends + wide vocab + complex multi-clause sentences.
- Skilful vocabulary: "rebounded by roughly", "further fall", "exception of", "dramatic fall" — precise, graph-specific language earns high marks.
- For line graphs: cover EACH line separately, flag all key turning points (peaks, troughs, dramatic changes), and end with a clear overall comparison.
- A single-sentence introduction paragraph is acceptable at Band 7.5 — it does not harm the score.
- For Band 8+, add more detail during fluctuation periods and provide data values for every key point mentioned.

---

EXAMPLE 5 — Task 2, Band 6.5 (Official Cambridge Assessment) — Advantages/Disadvantages essay

Student Essay:
"It is said that taking risks brings a lot of benefits. However, it also gives us some drawbacks.
First of all, it is obvious that taking risks will cause a great loss if people do it and fail. In personal life, this loss might not be so harmful. However, it will be really harmfull in professional life, because people take a responsibility not only for themselves but also others such as colleagues, customers and their families. It will even damage the society from the economic point.
On the other hand, we can receive huge benefits by taking risks. Firstly, we can learn how to prepare for one goal through this process. In order to achieve the aim, people will make all the efforts to think about it and try to find more efficient way. If they do this in the professional circumstances, they will recognise the responsibility and importance of cooperation.
Also, it will be completely meaningful even though people can't achieve the goal after taking risks. They will learn the reason why they have failed, and how to change it. The failure will enable them to improve their skills and to achieve their object next time.
As I mentioned, it is true that taking risks give us both advantages and disadvantages. However, it can be argued that the benefits outweighed the drawbacks in that we can obtain advantages not only from the result but also from the process of taking risks."

Official Cambridge Examiner Comment (Band 6.5):
Task Response / Coherence: "This response discusses the advantages and the disadvantages of taking risks. It puts much greater emphasis on risks in 'professional life'. As this response is below 250 words (it is only 242), more could be added to include risks in personal life, along with some specific examples of risks that people commonly take. There is a clear progression through the response and ideas are logically organised, disadvantages are presented first and advantages second. Cohesive devices can be quite mechanical with examples at the start of most sentences [First of all | However | On the other hand | Firstly] but referencing is generally appropriate [it | this loss | They | The failure]. The first paragraph is very short and paragraphing is not entirely logical."
Lexical / Grammar: "Vocabulary is effective with some less common items [damage the society | receive huge benefits | enable | obtain advantages ... from the process]. Occasional errors remain [object / objective | point / perspective]. Sentence structure is good, with frequent error-free sentences. There is a variety of complex structures, including conditionals [if], but a few errors remain."
How to improve: "The word count of 250 should be reached and concrete example(s) of risk could be provided."

CALIBRATION LESSON from Example 5 (Task 2):
- Band 6.5 = logically organised ideas + clear progression + good range of complex structures + some effective vocabulary, BUT: under word count (242 not 250), no concrete real-world examples, over-reliance on mechanical linking devices at sentence starts, paragraphing not entirely logical.
- Word count below 250 in Task 2 MUST be penalised — it caps Task Response.
- "First of all / However / On the other hand / Firstly" used mechanically at the start of every paragraph = cohesive devices are limited and repetitive, which caps Coherence at Band 6.
- A few spelling errors ("harmfull") and wrong word choice ("object" instead of "objective") = Lexical Resource stays at Band 6.
- Frequent error-free sentences + conditional structures = Grammar at Band 6.5-7.
- To reach Band 7, the student needs: concrete examples, 250+ words, less mechanical cohesion, stronger paragraphing logic, and varied sentence openers.

---

EXAMPLE 6 — Task 2, Band 6.5 (Official Cambridge Assessment) — Opinion/Both views essay

Student Essay:
"Mobile phones, nowadays, contains essential features with entertainment also. There has been a large growth seen in usage hours of smartphones among students. There are several reasons behind this situation and I find this development more beneficial than negative. Both the reasons and my view is elaborated further.
The first reason for overusage of smart devices by youngsters is the social benefit they provide. The smart phone connected with internet opens up the large possibilities, from creating new friends to communicating with them over social media. For instance, a child in my re-neighbourhood chats for hours with his school friends over Facebook (a social media) and also spend time over online video sharing phone application. Moreover, the mobile gaming, specially multiplayer games, is another major reason for the situation. Children plays different kind of games over mobile for the entertainment purpose and they involve themselves in games in such a manner, that they forget about the timing and other work to do.
However, I believe that smartphones have also increased the knowledge of pupils. It has developed some important social skills, such as communication skill, team work and many more, by allowing them to work and play in groups, without the restriction of distance. In addition, children can learn through internet by watching online videos and reading articles, which ultimately helps them in their studies as well as language skills. For example, whenever my niece requires to know about something, he searches it over the internet and learns from it. Moreover, multiplayer online gaming improves their multitasking ability and it also gives them a competitive environment.
Overall, I agree that overusage of smartphones on regular basis is harmful for them, but if given proper guidance, mobile phones can help them in learning some life-long skills."

Official Cambridge Examiner Comment (Band 6.5):
Task Response / Coherence: "This response addresses both parts of the question. A range of ideas is expressed and the candidate gives their position in the opening paragraph and then provides evidence and relevant examples. Ideas are logically organised and there is clear progression throughout the four paragraphs. A range of cohesive devices are used [The first reason | For instance | Moreover] with referencing used appropriately [they | themselves | their studies | it]."
Lexical / Grammar: "The range of vocabulary is good with examples of higher-level items [social skills | restriction of distance | ultimately] and there are few errors [overusage / overuse | niece... he / niece ... she | watchin / watching | require to know / needs to know]. Similarly, the range of grammatical structures is reasonable, but the level of error means the Band Score cannot be higher than 6.5."

CALIBRATION LESSON from Example 6 (Task 2):
- Band 6.5 = both parts addressed + clear 4-paragraph structure + logical progression + good range of cohesive devices + some higher-level vocabulary + personal examples included.
- The level of grammatical error is the ceiling: "contains" (subject-verb), "specially" for "especially", pronoun inconsistency ("niece... he"), "require to know" instead of "needs to know" — these collectively prevent Band 7 even when ideas and structure are good.
- Good higher-level vocabulary like "restriction of distance", "ultimately", "social skills", "competitive environment" earns Lexical credit despite errors.
- A personal example ("my niece") counts as a relevant example and is acceptable.
- "Overusage" is not standard English — "overuse" is correct. Non-standard word formation = Lexical error.
- To reach Band 7: eliminate subject-verb agreement errors, fix pronoun consistency, use "especially" not "specially", ensure all word forms are standard English.`;

const IELTS_EXAMPLES_PROMPT = `You are an expert IELTS examiner. Write two example essays based on the student's essay topic and return ONLY a valid JSON object, no markdown, no extra text.

{
  "exampleEssayBand6": "Complete Band 5.5-6 essay. Fix critical errors, improve vocabulary slightly, keep writing simple and accessible. Sound like a real student who improved.",
  "exampleEssayBand8": "Complete Band 7-8 essay. Sophisticated vocabulary, complex structures, strong cohesion, well-developed arguments with examples, clear academic tone."
}

Both essays must be COMPLETE (all paragraphs) and address the same topic as the student's essay.`;

const IELTS_STUDY_PROMPT = `You are an expert IELTS writing coach. Analyze the student's essay carefully and return ONLY a valid JSON object with study material. No markdown, no extra text.

{
  "grammarRecommendations": [
    {
      "studentSentence": "exact simple sentence the student wrote",
      "issue": "e.g. overuse of simple past tense / simple sentence structure",
      "complexVersion": "rewrite as a complex sentence (with subordinate clause)",
      "compoundVersion": "rewrite as a compound sentence (with coordinating/correlative conjunction)",
      "tip": "1-2 sentence grammar tip explaining the improvement"
    }
  ],
  "linkingWords": [
    {
      "studentUsed": "the basic connector the student used (e.g. and, but, or, so, because, also)",
      "context": "the exact sentence or phrase from the essay where it was used",
      "betterAlternatives": ["therefore", "furthermore", "nevertheless"],
      "rewrittenSentence": "the same sentence rewritten with a better linking word"
    }
  ],
  "newVocabulary": [
    {
      "word": "the advanced word used in the corrected/example essays",
      "meaning": "simple definition",
      "partOfSpeech": "noun/verb/adjective/adverb",
      "exampleSentence": "an example sentence using the word in IELTS context",
      "arabicHint": "optional Arabic translation or hint (1-2 words)"
    }
  ],
  "finalGuidance": {
    "overallFeedback": "2-3 sentences of encouraging but honest overall feedback for the student",
    "nextSteps": ["actionable step 1", "actionable step 2", "actionable step 3"],
    "focusAreas": ["the most important area to improve first", "second priority"],
    "motivationalNote": "1 sentence of encouragement to keep practicing"
  }
}

RULES:
- grammarRecommendations: Find 3-5 simple sentences the student wrote and show how to make them complex or compound. Focus on sentences where the student overused simple tenses or basic structures.
- linkingWords: Find 3-5 basic connectors (and, but, or, so, because, also, then) the student used and suggest academic alternatives (however, nevertheless, furthermore, consequently, moreover, in addition, on the other hand, etc). Include the rewritten sentence.
- newVocabulary: List 6-8 advanced words that would upgrade the student's essay. These should be words the student SHOULD learn, taken from the improved versions.
- finalGuidance: Give specific, personalized coaching advice based on this particular essay's weaknesses and strengths.
- All studentSentence and context fields must be exact quotes from the essay.`;

const PARAGRAPH_ANALYSIS_PROMPT = `You are an expert writing coach and language corrector. Analyze the paragraph/message/email and return ONLY a valid JSON object, no markdown, no extra text.

{
  "taskType": "Paragraph",
  "strengths": ["strength 1", "strength 2"],
  "improvements": ["improvement area 1", "improvement area 2"],
  "grammarErrors": [
    { "original": "exact phrase from text", "correction": "fixed version", "explanation": "brief reason", "type": "grammar" }
  ],
  "vocabularyUpgrades": [
    { "original": "basic word", "better": "better word", "example": "short example sentence", "reason": "brief reason" }
  ],
  "coherenceIssues": [
    { "original": "exact phrase from text", "correction": "improved version", "explanation": "brief reason" }
  ],
  "correctedParagraph": "The full paragraph/message/email with ALL errors fixed. Keep the writer's original ideas and meaning — only correct mistakes."
}

RULES:
- original fields must be exact phrases copied from the text.
- Limit grammarErrors to the 5 most important.
- Limit vocabularyUpgrades to the 5 best upgrades.
- Limit coherenceIssues to the 4 most impactful.`;

const PARAGRAPH_EXAMPLES_PROMPT = `You are an expert writing coach. Based on the paragraph/message/email provided, write two improved versions and return ONLY a valid JSON object, no markdown, no extra text.

{
  "exampleBetter": "A better, more natural and expressive version of the same message. Keep the same meaning but improve flow, word choice, and clarity. This should sound like a confident, fluent writer.",
  "exampleFormal": "A formal, professional version of the same message. Use formal register, polite phrasing, professional vocabulary, and proper structure for a formal letter, email, or document."
}`;

function parseJSON(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error("No valid JSON found in response");
  }
}

router.post("/analyze", async (req, res) => {
  const { essay, taskType, prompt, subtype } = req.body as { essay?: string; taskType?: string; prompt?: string; subtype?: string };

  if (!essay || !essay.trim()) {
    res.status(400).json({ error: "Essay cannot be empty" });
    return;
  }

  if (!taskType || !["Task 1", "Task 2", "Paragraph"].includes(taskType)) {
    res.status(400).json({ error: "Invalid task type" });
    return;
  }

  const t0 = Date.now();
  req.log.info({ taskType, essayLen: essay.length, hasPrompt: !!prompt }, "[/analyze] start");
  try {
    const header = taskType === "Paragraph"
      ? "Paragraph/message/email to analyze"
      : `IELTS ${taskType} essay to analyze`;
    const promptBlock = prompt && prompt.trim()
      ? `ASSIGNMENT PROMPT${subtype ? ` (${subtype})` : ""}:\n"""\n${prompt.trim()}\n"""\n\nIMPORTANT: You MUST score the student's response against THIS specific prompt. Check whether they fully addressed every part of the task. Penalise off-topic, partial, or generic responses under Task Response / Task Achievement.\n\n`
      : "";
    const userPrompt = `${header}:\n\n${promptBlock}STUDENT RESPONSE:\n"""\n${essay}\n"""`;
    const isIelts = taskType !== "Paragraph";

    const msg = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      system: isIelts ? IELTS_ANALYSIS_PROMPT : PARAGRAPH_ANALYSIS_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
    }, { timeout: 170000 });
    req.log.info({ ms: Date.now() - t0 }, "[/analyze] anthropic returned");

    const block = msg.content[0];
    if (block.type !== "text") {
      res.status(500).json({ error: "Unexpected response format" });
      return;
    }

    const analysis = parseJSON(block.text) as any;

    const student = getStudentToken(req);
    if (student && isIelts && analysis.overallBand) {
      try {
        await db.insert(essayLogs).values({
          studentId: student.id,
          taskType,
          essay,
          overallBand: analysis.overallBand,
          taskResponseBand: analysis.scores?.taskResponse?.band ?? null,
          coherenceBand: analysis.scores?.coherenceCohesion?.band ?? null,
          lexicalBand: analysis.scores?.lexicalResource?.band ?? null,
          grammarBand: analysis.scores?.grammaticalRange?.band ?? null,
          analysis,
        });
      } catch (saveErr) {
        req.log.error({ err: saveErr }, "Failed to save essay log");
      }
    }

    res.json(analysis);
  } catch (err) {
    req.log.error({ err }, "Error analyzing essay/paragraph");
    res.status(500).json({ error: "Failed to analyze essay" });
  }
});

router.post("/analyze-stream", async (req, res) => {
  const { essay, taskType, prompt, subtype } = req.body as { essay?: string; taskType?: string; prompt?: string; subtype?: string };

  if (!essay || !essay.trim()) {
    res.status(400).json({ error: "Essay cannot be empty" });
    return;
  }
  if (!taskType || !["Task 1", "Task 2", "Paragraph"].includes(taskType)) {
    res.status(400).json({ error: "Invalid task type" });
    return;
  }

  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders?.();

  const t0 = Date.now();
  req.log.info({ taskType, essayLen: essay.length }, "[/analyze-stream] start");

  try {
    const header = taskType === "Paragraph"
      ? "Paragraph/message/email to analyze"
      : `IELTS ${taskType} essay to analyze`;
    const promptBlock = prompt && prompt.trim()
      ? `ASSIGNMENT PROMPT${subtype ? ` (${subtype})` : ""}:\n"""\n${prompt.trim()}\n"""\n\nIMPORTANT: You MUST score the student's response against THIS specific prompt. Check whether they fully addressed every part of the task. Penalise off-topic, partial, or generic responses under Task Response / Task Achievement.\n\n`
      : "";
    const userPrompt = `${header}:\n\n${promptBlock}STUDENT RESPONSE:\n"""\n${essay}\n"""`;
    const isIelts = taskType !== "Paragraph";

    const stream = anthropic.messages.stream({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      system: isIelts ? IELTS_ANALYSIS_PROMPT : PARAGRAPH_ANALYSIS_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
    });

    let full = "";
    for await (const event of stream) {
      if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        full += event.delta.text;
        res.write(event.delta.text);
      }
    }

    res.write("\n__DONE__\n");
    res.end();
    req.log.info({ ms: Date.now() - t0, len: full.length }, "[/analyze-stream] done");

    const student = getStudentToken(req);
    if (student && taskType !== "Paragraph") {
      try {
        const analysis = parseJSON(full) as any;
        if (analysis.overallBand) {
          await db.insert(essayLogs).values({
            studentId: student.id,
            taskType,
            essay,
            overallBand: analysis.overallBand,
            taskResponseBand: analysis.scores?.taskResponse?.band ?? null,
            coherenceBand: analysis.scores?.coherenceCohesion?.band ?? null,
            lexicalBand: analysis.scores?.lexicalResource?.band ?? null,
            grammarBand: analysis.scores?.grammaticalRange?.band ?? null,
            analysis,
          });
        }
      } catch (saveErr) {
        req.log.error({ err: saveErr }, "Failed to save streamed essay log");
      }
    }
  } catch (err: any) {
    req.log.error({ err, ms: Date.now() - t0 }, "[/analyze-stream] error");
    try {
      res.write(`\n__ERROR__:${(err?.message || "Failed to analyze essay").replace(/\n/g, " ")}\n`);
      res.end();
    } catch { /* connection already closed */ }
  }
});

router.post("/analyze-extras", async (req, res) => {
  const { essay, taskType, prompt, subtype } = req.body as { essay?: string; taskType?: string; prompt?: string; subtype?: string };

  if (!essay || !essay.trim() || !taskType) {
    res.status(400).json({ error: "Missing fields" });
    return;
  }

  try {
    const header = taskType === "Paragraph"
      ? "Paragraph/message/email to analyze"
      : `IELTS ${taskType} essay to analyze`;
    const promptBlock = prompt && prompt.trim()
      ? `ASSIGNMENT PROMPT${subtype ? ` (${subtype})` : ""}:\n"""\n${prompt.trim()}\n"""\n\nThe student response below was written in response to the assignment prompt above. Tailor your examples and suggested improvements to that specific prompt.\n\n`
      : "";
    const userPrompt = `${header}:\n\n${promptBlock}STUDENT RESPONSE:\n"""\n${essay}\n"""`;
    const isIelts = taskType !== "Paragraph";

    const calls: Promise<any>[] = [
      anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 4096,
        system: isIelts ? IELTS_EXAMPLES_PROMPT : PARAGRAPH_EXAMPLES_PROMPT,
        messages: [{ role: "user", content: userPrompt }],
      }),
    ];

    if (isIelts) {
      calls.push(
        anthropic.messages.create({
          model: "claude-sonnet-4-6",
          max_tokens: 3000,
          system: IELTS_STUDY_PROMPT,
          messages: [{ role: "user", content: userPrompt }],
        })
      );
    }

    const results = await Promise.allSettled(calls);

    const allData: any[] = [];
    for (const r of results) {
      if (r.status === "fulfilled") {
        const block = r.value.content[0];
        if (block.type === "text") {
          try { allData.push(parseJSON(block.text)); } catch { /* skip */ }
        }
      } else {
        req.log.error({ err: r.reason }, "Extras call failed");
      }
    }

    res.json(Object.assign({}, ...allData));
  } catch (err) {
    req.log.error({ err }, "Error generating extras");
    res.status(500).json({ error: "Failed to generate extras" });
  }
});

router.get("/logs", async (req, res) => {
  const student = getStudentToken(req);
  if (!student) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  try {
    const logs = await db
      .select({
        id: essayLogs.id,
        taskType: essayLogs.taskType,
        overallBand: essayLogs.overallBand,
        taskResponseBand: essayLogs.taskResponseBand,
        coherenceBand: essayLogs.coherenceBand,
        lexicalBand: essayLogs.lexicalBand,
        grammarBand: essayLogs.grammarBand,
        essayPreview: sql<string>`LEFT(${essayLogs.essay}, 120)`,
        wordCount: sql<number>`array_length(regexp_split_to_array(trim(${essayLogs.essay}), '\\s+'), 1)`,
        createdAt: essayLogs.createdAt,
      })
      .from(essayLogs)
      .where(eq(essayLogs.studentId, student.id))
      .orderBy(desc(essayLogs.createdAt));

    res.json({ logs });
  } catch (err) {
    req.log.error({ err }, "Failed to fetch essay logs");
    res.status(500).json({ error: "Failed to fetch logs" });
  }
});

router.get("/logs/:id", async (req, res) => {
  const student = getStudentToken(req);
  if (!student) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const logId = parseInt(req.params.id, 10);
  if (isNaN(logId)) {
    res.status(400).json({ error: "Invalid log ID" });
    return;
  }

  try {
    const [log] = await db
      .select()
      .from(essayLogs)
      .where(eq(essayLogs.id, logId));

    if (!log || log.studentId !== student.id) {
      res.status(404).json({ error: "Log not found" });
      return;
    }

    res.json({ log });
  } catch (err) {
    req.log.error({ err }, "Failed to fetch essay log");
    res.status(500).json({ error: "Failed to fetch log" });
  }
});

router.get("/progress", async (req, res) => {
  const student = getStudentToken(req);
  if (!student) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  try {
    const logs = await db
      .select({
        id: essayLogs.id,
        taskType: essayLogs.taskType,
        overallBand: essayLogs.overallBand,
        taskResponseBand: essayLogs.taskResponseBand,
        coherenceBand: essayLogs.coherenceBand,
        lexicalBand: essayLogs.lexicalBand,
        grammarBand: essayLogs.grammarBand,
        createdAt: essayLogs.createdAt,
      })
      .from(essayLogs)
      .where(eq(essayLogs.studentId, student.id))
      .orderBy(essayLogs.createdAt);

    const totalEssays = logs.length;
    const avgBand = totalEssays > 0
      ? +(logs.reduce((s, l) => s + (l.overallBand ?? 0), 0) / totalEssays).toFixed(1)
      : 0;
    const bestBand = totalEssays > 0
      ? Math.max(...logs.map((l) => l.overallBand ?? 0))
      : 0;
    const latestBand = totalEssays > 0 ? logs[logs.length - 1].overallBand : 0;
    const firstBand = totalEssays > 0 ? logs[0].overallBand : 0;
    const improvement = totalEssays >= 2
      ? +((latestBand ?? 0) - (firstBand ?? 0)).toFixed(1)
      : 0;

    res.json({
      totalEssays,
      avgBand,
      bestBand,
      latestBand,
      improvement,
      history: logs.map((l) => ({
        id: l.id,
        taskType: l.taskType,
        overallBand: l.overallBand,
        taskResponseBand: l.taskResponseBand,
        coherenceBand: l.coherenceBand,
        lexicalBand: l.lexicalBand,
        grammarBand: l.grammarBand,
        date: l.createdAt,
      })),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to fetch progress");
    res.status(500).json({ error: "Failed to fetch progress" });
  }
});

export default router;
