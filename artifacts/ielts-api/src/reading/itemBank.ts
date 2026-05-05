// ---------------------------------------------------------------------------
// Reading practice item bank — 2 levels (a2, b1) × 12 question types ×
// 5 items = 120 items total. Skimming and scanning come first as the two
// foundational reading skills; the remaining 10 IELTS question types follow
// in the order students see them on the test.
// ---------------------------------------------------------------------------

export type ReadingLevel = "a2" | "b1";

export type ReadingType =
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

export const READING_TYPES: {
  id: ReadingType;
  label: string;
  tagline: string;
}[] = [
  {
    id: "skimming",
    label: "Skimming",
    tagline: "Read fast for the main idea or overall purpose",
  },
  {
    id: "scanning",
    label: "Scanning",
    tagline: "Hunt the text for one specific fact, name or number",
  },
  {
    id: "mcq",
    label: "Multiple Choice",
    tagline: "Pick the best answer from three options",
  },
  {
    id: "tfng",
    label: "True / False / Not Given",
    tagline: "Decide if a statement matches the facts in the text",
  },
  {
    id: "ynng",
    label: "Yes / No / Not Given",
    tagline: "Decide if a statement matches the writer's opinion",
  },
  {
    id: "matching_headings",
    label: "Matching Headings",
    tagline: "Match each paragraph to the correct heading",
  },
  {
    id: "matching_features",
    label: "Matching Information",
    tagline: "Match each fact to the correct item from the text",
  },
  {
    id: "sentence_completion",
    label: "Sentence / Summary Completion",
    tagline: "Fill the gaps using words from the text",
  },
  {
    id: "note_completion",
    label: "Note Completion",
    tagline: "Complete short notes about the passage",
  },
  {
    id: "table_completion",
    label: "Table Completion",
    tagline: "Complete a table using words from the text",
  },
  {
    id: "flow_chart_completion",
    label: "Flow Chart Completion",
    tagline: "Complete a step-by-step flow chart",
  },
  {
    id: "short_answer",
    label: "Short-Answer Questions",
    tagline: "Answer in a few words straight from the text",
  },
];

// ---------------------------------------------------------------------------
// Storage shape on the row
// ---------------------------------------------------------------------------

export interface SubQuestion {
  id: string; // q1, q2, ...
  prompt: string; // statement / question / blank caption
  mcqOptions?: string[]; // only for mcq sub-questions
}

export interface AnswerEntry {
  // mcq: index of the correct option in sub.mcqOptions
  // tfng: "true" | "false" | "ng"
  // ynng: "yes" | "no" | "ng"
  // matching_headings / matching_features: index into item.options
  // completion / short_answer: canonical string answer
  value: string | number;
  acceptable?: string[];
  explanation: string;
}

export interface ReadingItem {
  slug: string;
  level: ReadingLevel;
  type: ReadingType;
  sortOrder: number;
  title: string;
  instructions: string;
  passage: string;
  paragraphs?: { label: string; text: string }[];
  options?: string[];
  questions: SubQuestion[];
  answerKey: Record<string, AnswerEntry>;
}

// ---------------------------------------------------------------------------
// Helpers (kept tiny on purpose)
// ---------------------------------------------------------------------------
const INSTR: Record<ReadingType, string> = {
  skimming:
    "Skim the passage quickly. Choose the answer A, B, C or D that best describes the main idea, topic or purpose.",
  scanning:
    "Scan the passage to find specific facts. For each question, choose the answer A, B, C or D that matches the information in the text.",
  // NB: scanning is polymorphic — A2 items use the MCQ instructions above,
  // B1 items override `instructions` per-item with fill-in-the-blank wording.
  mcq: "Choose the correct answer A, B or C.",
  tfng:
    "Do the following statements agree with the information in the text? " +
    "Choose TRUE if the statement agrees, FALSE if it contradicts, or NOT GIVEN " +
    "if there is no information.",
  ynng:
    "Do the following statements agree with the views of the writer? " +
    "Choose YES if it agrees with the writer, NO if it contradicts the writer, " +
    "or NOT GIVEN if it is impossible to say what the writer thinks.",
  matching_headings:
    "Choose the correct heading for each paragraph from the list below. " +
    "Each heading is used only once.",
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

type BucketInput = Omit<ReadingItem, "sortOrder" | "instructions"> & {
  // Optional per-item override of the type-default instructions. Currently
  // used by B1 scanning to swap in fill-in-the-blank wording while A2
  // scanning keeps the MCQ wording from INSTR.scanning.
  instructions?: string;
};

function bucket(items: BucketInput[]): ReadingItem[] {
  return items.map((it, i) => ({
    ...it,
    sortOrder: i,
    instructions: it.instructions ?? INSTR[it.type],
  }));
}

// ===========================================================================
// A2 LEVEL
// ===========================================================================

const A2_MCQ: ReadingItem[] = bucket([
  {
    slug: "a2-mcq-1",
    level: "a2",
    type: "mcq",
    title: "Tom and Mark play tennis",
    passage:
      "Tom loves playing tennis. He plays every Saturday morning at the local park. " +
      "He usually plays with his best friend, Mark. They play for two hours, from 9:00 AM to 11:00 AM. " +
      "After the game, they always go to a small cafe near the park to drink coffee and eat sandwiches.",
    questions: [
      {
        id: "q1",
        prompt: "What do Tom and Mark do after playing tennis?",
        mcqOptions: [
          "They go home to sleep.",
          "They go to a cafe to eat and drink.",
          "They play another game of tennis.",
        ],
      },
    ],
    answerKey: {
      q1: {
        value: 1,
        explanation:
          'The text says: "After the game, they always go to a small cafe near the park to drink coffee and eat sandwiches."',
      },
    },
  },
  {
    slug: "a2-mcq-2",
    level: "a2",
    type: "mcq",
    title: "Anna's morning",
    passage:
      "Anna gets up at 7 o'clock every weekday. She drinks a glass of water and then makes a quick breakfast of toast and tea. " +
      "She walks to the bus stop because her office is only twenty minutes away. On Sundays she stays in bed until 9 and reads a book.",
    questions: [
      {
        id: "q1",
        prompt: "How does Anna usually go to her office?",
        mcqOptions: [
          "By car.",
          "On foot to the bus stop, then by bus.",
          "She works from home.",
        ],
      },
    ],
    answerKey: {
      q1: {
        value: 1,
        explanation:
          'The text says she "walks to the bus stop", which means she goes on foot to the bus and then takes the bus.',
      },
    },
  },
  {
    slug: "a2-mcq-3",
    level: "a2",
    type: "mcq",
    title: "The school library",
    passage:
      "The school library opens at 8 AM on weekdays and closes at 5 PM. On Saturdays it opens later, at 10 AM, and closes earlier, at 2 PM. " +
      "The library is closed all day on Sunday. Students can borrow up to four books at a time.",
    questions: [
      {
        id: "q1",
        prompt: "How many books can a student borrow at once?",
        mcqOptions: ["Two books.", "Four books.", "As many as they want."],
      },
    ],
    answerKey: {
      q1: {
        value: 1,
        explanation:
          'The text states clearly: "Students can borrow up to four books at a time."',
      },
    },
  },
  {
    slug: "a2-mcq-4",
    level: "a2",
    type: "mcq",
    title: "Maria's pet",
    passage:
      "Maria has a small brown dog called Bobby. Bobby is three years old. Every evening Maria takes Bobby for a walk in the park near her house. " +
      "Bobby loves running after the ball, but he is afraid of cats and always hides behind Maria's legs when he sees one.",
    questions: [
      {
        id: "q1",
        prompt: "What is Bobby afraid of?",
        mcqOptions: ["The dark.", "Other dogs.", "Cats."],
      },
    ],
    answerKey: {
      q1: {
        value: 2,
        explanation:
          'The text says: "he is afraid of cats and always hides behind Maria\'s legs when he sees one."',
      },
    },
  },
  {
    slug: "a2-mcq-5",
    level: "a2",
    type: "mcq",
    title: "The bakery",
    passage:
      "There is a small bakery on Green Street. It opens at 6 in the morning. The owner, Mr Lee, makes fresh bread every day. " +
      "His most popular product is the chocolate cake, which often sells out before lunch. The bakery is closed on Mondays.",
    questions: [
      {
        id: "q1",
        prompt: "Which day is the bakery closed?",
        mcqOptions: ["Sunday.", "Monday.", "Friday."],
      },
    ],
    answerKey: {
      q1: {
        value: 1,
        explanation:
          'The last sentence says: "The bakery is closed on Mondays."',
      },
    },
  },
]);

const A2_TFNG: ReadingItem[] = bucket([
  {
    slug: "a2-tfng-1",
    level: "a2",
    type: "tfng",
    title: "Cats as pets",
    passage:
      "Cats are very popular pets around the world. They sleep for about 12 to 16 hours a day. " +
      "Many cats like to drink milk, but it is actually not very good for their stomachs. " +
      "Cats can see very well in the dark, which helps them hunt for mice at night.",
    questions: [
      { id: "q1", prompt: "Cats sleep for less than 10 hours a day." },
      { id: "q2", prompt: "Milk is bad for a cat's stomach." },
      { id: "q3", prompt: "Cats prefer to eat fish over meat." },
    ],
    answerKey: {
      q1: {
        value: "false",
        explanation:
          'The text says cats sleep "about 12 to 16 hours a day", which is more than 10, so the statement is false.',
      },
      q2: {
        value: "true",
        explanation:
          'The text says milk "is actually not very good for their stomachs", which agrees with the statement.',
      },
      q3: {
        value: "ng",
        explanation:
          "The text does not compare fish and meat, so we cannot say.",
      },
    },
  },
  {
    slug: "a2-tfng-2",
    level: "a2",
    type: "tfng",
    title: "The weather in London",
    passage:
      "London is famous for its weather. It rains a lot in autumn and winter. Summer is usually warm but not very hot. " +
      "It does not snow every winter, but when it does, the city looks very pretty. Many tourists carry an umbrella with them all year round.",
    questions: [
      { id: "q1", prompt: "London has heavy rain in spring." },
      { id: "q2", prompt: "It snows every winter in London." },
      { id: "q3", prompt: "Some tourists bring an umbrella in every season." },
    ],
    answerKey: {
      q1: {
        value: "ng",
        explanation:
          "The text mentions autumn and winter rain, but says nothing about spring rain.",
      },
      q2: {
        value: "false",
        explanation:
          'The text says "It does not snow every winter", so the statement is false.',
      },
      q3: {
        value: "true",
        explanation:
          'The text says "Many tourists carry an umbrella with them all year round", which matches the statement.',
      },
    },
  },
  {
    slug: "a2-tfng-3",
    level: "a2",
    type: "tfng",
    title: "Bicycles in Amsterdam",
    passage:
      "Amsterdam is a city in the Netherlands. There are more bicycles in the city than people. " +
      "Many people use a bicycle to go to work or school because the streets are flat and easy to ride on. " +
      "The city has special parking areas just for bicycles. Some workers also use trams to get to the office.",
    questions: [
      { id: "q1", prompt: "There are more bikes than people in Amsterdam." },
      { id: "q2", prompt: "The streets in Amsterdam are very steep." },
      { id: "q3", prompt: "Trams in Amsterdam are free for students." },
    ],
    answerKey: {
      q1: {
        value: "true",
        explanation:
          'The text says directly: "There are more bicycles in the city than people."',
      },
      q2: {
        value: "false",
        explanation:
          'The text says the streets "are flat and easy to ride on", the opposite of steep.',
      },
      q3: {
        value: "ng",
        explanation:
          "The text mentions trams but says nothing about prices for students.",
      },
    },
  },
  {
    slug: "a2-tfng-4",
    level: "a2",
    type: "tfng",
    title: "School trip to the museum",
    passage:
      "Last Friday, the children from Class 5 went to the city museum. They saw old paintings and a big dinosaur skeleton. " +
      "After the visit, they had lunch in the museum garden. The teacher took many photos. " +
      "The children were tired but very happy when they returned to school at 3 PM.",
    questions: [
      { id: "q1", prompt: "The class visited the museum on a Friday." },
      {
        id: "q2",
        prompt: "The children ate lunch inside the museum building.",
      },
      { id: "q3", prompt: "The trip was the best day of the year." },
    ],
    answerKey: {
      q1: {
        value: "true",
        explanation:
          'The text starts with "Last Friday, the children from Class 5 went to the city museum."',
      },
      q2: {
        value: "false",
        explanation:
          'The text says they "had lunch in the museum garden" — outside, not inside.',
      },
      q3: {
        value: "ng",
        explanation:
          "The text says they were happy, but never compares this trip to other days.",
      },
    },
  },
  {
    slug: "a2-tfng-5",
    level: "a2",
    type: "tfng",
    title: "The new café in town",
    passage:
      "A new café opened on Main Street last month. It serves coffee, tea, and fresh fruit juices. " +
      "The café is small and only has eight tables, so it gets busy quickly at the weekend. " +
      "Customers can also buy small cakes and sandwiches there. The café does not allow dogs inside.",
    questions: [
      { id: "q1", prompt: "The café opened more than a year ago." },
      { id: "q2", prompt: "There are only eight tables in the café." },
      { id: "q3", prompt: "Dogs are welcome in the café." },
    ],
    answerKey: {
      q1: {
        value: "false",
        explanation:
          'The text says it "opened on Main Street last month", so much less than a year.',
      },
      q2: {
        value: "true",
        explanation: 'The text says clearly: "only has eight tables".',
      },
      q3: {
        value: "false",
        explanation:
          'The text says "The café does not allow dogs inside", so they are not welcome.',
      },
    },
  },
]);

const A2_YNNG: ReadingItem[] = bucket([
  {
    slug: "a2-ynng-1",
    level: "a2",
    type: "ynng",
    title: "Tokyo through my eyes",
    passage:
      "Tokyo is a huge city in Japan. It is very busy and has many tall buildings. " +
      "I think Tokyo is the most exciting city in the world because of its delicious food and fast trains. " +
      "However, it can be very noisy, and some people find it too crowded.",
    questions: [
      {
        id: "q1",
        prompt: "The writer believes that Tokyo is the most exciting city.",
      },
      { id: "q2", prompt: "The writer says the trains in Tokyo are slow." },
      { id: "q3", prompt: "The writer wants to live in Tokyo forever." },
    ],
    answerKey: {
      q1: {
        value: "yes",
        explanation:
          'The writer says: "I think Tokyo is the most exciting city in the world."',
      },
      q2: {
        value: "no",
        explanation:
          'The writer praises the "fast trains" — the opposite of slow.',
      },
      q3: {
        value: "ng",
        explanation:
          "The writer never says anything about wanting to live there.",
      },
    },
  },
  {
    slug: "a2-ynng-2",
    level: "a2",
    type: "ynng",
    title: "Why I love my small village",
    passage:
      "I grew up in a small village in the mountains. Some people say a village life is boring, " +
      "but I disagree. The air is fresh, my neighbours are kind, and I sleep very well at night because it is so quiet. " +
      "Of course, the shops close early and there is no cinema, so young people sometimes move to the city.",
    questions: [
      { id: "q1", prompt: "The writer thinks village life is boring." },
      { id: "q2", prompt: "The writer sleeps well in the village." },
      { id: "q3", prompt: "The writer plans to move to the city next year." },
    ],
    answerKey: {
      q1: {
        value: "no",
        explanation:
          "The writer disagrees with people who call village life boring.",
      },
      q2: {
        value: "yes",
        explanation:
          'The writer says: "I sleep very well at night because it is so quiet."',
      },
      q3: {
        value: "ng",
        explanation:
          "The writer mentions other young people moving, but never their own plans.",
      },
    },
  },
  {
    slug: "a2-ynng-3",
    level: "a2",
    type: "ynng",
    title: "My opinion on football",
    passage:
      "Football is the most popular sport in my country. I watch every game on TV, and I think it is much more exciting than tennis or basketball. " +
      "My favourite team plays in red and they almost always win at home. I sometimes go to the stadium with my brother, although the tickets are expensive.",
    questions: [
      { id: "q1", prompt: "The writer prefers football over tennis." },
      { id: "q2", prompt: "The writer thinks the stadium tickets are cheap." },
      {
        id: "q3",
        prompt: "The writer believes football should be taught in schools.",
      },
    ],
    answerKey: {
      q1: {
        value: "yes",
        explanation:
          'The writer says football is "more exciting than tennis or basketball".',
      },
      q2: {
        value: "no",
        explanation:
          'The writer says the tickets "are expensive", the opposite of cheap.',
      },
      q3: {
        value: "ng",
        explanation:
          "The writer never gives an opinion about football in schools.",
      },
    },
  },
  {
    slug: "a2-ynng-4",
    level: "a2",
    type: "ynng",
    title: "My experience with online shopping",
    passage:
      "I do most of my shopping online now. I think it saves a lot of time, and the prices are usually lower than in the shops. " +
      "However, I do not enjoy buying clothes online because the size is sometimes wrong. For food, I still prefer the supermarket because I like to choose the fruit myself.",
    questions: [
      { id: "q1", prompt: "The writer believes online shopping saves time." },
      { id: "q2", prompt: "The writer enjoys buying clothes on the internet." },
      { id: "q3", prompt: "The writer thinks shop assistants are friendly." },
    ],
    answerKey: {
      q1: {
        value: "yes",
        explanation: 'The writer says directly: "it saves a lot of time".',
      },
      q2: {
        value: "no",
        explanation: 'The writer says: "I do not enjoy buying clothes online".',
      },
      q3: {
        value: "ng",
        explanation: "The writer never mentions shop assistants.",
      },
    },
  },
  {
    slug: "a2-ynng-5",
    level: "a2",
    type: "ynng",
    title: "My view on early classes",
    passage:
      "My university starts the first lecture at 8 in the morning. I think this is too early for most students. " +
      "We are tired, we cannot focus, and many students simply do not come. In my opinion, classes should start at 9 or even 10. " +
      "Of course, some teachers like the early hours because the rooms are quiet.",
    questions: [
      { id: "q1", prompt: "The writer thinks 8 AM classes are too early." },
      {
        id: "q2",
        prompt: "The writer says all students enjoy the first lecture.",
      },
      {
        id: "q3",
        prompt: "The writer believes lessons should start before 7 AM.",
      },
    ],
    answerKey: {
      q1: {
        value: "yes",
        explanation:
          'The writer states: "this is too early for most students".',
      },
      q2: {
        value: "no",
        explanation:
          'The writer says many students "simply do not come", which contradicts the statement.',
      },
      q3: {
        value: "no",
        explanation:
          "The writer says classes should start at 9 or 10, not before 7.",
      },
    },
  },
]);

const A2_MATCHING_HEADINGS: ReadingItem[] = bucket([
  {
    slug: "a2-matching_headings-1",
    level: "a2",
    type: "matching_headings",
    title: "The seasons",
    passage: "",
    paragraphs: [
      {
        label: "A",
        text:
          "In summer, the weather is very hot and sunny. People like to go to the beach and swim in the sea. " +
          "They wear light clothes like t-shirts and shorts.",
      },
      {
        label: "B",
        text:
          "Winter is very different. It is very cold, and in some countries, it snows a lot. " +
          "People wear heavy coats and hats, and they like to stay inside their warm houses.",
      },
    ],
    options: [
      "Cold Weather and Winter Clothes",
      "Spring Flowers and Trees",
      "Hot Weather and Summer Activities",
    ],
    questions: [
      { id: "q1", prompt: "Paragraph A" },
      { id: "q2", prompt: "Paragraph B" },
    ],
    answerKey: {
      q1: {
        value: 2,
        explanation:
          "Paragraph A talks about hot, sunny summer weather and beach activities.",
      },
      q2: {
        value: 0,
        explanation:
          "Paragraph B describes cold winter weather and warm clothes.",
      },
    },
  },
  {
    slug: "a2-matching_headings-2",
    level: "a2",
    type: "matching_headings",
    title: "Two ways to travel",
    passage: "",
    paragraphs: [
      {
        label: "A",
        text:
          "Many people enjoy travelling by train. The seats are big, you can walk around, and you have time to read or look out of the window. " +
          "Trains are also better for the environment than planes.",
      },
      {
        label: "B",
        text:
          "Other travellers prefer to drive their own car. With a car, you can stop where you like and take any small road. " +
          "It is also good for families with a lot of luggage.",
      },
    ],
    options: [
      "The Comfort and Calm of Train Travel",
      "The Cost of Plane Tickets",
      "Freedom and Flexibility of Driving",
    ],
    questions: [
      { id: "q1", prompt: "Paragraph A" },
      { id: "q2", prompt: "Paragraph B" },
    ],
    answerKey: {
      q1: {
        value: 0,
        explanation:
          "Paragraph A focuses on the comfort of trains — big seats, time to read, calm.",
      },
      q2: {
        value: 2,
        explanation:
          "Paragraph B is about cars, where you can stop anywhere — that is freedom and flexibility.",
      },
    },
  },
  {
    slug: "a2-matching_headings-3",
    level: "a2",
    type: "matching_headings",
    title: "Healthy habits",
    passage: "",
    paragraphs: [
      {
        label: "A",
        text:
          "Doctors often say we should drink eight glasses of water every day. Water helps our brain work well " +
          "and stops us from feeling tired in the afternoon.",
      },
      {
        label: "B",
        text:
          "Walking for thirty minutes a day is also very good for the body. It is easy to do, costs nothing, " +
          "and you do not need any special clothes or equipment.",
      },
    ],
    options: [
      "The Benefits of Daily Walking",
      "Why Drinking Water Matters",
      "How to Choose a Diet",
    ],
    questions: [
      { id: "q1", prompt: "Paragraph A" },
      { id: "q2", prompt: "Paragraph B" },
    ],
    answerKey: {
      q1: {
        value: 1,
        explanation: "Paragraph A is about water and its benefits.",
      },
      q2: {
        value: 0,
        explanation: "Paragraph B is about thirty minutes of walking per day.",
      },
    },
  },
  {
    slug: "a2-matching_headings-4",
    level: "a2",
    type: "matching_headings",
    title: "City and countryside",
    passage: "",
    paragraphs: [
      {
        label: "A",
        text:
          "Big cities have many shops, restaurants, and cinemas. Public transport is good and you can find a job easily. " +
          "However, cities are usually noisy and air can be polluted.",
      },
      {
        label: "B",
        text:
          "In the countryside, life is quieter. The air is cleaner and you can see green fields and animals. " +
          "There are fewer schools and shops, but many people enjoy the calm.",
      },
    ],
    options: [
      "A Day at the Zoo",
      "The Busy Side of City Life",
      "A Quieter Life in the Countryside",
    ],
    questions: [
      { id: "q1", prompt: "Paragraph A" },
      { id: "q2", prompt: "Paragraph B" },
    ],
    answerKey: {
      q1: {
        value: 1,
        explanation: "Paragraph A describes the busy life in big cities.",
      },
      q2: {
        value: 2,
        explanation: "Paragraph B describes the calm life in the countryside.",
      },
    },
  },
  {
    slug: "a2-matching_headings-5",
    level: "a2",
    type: "matching_headings",
    title: "Two free-time hobbies",
    passage: "",
    paragraphs: [
      {
        label: "A",
        text:
          "Reading is a popular hobby for people of all ages. Books can take us to far places without leaving the chair. " +
          "Many people read for thirty minutes before sleep.",
      },
      {
        label: "B",
        text:
          "Cooking is another favourite hobby. People like to try new recipes from different countries. " +
          "It can be cheaper than going to a restaurant, and it is fun to share the food with family.",
      },
    ],
    options: [
      "The Joy of Reading at Night",
      "Travelling Around the World",
      "Cooking as a Fun Hobby",
    ],
    questions: [
      { id: "q1", prompt: "Paragraph A" },
      { id: "q2", prompt: "Paragraph B" },
    ],
    answerKey: {
      q1: {
        value: 0,
        explanation: "Paragraph A is about reading, especially before sleep.",
      },
      q2: {
        value: 2,
        explanation: "Paragraph B is about cooking as a fun hobby.",
      },
    },
  },
]);

const A2_MATCHING_FEATURES: ReadingItem[] = bucket([
  {
    slug: "a2-matching_features-1",
    level: "a2",
    type: "matching_features",
    title: "Three cars",
    passage:
      "Here are three different cars:\n\n" +
      "The Star car is small and red. It is very cheap but not very fast.\n\n" +
      "The Moon car is large and black. It is very safe for families, but it costs a lot of money.\n\n" +
      "The Sun car is yellow and fast. It is a famous sports car.",
    options: ["Star", "Moon", "Sun"],
    questions: [
      { id: "q1", prompt: "It is a good car for a family." },
      { id: "q2", prompt: "It is not expensive." },
      { id: "q3", prompt: "It can go very fast." },
    ],
    answerKey: {
      q1: {
        value: 1,
        explanation: 'The Moon car is described as "very safe for families".',
      },
      q2: {
        value: 0,
        explanation: 'The Star car is "very cheap", which means not expensive.',
      },
      q3: {
        value: 2,
        explanation: 'The Sun car is described as "yellow and fast".',
      },
    },
  },
  {
    slug: "a2-matching_features-2",
    level: "a2",
    type: "matching_features",
    title: "Three coffee shops",
    passage:
      "There are three coffee shops near our school:\n\n" +
      "Café Bloom is very small but always busy because the prices are the lowest in the area.\n\n" +
      "Riverbean is a big coffee shop with a quiet study room and free Wi-Fi for students.\n\n" +
      "Sunbeans Café is famous for its homemade chocolate cake, which it sells out every afternoon.",
    options: ["Café Bloom", "Riverbean", "Sunbeans Café"],
    questions: [
      { id: "q1", prompt: "It is the cheapest place to drink coffee." },
      { id: "q2", prompt: "It is a good place to study quietly." },
      { id: "q3", prompt: "It is famous for one type of cake." },
    ],
    answerKey: {
      q1: {
        value: 0,
        explanation: 'Café Bloom has "the lowest prices in the area".',
      },
      q2: { value: 1, explanation: 'Riverbean has a "quiet study room".' },
      q3: {
        value: 2,
        explanation:
          'Sunbeans Café is "famous for its homemade chocolate cake".',
      },
    },
  },
  {
    slug: "a2-matching_features-3",
    level: "a2",
    type: "matching_features",
    title: "Three bicycles",
    passage:
      "Mountain Pro is a strong bike with thick tyres for rough roads. It is heavy.\n\n" +
      "City Glide is a light blue bike that is very easy to carry up the stairs. Many students use it in the city.\n\n" +
      "Speed One is a thin red racing bike. It is the fastest model in the shop and it is also the most expensive.",
    options: ["Mountain Pro", "City Glide", "Speed One"],
    questions: [
      { id: "q1", prompt: "This bike is the easiest to carry." },
      { id: "q2", prompt: "This bike is the most expensive." },
      { id: "q3", prompt: "This bike is good for rough roads." },
    ],
    answerKey: {
      q1: {
        value: 1,
        explanation: 'City Glide is "light" and easy to carry up the stairs.',
      },
      q2: { value: 2, explanation: 'Speed One is "the most expensive" model.' },
      q3: {
        value: 0,
        explanation: 'Mountain Pro has "thick tyres for rough roads".',
      },
    },
  },
  {
    slug: "a2-matching_features-4",
    level: "a2",
    type: "matching_features",
    title: "Three holidays",
    passage:
      "The Beach Week is a relaxing holiday by the sea. There are no activities — just rest.\n\n" +
      "The Mountain Trip is for active people. Every day there is a long walk and a short lesson about nature.\n\n" +
      "The City Tour visits five cities in seven days. Tourists travel by fast train and stay in small hotels.",
    options: ["Beach Week", "Mountain Trip", "City Tour"],
    questions: [
      { id: "q1", prompt: "This holiday is best for people who want to rest." },
      { id: "q2", prompt: "This holiday includes lessons about nature." },
      { id: "q3", prompt: "This holiday uses trains to move between places." },
    ],
    answerKey: {
      q1: {
        value: 0,
        explanation: 'Beach Week is "relaxing" with "just rest".',
      },
      q2: {
        value: 1,
        explanation:
          'Mountain Trip includes "a short lesson about nature" each day.',
      },
      q3: {
        value: 2,
        explanation: 'City Tour says tourists "travel by fast train".',
      },
    },
  },
  {
    slug: "a2-matching_features-5",
    level: "a2",
    type: "matching_features",
    title: "Three apartments",
    passage:
      "Apartment One is on the ground floor. It has a small garden but no balcony.\n\n" +
      "Apartment Two is on the second floor. It has two bedrooms and a large balcony with a view of the park.\n\n" +
      "Apartment Three is on the top floor. It is the smallest, with only one bedroom, but it gets the most sunlight in the building.",
    options: ["Apartment One", "Apartment Two", "Apartment Three"],
    questions: [
      { id: "q1", prompt: "This apartment has a garden outside." },
      { id: "q2", prompt: "This apartment has the best view of the park." },
      { id: "q3", prompt: "This apartment receives the most sunlight." },
    ],
    answerKey: {
      q1: { value: 0, explanation: 'Apartment One has "a small garden".' },
      q2: {
        value: 1,
        explanation:
          'Apartment Two has a "large balcony with a view of the park".',
      },
      q3: {
        value: 2,
        explanation:
          'Apartment Three "gets the most sunlight in the building".',
      },
    },
  },
]);

const A2_SENTENCE_COMPLETION: ReadingItem[] = bucket([
  {
    slug: "a2-sentence_completion-1",
    level: "a2",
    type: "sentence_completion",
    title: "Making tea",
    passage:
      "To make a good cup of tea, you need to boil some water first. Then, put a tea bag in your cup. " +
      "Pour the hot water into the cup and wait for three minutes. Finally, you can add milk or sugar if you like it sweet.",
    questions: [
      {
        id: "q1",
        prompt: "First, you must boil water. Next, put the tea ____ in a cup.",
      },
      {
        id: "q2",
        prompt: "After you pour the water, you should wait for three ____.",
      },
      { id: "q3", prompt: "You can add ____ to make the tea sweet." },
    ],
    answerKey: {
      q1: {
        value: "bag",
        explanation: 'The text says to "put a tea bag in your cup".',
      },
      q2: {
        value: "minutes",
        explanation: 'The text says "wait for three minutes".',
      },
      q3: {
        value: "sugar",
        acceptable: ["milk"],
        explanation:
          'The text says "you can add milk or sugar if you like it sweet".',
      },
    },
  },
  {
    slug: "a2-sentence_completion-2",
    level: "a2",
    type: "sentence_completion",
    title: "Making toast",
    passage:
      "Making toast at home is very easy. First, take two slices of bread and put them in the toaster. " +
      "Wait two minutes until the bread is brown. Take the toast out carefully because it is hot. Spread some butter on top while it is still warm.",
    questions: [
      { id: "q1", prompt: "First, take two ____ of bread." },
      { id: "q2", prompt: "Wait two ____ until the bread is brown." },
      { id: "q3", prompt: "Spread some ____ on top of the warm toast." },
    ],
    answerKey: {
      q1: {
        value: "slices",
        explanation: 'The text says "two slices of bread".',
      },
      q2: {
        value: "minutes",
        explanation: 'The text says "Wait two minutes".',
      },
      q3: {
        value: "butter",
        explanation: 'The text says "Spread some butter on top".',
      },
    },
  },
  {
    slug: "a2-sentence_completion-3",
    level: "a2",
    type: "sentence_completion",
    title: "Planting flowers",
    passage:
      "Planting flowers in a garden is fun. First, dig a small hole in the soil with a spade. " +
      "Put the young plant inside and cover the roots with earth. Pour some water on the plant once a day. " +
      "After a few weeks, you will see beautiful flowers.",
    questions: [
      { id: "q1", prompt: "First, dig a small hole with a ____." },
      { id: "q2", prompt: "Cover the roots of the plant with ____." },
      { id: "q3", prompt: "Pour ____ on the plant once a day." },
    ],
    answerKey: {
      q1: {
        value: "spade",
        explanation:
          'The text says to "dig a small hole in the soil with a spade".',
      },
      q2: {
        value: "earth",
        explanation: 'The text says "cover the roots with earth".',
      },
      q3: {
        value: "water",
        explanation: 'The text says "Pour some water on the plant once a day".',
      },
    },
  },
  {
    slug: "a2-sentence_completion-4",
    level: "a2",
    type: "sentence_completion",
    title: "A short bus journey",
    passage:
      "Sara takes the bus to school every morning. The bus stop is two streets from her house. " +
      "She must show her student card to the driver. The journey takes only fifteen minutes. " +
      "Sara always gets off at the gate of the school.",
    questions: [
      { id: "q1", prompt: "The bus stop is two ____ from Sara's house." },
      { id: "q2", prompt: "Sara shows her student ____ to the driver." },
      { id: "q3", prompt: "The journey takes only fifteen ____." },
    ],
    answerKey: {
      q1: {
        value: "streets",
        explanation:
          'The text says "The bus stop is two streets from her house".',
      },
      q2: {
        value: "card",
        explanation: 'The text says "show her student card to the driver".',
      },
      q3: {
        value: "minutes",
        explanation: 'The text says "The journey takes only fifteen minutes".',
      },
    },
  },
  {
    slug: "a2-sentence_completion-5",
    level: "a2",
    type: "sentence_completion",
    title: "Borrowing a film",
    passage:
      "Our local club lends films for free. To borrow a film, you need to bring your member card. " +
      "Choose a film from the shelf and give it to the manager. " +
      "You can keep the film for one week. Bring it back on time, or you must pay a small fee.",
    questions: [
      { id: "q1", prompt: "You need to bring your member ____." },
      { id: "q2", prompt: "Give the film to the ____." },
      { id: "q3", prompt: "You can keep the film for one ____." },
    ],
    answerKey: {
      q1: {
        value: "card",
        explanation: 'The text says "bring your member card".',
      },
      q2: {
        value: "manager",
        explanation: 'The text says "give it to the manager".',
      },
      q3: {
        value: "week",
        explanation: 'The text says "You can keep the film for one week".',
      },
    },
  },
]);

const A2_NOTE_COMPLETION: ReadingItem[] = bucket([
  {
    slug: "a2-note_completion-1",
    level: "a2",
    type: "note_completion",
    title: "Central Museum",
    passage:
      "The Central Museum is open from Tuesday to Sunday. It is closed on Mondays. " +
      "Admission is free for children under 12, but adults must pay $10. Visitors are allowed to take photos, " +
      "but they cannot use a flash. There is a small gift shop near the exit where you can buy postcards.",
    questions: [
      { id: "q1", prompt: "Closed on:" },
      { id: "q2", prompt: "Price for adults:" },
      { id: "q3", prompt: "Taking photos: Permitted without ____." },
      { id: "q4", prompt: "Gift shop location: Near the ____." },
    ],
    answerKey: {
      q1: {
        value: "Mondays",
        acceptable: ["monday"],
        explanation: 'The text says "It is closed on Mondays."',
      },
      q2: {
        value: "$10",
        acceptable: ["10", "$10."],
        explanation: 'The text says "adults must pay $10".',
      },
      q3: {
        value: "flash",
        acceptable: ["a flash"],
        explanation: 'The text says visitors "cannot use a flash".',
      },
      q4: {
        value: "exit",
        explanation: 'The text says the gift shop is "near the exit".',
      },
    },
  },
  {
    slug: "a2-note_completion-2",
    level: "a2",
    type: "note_completion",
    title: "Football class for children",
    passage:
      "We run a football class for children at Park Stadium every Saturday morning. " +
      "Classes start at 10 AM and finish at 11:30 AM. Each child must wear shorts, a t-shirt, and football boots. " +
      "Water bottles are provided. The class fee is $20 a month, paid to the coach on the first Saturday.",
    questions: [
      { id: "q1", prompt: "Class day:" },
      { id: "q2", prompt: "Start time:" },
      { id: "q3", prompt: "Children must wear: shorts, t-shirt and ____." },
      { id: "q4", prompt: "Monthly fee:" },
    ],
    answerKey: {
      q1: {
        value: "Saturday",
        acceptable: ["saturdays", "saturday morning"],
        explanation: 'Classes are "every Saturday morning".',
      },
      q2: {
        value: "10 AM",
        acceptable: ["10am", "10 a.m."],
        explanation: 'Classes start "at 10 AM".',
      },
      q3: {
        value: "football boots",
        acceptable: ["boots"],
        explanation: "Each child must wear football boots.",
      },
      q4: {
        value: "$20",
        acceptable: ["20", "$20."],
        explanation: '"The class fee is $20 a month".',
      },
    },
  },
  {
    slug: "a2-note_completion-3",
    level: "a2",
    type: "note_completion",
    title: "Riverside Hotel",
    passage:
      "Welcome to Riverside Hotel. Reception is open 24 hours. " +
      "Breakfast is served from 7 AM to 10 AM in the main dining room on the ground floor. " +
      "Free Wi-Fi is available in every room — the password is on the back of the room key. " +
      "Guests can use the swimming pool from 9 AM until 6 PM.",
    questions: [
      { id: "q1", prompt: "Reception hours:" },
      { id: "q2", prompt: "Breakfast finishes at:" },
      { id: "q3", prompt: "Wi-Fi password is on the back of the ____." },
      { id: "q4", prompt: "Pool closes at:" },
    ],
    answerKey: {
      q1: {
        value: "24 hours",
        explanation: 'The text says "Reception is open 24 hours".',
      },
      q2: {
        value: "10 AM",
        acceptable: ["10am", "10 a.m."],
        explanation: 'Breakfast is served "from 7 AM to 10 AM".',
      },
      q3: {
        value: "room key",
        acceptable: ["key"],
        explanation: 'The password is "on the back of the room key".',
      },
      q4: {
        value: "6 PM",
        acceptable: ["6pm", "6 p.m."],
        explanation: 'Guests can use the pool "until 6 PM".',
      },
    },
  },
  {
    slug: "a2-note_completion-4",
    level: "a2",
    type: "note_completion",
    title: "School library rules",
    passage:
      "Students can use the school library every weekday from 8 AM to 5 PM. " +
      "Each student can borrow up to three books at one time. The maximum loan period is two weeks. " +
      "Eating is not allowed inside the library, but you may bring a bottle of water. " +
      "Group meetings should be booked in advance with the librarian.",
    questions: [
      { id: "q1", prompt: "Weekday opening time:" },
      { id: "q2", prompt: "Maximum books per student:" },
      { id: "q3", prompt: "Loan period:" },
      { id: "q4", prompt: "Group meetings must be booked with the ____." },
    ],
    answerKey: {
      q1: {
        value: "8 AM",
        acceptable: ["8am", "8 a.m."],
        explanation: "The library opens at 8 AM on weekdays.",
      },
      q2: {
        value: "three",
        acceptable: ["3"],
        explanation: 'Students can borrow "up to three books".',
      },
      q3: {
        value: "two weeks",
        acceptable: ["2 weeks"],
        explanation: '"The maximum loan period is two weeks."',
      },
      q4: {
        value: "librarian",
        explanation: 'Group meetings should be booked "with the librarian".',
      },
    },
  },
  {
    slug: "a2-note_completion-5",
    level: "a2",
    type: "note_completion",
    title: "City bus pass",
    passage:
      "A city bus pass costs only $25 a month. It is valid on every bus inside the city. " +
      "Passes can be bought at any post office. You will need to bring one passport photo and proof of address. " +
      "Pass holders can travel as many times as they want, day or night.",
    questions: [
      { id: "q1", prompt: "Monthly cost:" },
      { id: "q2", prompt: "Place to buy: Any ____." },
      { id: "q3", prompt: "Documents needed: 1 passport photo + ____." },
      { id: "q4", prompt: "Pass holders can travel during the day or ____." },
    ],
    answerKey: {
      q1: {
        value: "$25",
        acceptable: ["25", "$25."],
        explanation: 'The pass "costs only $25 a month".',
      },
      q2: {
        value: "post office",
        explanation: 'Passes can be bought "at any post office".',
      },
      q3: {
        value: "proof of address",
        acceptable: ["address"],
        explanation: 'You need a photo and "proof of address".',
      },
      q4: { value: "night", explanation: 'Holders can travel "day or night".' },
    },
  },
]);

const A2_TABLE_COMPLETION: ReadingItem[] = bucket([
  {
    slug: "a2-table_completion-1",
    level: "a2",
    type: "table_completion",
    title: "Sports Centre classes",
    passage:
      "At our Sports Centre, we offer three types of classes. The Yoga class is on Monday at 6:00 PM in Room A. " +
      "The Swimming class is on Wednesday at 5:00 PM in the Main Pool. " +
      "For those who like fast exercise, the Zumba class is on Friday at 7:00 PM in Room B.",
    questions: [
      { id: "q1", prompt: "Yoga — Location: Room ____" },
      { id: "q2", prompt: "Day for ____: Wednesday, 5:00 PM, Main Pool" },
      { id: "q3", prompt: "Zumba — Day: ____" },
    ],
    answerKey: {
      q1: { value: "A", explanation: 'Yoga is in "Room A".' },
      q2: {
        value: "Swimming",
        explanation:
          "The Swimming class is on Wednesday at 5 PM in the Main Pool.",
      },
      q3: { value: "Friday", explanation: "The Zumba class is on Friday." },
    },
  },
  {
    slug: "a2-table_completion-2",
    level: "a2",
    type: "table_completion",
    title: "Family picnic shopping",
    passage:
      "The Khan family is planning a picnic. Anna will buy the fruit at the market. " +
      "Sami is responsible for sandwiches, which he will make at home. " +
      "Mum will bring the juice from the supermarket. Dad will bring the picnic blanket from the cupboard.",
    questions: [
      { id: "q1", prompt: "Fruit — bought by ____" },
      { id: "q2", prompt: "Sandwiches — prepared at ____" },
      { id: "q3", prompt: "Juice — bought at the ____" },
    ],
    answerKey: {
      q1: {
        value: "Anna",
        explanation: "Anna will buy the fruit at the market.",
      },
      q2: {
        value: "home",
        explanation: "Sami will make the sandwiches at home.",
      },
      q3: {
        value: "supermarket",
        explanation: "Mum will bring the juice from the supermarket.",
      },
    },
  },
  {
    slug: "a2-table_completion-3",
    level: "a2",
    type: "table_completion",
    title: "After-school clubs",
    passage:
      "Our school has three popular clubs. The Drama Club meets on Tuesday in the main hall. " +
      "The Chess Club meets on Thursday in Room 12. " +
      "The Garden Club meets on Friday in the school garden. All clubs run from 4 PM to 5 PM.",
    questions: [
      { id: "q1", prompt: "Drama Club — Location: ____" },
      { id: "q2", prompt: "Chess Club — Day: ____" },
      { id: "q3", prompt: "____ Club — Friday in the school garden" },
    ],
    answerKey: {
      q1: {
        value: "main hall",
        acceptable: ["hall"],
        explanation: "Drama Club meets in the main hall.",
      },
      q2: { value: "Thursday", explanation: "Chess Club meets on Thursday." },
      q3: {
        value: "Garden",
        explanation: "The Garden Club meets on Friday in the school garden.",
      },
    },
  },
  {
    slug: "a2-table_completion-4",
    level: "a2",
    type: "table_completion",
    title: "Three short courses",
    passage:
      "We offer three short courses this summer. The Cooking course is taught by Chef Yusuf and lasts five days. " +
      "The Photography course is run by Maya and lasts seven days. " +
      "The Painting course is led by Mr Brown and lasts ten days. All courses cost $50.",
    questions: [
      { id: "q1", prompt: "Cooking — Teacher: Chef ____" },
      { id: "q2", prompt: "Photography — Days: ____" },
      { id: "q3", prompt: "____ — Teacher: Mr Brown, 10 days" },
    ],
    answerKey: {
      q1: {
        value: "Yusuf",
        explanation: "The Cooking course is taught by Chef Yusuf.",
      },
      q2: {
        value: "seven",
        acceptable: ["7"],
        explanation: "Photography lasts seven days.",
      },
      q3: {
        value: "Painting",
        explanation: "Painting is led by Mr Brown for ten days.",
      },
    },
  },
  {
    slug: "a2-table_completion-5",
    level: "a2",
    type: "table_completion",
    title: "Animals in the zoo",
    passage:
      "The City Zoo has three new animals. The lion is from Africa and is fed at 11 AM every day. " +
      "The penguin is from Antarctica and eats fish at 1 PM. " +
      "The tiger is from Asia and is fed at 3 PM. Visitors love watching the feeding times.",
    questions: [
      { id: "q1", prompt: "Lion — From: ____" },
      { id: "q2", prompt: "Penguin — Feeding time: ____" },
      { id: "q3", prompt: "____ — From: Asia, 3 PM" },
    ],
    answerKey: {
      q1: { value: "Africa", explanation: "The lion is from Africa." },
      q2: {
        value: "1 PM",
        acceptable: ["1pm", "1 p.m."],
        explanation: "The penguin eats fish at 1 PM.",
      },
      q3: {
        value: "Tiger",
        explanation: "The tiger is from Asia and fed at 3 PM.",
      },
    },
  },
]);

const A2_FLOW_CHART: ReadingItem[] = bucket([
  {
    slug: "a2-flow_chart_completion-1",
    level: "a2",
    type: "flow_chart_completion",
    title: "Borrowing a library book",
    passage:
      "To borrow a book from the library, first, you need to find the book on the shelf. " +
      "Next, take the book to the front desk. Then, show your student ID card to the librarian. " +
      "Finally, the librarian will scan the book and tell you the return date.",
    questions: [
      {
        id: "q1",
        prompt: "Find the book on the shelf → Go to the ____ with the book.",
      },
      { id: "q2", prompt: "→ Present your ____ to the staff." },
      { id: "q3", prompt: "→ Wait for the librarian to ____ the book." },
      { id: "q4", prompt: "→ Check the ____ before leaving." },
    ],
    answerKey: {
      q1: {
        value: "front desk",
        acceptable: ["desk"],
        explanation: 'The text says: "take the book to the front desk".',
      },
      q2: {
        value: "student ID",
        acceptable: ["id card", "id", "student id card"],
        explanation:
          'The text says: "show your student ID card to the librarian".',
      },
      q3: {
        value: "scan",
        explanation: 'The text says: "the librarian will scan the book".',
      },
      q4: {
        value: "return date",
        acceptable: ["date"],
        explanation: 'The librarian will "tell you the return date".',
      },
    },
  },
  {
    slug: "a2-flow_chart_completion-2",
    level: "a2",
    type: "flow_chart_completion",
    title: "Buying a movie ticket",
    passage:
      "To buy a movie ticket at our cinema, first, choose your film on the screen by the door. " +
      "Then pick a seat from the small seat map. Pay with cash or card at the counter. " +
      "Finally, take your ticket and walk to the correct cinema room.",
    questions: [
      { id: "q1", prompt: "→ Choose your ____ on the screen." },
      { id: "q2", prompt: "→ Pick a ____ from the seat map." },
      { id: "q3", prompt: "→ Pay at the ____." },
      { id: "q4", prompt: "→ Take your ticket and walk to the cinema ____." },
    ],
    answerKey: {
      q1: {
        value: "film",
        acceptable: ["movie"],
        explanation: "Choose your film on the screen.",
      },
      q2: { value: "seat", explanation: "Pick a seat from the seat map." },
      q3: {
        value: "counter",
        explanation: "Pay at the counter with cash or card.",
      },
      q4: { value: "room", explanation: "Walk to the correct cinema room." },
    },
  },
  {
    slug: "a2-flow_chart_completion-3",
    level: "a2",
    type: "flow_chart_completion",
    title: "Sending a letter",
    passage:
      "To send a letter, first write your message on a sheet of paper. Then, fold the paper and put it in an envelope. " +
      "Write the address on the front and your name on the back. Buy a stamp at the post office and stick it on the envelope. " +
      "Finally, drop the letter into the post box.",
    questions: [
      { id: "q1", prompt: "→ Fold the paper and put it in an ____." },
      { id: "q2", prompt: "→ Write the ____ on the front." },
      { id: "q3", prompt: "→ Buy a ____ at the post office." },
      { id: "q4", prompt: "→ Drop the letter into the post ____." },
    ],
    answerKey: {
      q1: { value: "envelope", explanation: "Put the paper in an envelope." },
      q2: {
        value: "address",
        explanation: "Write the address on the front of the envelope.",
      },
      q3: { value: "stamp", explanation: "Buy a stamp at the post office." },
      q4: { value: "box", explanation: "Drop the letter into the post box." },
    },
  },
  {
    slug: "a2-flow_chart_completion-4",
    level: "a2",
    type: "flow_chart_completion",
    title: "Cooking pasta",
    passage:
      "Cooking pasta is simple. First, boil a large pot of water with some salt. " +
      "Add the pasta and stir for a few seconds. Wait until the pasta is soft, usually about ten minutes. " +
      "Pour the pasta into a strainer to remove the water. Finally, mix the pasta with sauce on a plate.",
    questions: [
      { id: "q1", prompt: "→ Boil water with some ____." },
      { id: "q2", prompt: "→ Add pasta and ____ for a few seconds." },
      { id: "q3", prompt: "→ Pour pasta into a ____." },
      { id: "q4", prompt: "→ Mix pasta with the ____." },
    ],
    answerKey: {
      q1: { value: "salt", explanation: "Boil water with some salt." },
      q2: {
        value: "stir",
        explanation: "Add the pasta and stir for a few seconds.",
      },
      q3: { value: "strainer", explanation: "Pour the pasta into a strainer." },
      q4: {
        value: "sauce",
        explanation: "Mix the pasta with the sauce on a plate.",
      },
    },
  },
  {
    slug: "a2-flow_chart_completion-5",
    level: "a2",
    type: "flow_chart_completion",
    title: "Using the school computer",
    passage:
      "To use a computer in the school lab, first put your bag in a locker. Sit at any free desk. " +
      "Type your student number to log in. Open the program you need from the desktop. " +
      "When you finish, close every program and log out before you leave.",
    questions: [
      { id: "q1", prompt: "→ Put your bag in a ____." },
      { id: "q2", prompt: "→ Type your student ____ to log in." },
      { id: "q3", prompt: "→ Open a program from the ____." },
      { id: "q4", prompt: "→ Before leaving, ____ out of the computer." },
    ],
    answerKey: {
      q1: { value: "locker", explanation: "Put your bag in a locker." },
      q2: {
        value: "number",
        explanation: "Type your student number to log in.",
      },
      q3: { value: "desktop", explanation: "Open a program from the desktop." },
      q4: { value: "log", explanation: "Log out before you leave." },
    },
  },
]);

const A2_SHORT_ANSWER: ReadingItem[] = bucket([
  {
    slug: "a2-short_answer-1",
    level: "a2",
    type: "short_answer",
    title: "Marie Curie",
    passage:
      "Marie Curie was a famous scientist. She was born in Poland in 1867. " +
      "Later, she moved to Paris to study at a university. " +
      "She discovered two new elements and won two Nobel Prizes for her hard work in science.",
    questions: [
      { id: "q1", prompt: "In which country was Marie Curie born?" },
      { id: "q2", prompt: "What year was she born?" },
      { id: "q3", prompt: "How many Nobel Prizes did she win?" },
    ],
    answerKey: {
      q1: {
        value: "Poland",
        explanation: 'The text says she "was born in Poland in 1867".',
      },
      q2: { value: "1867", explanation: 'The text says "in 1867".' },
      q3: {
        value: "two",
        acceptable: ["2"],
        explanation: 'She "won two Nobel Prizes".',
      },
    },
  },
  {
    slug: "a2-short_answer-2",
    level: "a2",
    type: "short_answer",
    title: "The bus driver",
    passage:
      "Mr Patel has been a bus driver for 25 years. He drives the number 14 bus from the city centre to the airport. " +
      "His shift starts at 5 in the morning and finishes at 1 in the afternoon. " +
      "Mr Patel says the best part of his job is meeting friendly passengers from many countries.",
    questions: [
      { id: "q1", prompt: "How many years has Mr Patel been a bus driver?" },
      { id: "q2", prompt: "What number is the bus he drives?" },
      { id: "q3", prompt: "When does his shift end?" },
    ],
    answerKey: {
      q1: {
        value: "25 years",
        acceptable: ["25", "twenty-five years", "twenty five years"],
        explanation: "Mr Patel has been a driver for 25 years.",
      },
      q2: {
        value: "14",
        acceptable: ["number 14"],
        explanation: "He drives the number 14 bus.",
      },
      q3: {
        value: "1 in the afternoon",
        acceptable: ["1 pm", "1pm", "1 p.m."],
        explanation: "His shift finishes at 1 in the afternoon.",
      },
    },
  },
  {
    slug: "a2-short_answer-3",
    level: "a2",
    type: "short_answer",
    title: "A small bookshop",
    passage:
      "There is a small bookshop on Park Avenue called Page One. The owner, Mrs Black, opened it in 2010. " +
      "It sells new and second-hand books, and there is a children's corner with cushions for reading. " +
      "Every Saturday, a writer visits the shop to read a story to the children.",
    questions: [
      { id: "q1", prompt: "What is the name of the bookshop?" },
      { id: "q2", prompt: "When did Mrs Black open the shop?" },
      { id: "q3", prompt: "Who visits the shop on Saturdays?" },
    ],
    answerKey: {
      q1: { value: "Page One", explanation: "The shop is called Page One." },
      q2: { value: "2010", explanation: "Mrs Black opened it in 2010." },
      q3: {
        value: "a writer",
        acceptable: ["writer"],
        explanation: "A writer visits the shop every Saturday.",
      },
    },
  },
  {
    slug: "a2-short_answer-4",
    level: "a2",
    type: "short_answer",
    title: "A new park",
    passage:
      "The town opened a new park last month. It has a children's playground, a small lake, and three football pitches. " +
      "Around the lake there is a 1-kilometre walking path. The park stays open from 6 AM to 10 PM in summer. " +
      "Dogs are welcome but must be on a lead.",
    questions: [
      { id: "q1", prompt: "How many football pitches are in the park?" },
      { id: "q2", prompt: "How long is the walking path?" },
      { id: "q3", prompt: "When does the park close in summer?" },
    ],
    answerKey: {
      q1: {
        value: "three",
        acceptable: ["3"],
        explanation: "The park has three football pitches.",
      },
      q2: {
        value: "1 kilometre",
        acceptable: ["1km", "1 km", "one kilometre"],
        explanation: "There is a 1-kilometre walking path.",
      },
      q3: {
        value: "10 PM",
        acceptable: ["10pm", "10 p.m."],
        explanation: "The park closes at 10 PM in summer.",
      },
    },
  },
  {
    slug: "a2-short_answer-5",
    level: "a2",
    type: "short_answer",
    title: "School breakfast",
    passage:
      "Greenfields School serves a free breakfast for every student before classes. " +
      "The breakfast room opens at 7:30 AM and closes at 8:15 AM. " +
      "Students can choose between toast, fruit, or cereal with milk. The breakfast is paid for by the city council.",
    questions: [
      { id: "q1", prompt: "When does the breakfast room open?" },
      { id: "q2", prompt: "What three foods can students choose?" },
      { id: "q3", prompt: "Who pays for the breakfast?" },
    ],
    answerKey: {
      q1: {
        value: "7:30 AM",
        acceptable: ["7:30am", "7.30 am"],
        explanation: "The room opens at 7:30 AM.",
      },
      q2: {
        value: "toast, fruit, cereal",
        acceptable: ["toast fruit or cereal", "toast fruit cereal"],
        explanation: "Students can choose toast, fruit, or cereal.",
      },
      q3: {
        value: "the city council",
        acceptable: ["city council", "council"],
        explanation: "The breakfast is paid for by the city council.",
      },
    },
  },
]);

// ===========================================================================
// B1 LEVEL
// ===========================================================================

const B1_MCQ: ReadingItem[] = bucket([
  {
    slug: "b1-mcq-1",
    level: "b1",
    type: "mcq",
    title: "Ecotourism",
    passage:
      "Ecotourism is becoming increasingly popular around the world. " +
      "Instead of staying in large, busy hotels, eco-tourists choose to stay in small, locally-owned guesthouses. " +
      "This type of travel helps protect the natural environment and provides money directly to the local community. " +
      "However, some critics argue that any form of tourism eventually causes some damage to nature.",
    questions: [
      {
        id: "q1",
        prompt: "What is one benefit of ecotourism mentioned in the text?",
        mcqOptions: [
          "It helps in building larger hotels.",
          "It supports the local economy and residents.",
          "It prevents all types of damage to nature.",
        ],
      },
    ],
    answerKey: {
      q1: {
        value: 1,
        explanation:
          'The text says ecotourism "provides money directly to the local community" — this is supporting the local economy.',
      },
    },
  },
  {
    slug: "b1-mcq-2",
    level: "b1",
    type: "mcq",
    title: "Working from home",
    passage:
      "Working from home has changed how millions of people manage their time. Many remote employees report that they now have more time for exercise and family because they no longer need to travel to an office. " +
      "On the other hand, certain managers worry that remote workers may feel isolated. Some companies have introduced regular video meetings to make sure no one feels forgotten.",
    questions: [
      {
        id: "q1",
        prompt: "What is one concern about remote work mentioned in the text?",
        mcqOptions: [
          "Workers spend too much money on transport.",
          "Workers may feel isolated from others.",
          "Workers cannot attend video meetings.",
        ],
      },
    ],
    answerKey: {
      q1: {
        value: 1,
        explanation:
          'The text mentions that managers "worry that remote workers may feel isolated".',
      },
    },
  },
  {
    slug: "b1-mcq-3",
    level: "b1",
    type: "mcq",
    title: "Electric scooters",
    passage:
      "Many European cities have welcomed shared electric scooters as a quick, low-cost way to move around. Riders unlock a scooter through a phone app and pay only for the minutes they use. " +
      "Critics, however, point out that scooters are often left blocking pavements, creating problems for pedestrians, especially the elderly and people with disabilities.",
    questions: [
      {
        id: "q1",
        prompt:
          "What is one disadvantage of electric scooters according to the text?",
        mcqOptions: [
          "They are too expensive for most riders.",
          "They are difficult to unlock with a phone.",
          "They sometimes block pavements for pedestrians.",
        ],
      },
    ],
    answerKey: {
      q1: {
        value: 2,
        explanation:
          'The text says scooters are "often left blocking pavements, creating problems for pedestrians".',
      },
    },
  },
  {
    slug: "b1-mcq-4",
    level: "b1",
    type: "mcq",
    title: "Reading on screens",
    passage:
      "Some students believe e-books are easier than paper books because they can search inside the text and adjust the font size. " +
      "Yet, recent studies suggest that readers remember less of what they read on a screen, especially when the text is long. " +
      "Researchers think this may be linked to scrolling, which makes the brain work differently than turning real pages.",
    questions: [
      {
        id: "q1",
        prompt:
          "What does the text suggest is a problem with reading long texts on a screen?",
        mcqOptions: [
          "Readers complain about the price of e-books.",
          "Readers may remember less than they would from paper.",
          "Readers find it hard to change the font size.",
        ],
      },
    ],
    answerKey: {
      q1: {
        value: 1,
        explanation:
          'The text says "readers remember less of what they read on a screen, especially when the text is long".',
      },
    },
  },
  {
    slug: "b1-mcq-5",
    level: "b1",
    type: "mcq",
    title: "Volunteer tourism",
    passage:
      "Voluntourism allows travellers to combine a holiday with helping a local project, such as teaching children or building schools. " +
      "While volunteers often describe the experience as life-changing, some experts warn that short-term volunteers without proper training can do more harm than good. They suggest that travellers should choose programmes carefully and follow the lead of local staff.",
    questions: [
      {
        id: "q1",
        prompt: "What is one warning about voluntourism in the text?",
        mcqOptions: [
          "Volunteers often pay too much for the trip.",
          "Untrained short-term volunteers can sometimes cause harm.",
          "Local staff usually refuse to work with travellers.",
        ],
      },
    ],
    answerKey: {
      q1: {
        value: 1,
        explanation:
          'The text says "short-term volunteers without proper training can do more harm than good".',
      },
    },
  },
]);

const B1_TFNG: ReadingItem[] = bucket([
  {
    slug: "b1-tfng-1",
    level: "b1",
    type: "tfng",
    title: "Sleep and learning",
    passage:
      "Research shows that sleep plays an essential role in learning and memory. When we sleep, our brain processes the information we have gathered during the day. " +
      "Experts recommend that healthy adults get between seven and nine hours of sleep per night. " +
      "Teenagers, on the other hand, require up to ten hours to function properly at school.",
    questions: [
      {
        id: "q1",
        prompt: "Sleep helps the brain organize and remember new information.",
      },
      { id: "q2", prompt: "Adults need more sleep than teenagers do." },
      {
        id: "q3",
        prompt: "Drinking coffee before bed negatively affects memory.",
      },
    ],
    answerKey: {
      q1: {
        value: "true",
        explanation:
          'The text says "our brain processes the information we have gathered during the day" — that is organising and remembering.',
      },
      q2: {
        value: "false",
        explanation:
          "The text says teenagers need up to ten hours, more than the seven-to-nine for adults — so adults need less.",
      },
      q3: {
        value: "ng",
        explanation: "The text never mentions coffee.",
      },
    },
  },
  {
    slug: "b1-tfng-2",
    level: "b1",
    type: "tfng",
    title: "Honey bees",
    passage:
      "Honey bees are crucial to global agriculture because they pollinate many of the fruit and vegetable crops we eat every day. " +
      "Sadly, in the last twenty years, bee populations have fallen sharply due to pesticides, disease, and the loss of wild flowers. " +
      "Several governments now pay farmers extra to plant flower strips along the edges of their fields.",
    questions: [
      { id: "q1", prompt: "Many crops we eat depend on bee pollination." },
      {
        id: "q2",
        prompt: "Bee populations have grown rapidly in the past twenty years.",
      },
      { id: "q3", prompt: "Schools teach all children how to keep bees." },
    ],
    answerKey: {
      q1: {
        value: "true",
        explanation:
          'The text says bees "pollinate many of the fruit and vegetable crops we eat every day".',
      },
      q2: {
        value: "false",
        explanation:
          'The text says populations "have fallen sharply" — the opposite of grown rapidly.',
      },
      q3: {
        value: "ng",
        explanation:
          "The text says nothing about schools or teaching children to keep bees.",
      },
    },
  },
  {
    slug: "b1-tfng-3",
    level: "b1",
    type: "tfng",
    title: "Plant-based meat",
    passage:
      "Plant-based meat substitutes have moved from speciality shops into ordinary supermarkets in recent years. " +
      "These products copy the taste and texture of real meat but use ingredients such as peas, soy, and beetroot juice. " +
      "Producers say their burgers create far fewer greenhouse gases than beef, although the price remains higher than meat for now.",
    questions: [
      {
        id: "q1",
        prompt: "Plant-based meat is now sold in regular supermarkets.",
      },
      { id: "q2", prompt: "These products are usually cheaper than beef." },
      { id: "q3", prompt: "Plant-based burgers contain no salt." },
    ],
    answerKey: {
      q1: {
        value: "true",
        explanation:
          'The text says plant-based meat has moved into "ordinary supermarkets" — the same as regular ones.',
      },
      q2: {
        value: "false",
        explanation:
          'The text says the price "remains higher than meat", so they are not cheaper.',
      },
      q3: {
        value: "ng",
        explanation: "The text never mentions salt.",
      },
    },
  },
  {
    slug: "b1-tfng-4",
    level: "b1",
    type: "tfng",
    title: "Public libraries today",
    passage:
      "Public libraries have changed dramatically in the last decade. Although books are still important, libraries now offer free Wi-Fi, computer training, and even small recording studios. " +
      "Some cities have invested heavily, turning libraries into community hubs that welcome people of all ages. " +
      "Visits have increased in places where these new services were introduced.",
    questions: [
      { id: "q1", prompt: "Modern libraries offer more than just books." },
      {
        id: "q2",
        prompt:
          "Library visits have dropped after the new services were added.",
      },
      { id: "q3", prompt: "Libraries no longer buy any printed books." },
    ],
    answerKey: {
      q1: {
        value: "true",
        explanation:
          "The text lists Wi-Fi, training, and recording studios as services beyond books.",
      },
      q2: {
        value: "false",
        explanation:
          'The text says "visits have increased" where new services were introduced.',
      },
      q3: {
        value: "ng",
        explanation:
          "The text doesn't talk about whether libraries still buy printed books.",
      },
    },
  },
  {
    slug: "b1-tfng-5",
    level: "b1",
    type: "tfng",
    title: "City cycling lanes",
    passage:
      "Following pressure from cyclists' groups, the city of Greendale built 60 km of new protected cycling lanes between 2018 and 2022. " +
      "Surveys show the number of daily cyclists in the city has more than doubled since the project began. " +
      "Local shops on the new routes report higher sales, especially from customers who arrive by bike.",
    questions: [
      {
        id: "q1",
        prompt: "The new cycling lanes were built over several years.",
      },
      {
        id: "q2",
        prompt: "There are now fewer cyclists in Greendale than before 2018.",
      },
      { id: "q3", prompt: "Greendale has banned cars from the city centre." },
    ],
    answerKey: {
      q1: {
        value: "true",
        explanation:
          'The text says the lanes were built "between 2018 and 2022" — over four years.',
      },
      q2: {
        value: "false",
        explanation:
          'The text says cyclist numbers "more than doubled", not fell.',
      },
      q3: {
        value: "ng",
        explanation: "The text doesn't mention banning cars.",
      },
    },
  },
]);

const B1_YNNG: ReadingItem[] = bucket([
  {
    slug: "b1-ynng-1",
    level: "b1",
    type: "ynng",
    title: "Working from home — a writer's view",
    passage:
      "In recent years, working from home has become a normal routine for millions of employees. " +
      "Personally, I believe this shift has greatly improved the work-life balance for many people, as they no longer waste hours commuting in heavy traffic. " +
      "Even though some managers worry about a drop in productivity, most recent studies show that remote workers are actually more focused.",
    questions: [
      {
        id: "q1",
        prompt:
          "The writer thinks working from home is good for employees' personal lives.",
      },
      {
        id: "q2",
        prompt:
          "The writer states that remote workers are less hardworking than office workers.",
      },
      {
        id: "q3",
        prompt:
          "The writer prefers working in an office during the winter season.",
      },
    ],
    answerKey: {
      q1: {
        value: "yes",
        explanation:
          'The writer says working from home "has greatly improved the work-life balance".',
      },
      q2: {
        value: "no",
        explanation:
          'The writer says remote workers "are actually more focused", which is the opposite.',
      },
      q3: {
        value: "ng",
        explanation:
          "The writer never mentions a personal preference about winter or the office.",
      },
    },
  },
  {
    slug: "b1-ynng-2",
    level: "b1",
    type: "ynng",
    title: "Why I avoid fast fashion",
    passage:
      "I stopped buying fast fashion two years ago. In my view, cheap clothes that fall apart after a few washes are simply a waste of money and a disaster for the planet. " +
      "I now buy second-hand items or save up for one quality piece a season. " +
      "Some friends say this style is too plain, but I find it simpler and more elegant.",
    questions: [
      {
        id: "q1",
        prompt: "The writer believes fast fashion harms the environment.",
      },
      {
        id: "q2",
        prompt: "The writer enjoys shopping with friends every weekend.",
      },
      { id: "q3", prompt: "The writer thinks cheap clothes always look good." },
    ],
    answerKey: {
      q1: {
        value: "yes",
        explanation:
          'The writer calls fast fashion "a disaster for the planet".',
      },
      q2: {
        value: "ng",
        explanation:
          "The writer never mentions shopping with friends every weekend.",
      },
      q3: {
        value: "no",
        explanation:
          'The writer says cheap clothes "fall apart after a few washes" and finds simpler clothes more elegant.',
      },
    },
  },
  {
    slug: "b1-ynng-3",
    level: "b1",
    type: "ynng",
    title: "Why I learn languages",
    passage:
      "I have been studying Spanish for three years, and now I want to add Korean. People often ask me why I bother. " +
      "For me, the real value is not just travel — learning a new language opens a door to a different way of thinking. " +
      "I admit progress is slow, but every small step gives me confidence I never had before.",
    questions: [
      {
        id: "q1",
        prompt:
          "The writer believes learning a language changes how a person thinks.",
      },
      {
        id: "q2",
        prompt: "The writer says it is easy to learn a new language quickly.",
      },
      {
        id: "q3",
        prompt: "The writer thinks all schools should offer Korean lessons.",
      },
    ],
    answerKey: {
      q1: {
        value: "yes",
        explanation:
          'The writer says a new language "opens a door to a different way of thinking".',
      },
      q2: {
        value: "no",
        explanation: 'The writer says "progress is slow".',
      },
      q3: {
        value: "ng",
        explanation:
          "The writer never gives an opinion about schools and Korean lessons.",
      },
    },
  },
  {
    slug: "b1-ynng-4",
    level: "b1",
    type: "ynng",
    title: "My take on smart watches",
    passage:
      "Smart watches have become almost a uniform among my colleagues. " +
      "I tried one for six months and decided they are simply not for me. The endless notifications were stressful, and counting every step turned exercise into a competition I never asked for. " +
      "I do agree that the heart-rate sensor is genuinely useful for older relatives.",
    questions: [
      {
        id: "q1",
        prompt: "The writer found notifications on the watch stressful.",
      },
      { id: "q2", prompt: "The writer plans to buy another smart watch soon." },
      {
        id: "q3",
        prompt: "The writer believes the heart-rate sensor can be helpful.",
      },
    ],
    answerKey: {
      q1: {
        value: "yes",
        explanation:
          'The writer says: "The endless notifications were stressful".',
      },
      q2: {
        value: "no",
        explanation:
          'The writer says smart watches "are simply not for me" — they are not buying another.',
      },
      q3: {
        value: "yes",
        explanation:
          'The writer agrees the heart-rate sensor is "genuinely useful for older relatives".',
      },
    },
  },
  {
    slug: "b1-ynng-5",
    level: "b1",
    type: "ynng",
    title: "Why I returned to the cinema",
    passage:
      "After years of streaming films at home, I went back to my local cinema last month. The big screen and shared laughter from strangers reminded me what watching a movie used to feel like. " +
      "Yes, the tickets are not cheap, but the experience is worth every coin. " +
      "I think streaming is fine for tired evenings, but cinema deserves a place in our lives.",
    questions: [
      {
        id: "q1",
        prompt: "The writer believes the cinema experience is worth the money.",
      },
      {
        id: "q2",
        prompt: "The writer claims that all streaming services should close.",
      },
      {
        id: "q3",
        prompt: "The writer thinks streaming is acceptable on tired nights.",
      },
    ],
    answerKey: {
      q1: {
        value: "yes",
        explanation: 'The writer says the experience is "worth every coin".',
      },
      q2: {
        value: "no",
        explanation:
          'The writer thinks streaming "is fine for tired evenings" — they don\'t want it to close.',
      },
      q3: {
        value: "yes",
        explanation: 'The writer says streaming is "fine for tired evenings".',
      },
    },
  },
]);

const B1_MATCHING_HEADINGS: ReadingItem[] = bucket([
  {
    slug: "b1-matching_headings-1",
    level: "b1",
    type: "matching_headings",
    title: "The bicycle through time",
    passage: "",
    paragraphs: [
      {
        label: "A",
        text:
          "The first bicycles did not look like the ones we ride today. They were made entirely of wood and did not even have pedals. " +
          "To move forward, riders had to push their feet directly against the ground. It was an exhausting way to travel.",
      },
      {
        label: "B",
        text:
          "In the late 19th century, the design changed significantly. Strong metal frames replaced the heavy wood, and rubber tires were added to the wheels. " +
          "This made the ride much smoother, faster, and far more comfortable for the user.",
      },
    ],
    options: [
      "A More Comfortable Ride",
      "The Health Benefits of Cycling",
      "The Earliest Designs",
    ],
    questions: [
      { id: "q1", prompt: "Paragraph A" },
      { id: "q2", prompt: "Paragraph B" },
    ],
    answerKey: {
      q1: {
        value: 2,
        explanation:
          "Paragraph A talks about the very first bicycles, which were the earliest designs.",
      },
      q2: {
        value: 0,
        explanation:
          "Paragraph B describes how new materials made the ride smoother and more comfortable.",
      },
    },
  },
  {
    slug: "b1-matching_headings-2",
    level: "b1",
    type: "matching_headings",
    title: "The smartphone in our pockets",
    passage: "",
    paragraphs: [
      {
        label: "A",
        text:
          "When the first smartphones appeared, the camera was little more than a marketing trick. The pictures were noisy, dark, and could rarely be enlarged without losing quality. " +
          "Owners often kept a separate digital camera for any photo that mattered.",
      },
      {
        label: "B",
        text:
          "Today, smartphone cameras compete with professional equipment. Multiple lenses, computer processing, and clever software combine to produce sharp images even in low light. " +
          "Many news organisations now accept photographs taken on a phone for the front page.",
      },
    ],
    options: [
      "Phone Photography Reaches Professional Quality",
      "The Disappointing Early Phone Cameras",
      "Choosing the Right Mobile Plan",
    ],
    questions: [
      { id: "q1", prompt: "Paragraph A" },
      { id: "q2", prompt: "Paragraph B" },
    ],
    answerKey: {
      q1: {
        value: 1,
        explanation:
          "Paragraph A is about how poor early smartphone cameras were.",
      },
      q2: {
        value: 0,
        explanation:
          "Paragraph B explains how today's phone cameras match professional equipment.",
      },
    },
  },
  {
    slug: "b1-matching_headings-3",
    level: "b1",
    type: "matching_headings",
    title: "Tea around the world",
    passage: "",
    paragraphs: [
      {
        label: "A",
        text:
          "In Japan, tea is more than a drink; it is a ceremony. Every movement of the host, from heating the water to passing the cup, follows precise centuries-old rules. " +
          "Guests are expected to sit quietly and admire the simple beauty of the bowl.",
      },
      {
        label: "B",
        text:
          "In Britain, afternoon tea is a far more relaxed social event. Friends gather around a small table, sip black tea with milk, and share gossip over scones and finger sandwiches. " +
          "It is as much about the conversation as the drink itself.",
      },
    ],
    options: [
      "A Formal Japanese Ritual",
      "Tea Production in India",
      "A Relaxed British Tradition",
    ],
    questions: [
      { id: "q1", prompt: "Paragraph A" },
      { id: "q2", prompt: "Paragraph B" },
    ],
    answerKey: {
      q1: {
        value: 0,
        explanation:
          "Paragraph A describes the precise, ceremonial Japanese tea ritual.",
      },
      q2: {
        value: 2,
        explanation:
          "Paragraph B describes the relaxed British afternoon-tea tradition.",
      },
    },
  },
  {
    slug: "b1-matching_headings-4",
    level: "b1",
    type: "matching_headings",
    title: "Two coastal jobs",
    passage: "",
    paragraphs: [
      {
        label: "A",
        text:
          "Lighthouse keepers once lived in isolation for months, climbing the spiral stairs every evening to light the lamp by hand. " +
          "Their main duty was to warn ships of dangerous rocks, often in storms that shook the very tower they stood in.",
      },
      {
        label: "B",
        text:
          "A modern coastguard, by contrast, works inside a comfortable control room full of screens. " +
          "Using radar and satellite tracking, the team monitors hundreds of ships at once and can send a rescue helicopter within minutes of an alert.",
      },
    ],
    options: [
      "High-Tech Maritime Rescue Today",
      "The Lonely Life of Old Lighthouse Keepers",
      "Building New Harbours",
    ],
    questions: [
      { id: "q1", prompt: "Paragraph A" },
      { id: "q2", prompt: "Paragraph B" },
    ],
    answerKey: {
      q1: {
        value: 1,
        explanation:
          "Paragraph A describes the lonely, manual work of old lighthouse keepers.",
      },
      q2: {
        value: 0,
        explanation: "Paragraph B describes modern, high-tech coastguard work.",
      },
    },
  },
  {
    slug: "b1-matching_headings-5",
    level: "b1",
    type: "matching_headings",
    title: "Two ways to learn music",
    passage: "",
    paragraphs: [
      {
        label: "A",
        text: "Studying with a private teacher allows the student to receive immediate feedback. The teacher can spot a wrong finger position the moment it happens, and lessons are shaped around the learner's strengths and weaknesses.",
      },
      {
        label: "B",
        text:
          "Online courses, on the other hand, give learners freedom to practise at any hour. Costs are usually much lower, and the same lesson can be replayed as many times as needed. " +
          "However, mistakes can go uncorrected for weeks.",
      },
    ],
    options: [
      "Famous Composers of the 19th Century",
      "Personal Attention in Traditional Lessons",
      "Flexibility and Lower Cost of Online Study",
    ],
    questions: [
      { id: "q1", prompt: "Paragraph A" },
      { id: "q2", prompt: "Paragraph B" },
    ],
    answerKey: {
      q1: {
        value: 1,
        explanation:
          "Paragraph A is about the personal attention given by a private teacher.",
      },
      q2: {
        value: 2,
        explanation:
          "Paragraph B describes the flexibility and lower cost of online learning.",
      },
    },
  },
]);

const B1_MATCHING_FEATURES: ReadingItem[] = bucket([
  {
    slug: "b1-matching_features-1",
    level: "b1",
    type: "matching_features",
    title: "Three popular diets",
    passage:
      "Here is a quick guide to three popular diets:\n\n" +
      "Vegetarianism: This diet completely excludes all meat, chicken, and fish, but it includes animal by-products like cheese, milk, and eggs.\n\n" +
      "Veganism: People who follow this strict diet do not eat any animal products at all. This means no meat, no dairy, no eggs, and even no honey.\n\n" +
      "Pescatarianism: This lifestyle is very similar to a vegetarian diet, but individuals are allowed to eat fish and other seafood.",
    options: ["Vegetarianism", "Veganism", "Pescatarianism"],
    questions: [
      { id: "q1", prompt: "Does not allow the consumption of milk or eggs." },
      { id: "q2", prompt: "Permits the eating of seafood." },
      {
        id: "q3",
        prompt: "Allows dairy products but restricts all meat and fish.",
      },
    ],
    answerKey: {
      q1: {
        value: 1,
        explanation:
          'Veganism excludes "any animal products at all", including dairy and eggs.',
      },
      q2: {
        value: 2,
        explanation: "Pescatarianism allows fish and other seafood.",
      },
      q3: {
        value: 0,
        explanation:
          "Vegetarianism allows cheese, milk, and eggs but excludes meat, chicken, and fish.",
      },
    },
  },
  {
    slug: "b1-matching_features-2",
    level: "b1",
    type: "matching_features",
    title: "Three streaming services",
    passage:
      "Beam Plus is the cheapest streaming service on the market, but its film library is the smallest of the three.\n\n" +
      "Vista Stream offers the largest catalogue, including thousands of foreign-language films, although the user interface is often criticised as confusing.\n\n" +
      "Kino Live focuses on live sports and concert broadcasts, with very few traditional films.",
    options: ["Beam Plus", "Vista Stream", "Kino Live"],
    questions: [
      { id: "q1", prompt: "Has the lowest subscription price." },
      {
        id: "q2",
        prompt: "Provides a wide selection of foreign-language films.",
      },
      { id: "q3", prompt: "Mainly broadcasts live events rather than films." },
    ],
    answerKey: {
      q1: {
        value: 0,
        explanation:
          'Beam Plus is described as "the cheapest streaming service on the market".',
      },
      q2: {
        value: 1,
        explanation:
          'Vista Stream includes "thousands of foreign-language films".',
      },
      q3: {
        value: 2,
        explanation:
          'Kino Live "focuses on live sports and concert broadcasts".',
      },
    },
  },
  {
    slug: "b1-matching_features-3",
    level: "b1",
    type: "matching_features",
    title: "Three university courses",
    passage:
      "Modern Architecture is taught entirely online and is suitable for working adults. Assignments are submitted weekly, and there are no on-campus exams.\n\n" +
      "Marine Biology requires students to spend long periods on a research ship and is therefore best suited to those without family responsibilities.\n\n" +
      "Data Analytics is the most expensive of the three but offers a guaranteed paid internship at one of fifty partner companies.",
    options: ["Modern Architecture", "Marine Biology", "Data Analytics"],
    questions: [
      { id: "q1", prompt: "Includes time at sea away from home." },
      { id: "q2", prompt: "Comes with a paid work placement." },
      { id: "q3", prompt: "Is taught completely on the internet." },
    ],
    answerKey: {
      q1: {
        value: 1,
        explanation:
          'Marine Biology requires "long periods on a research ship".',
      },
      q2: {
        value: 2,
        explanation: 'Data Analytics offers a "guaranteed paid internship".',
      },
      q3: {
        value: 0,
        explanation: 'Modern Architecture is taught "entirely online".',
      },
    },
  },
  {
    slug: "b1-matching_features-4",
    level: "b1",
    type: "matching_features",
    title: "Three holiday rentals",
    passage:
      "Sea Breeze Cottage is right next to the beach and welcomes pets, although it has only one bedroom.\n\n" +
      "Mountain Lodge sits on top of a hill and is ideal for groups of up to ten people. The lodge has a hot tub but does not allow children under twelve.\n\n" +
      "City Studio is in the middle of the old town, surrounded by museums and restaurants. It is the cheapest option and includes a free public transport pass.",
    options: ["Sea Breeze Cottage", "Mountain Lodge", "City Studio"],
    questions: [
      { id: "q1", prompt: "Allows guests to bring their dogs." },
      { id: "q2", prompt: "Provides a free pass for buses and trams." },
      { id: "q3", prompt: "Can host a large group of adults." },
    ],
    answerKey: {
      q1: { value: 0, explanation: 'Sea Breeze Cottage "welcomes pets".' },
      q2: {
        value: 2,
        explanation: 'City Studio "includes a free public transport pass".',
      },
      q3: {
        value: 1,
        explanation:
          'Mountain Lodge is "ideal for groups of up to ten people" and excludes young children.',
      },
    },
  },
  {
    slug: "b1-matching_features-5",
    level: "b1",
    type: "matching_features",
    title: "Three job positions",
    passage:
      "The Junior Designer post is fully remote, but applicants must be available for video meetings during European business hours.\n\n" +
      "The Site Engineer position pays the highest salary of the three and includes a company car, although the role demands frequent travel to construction sites.\n\n" +
      "The Office Receptionist role offers the most stable hours: Monday to Friday, 9 a.m. to 5 p.m., with no weekend shifts.",
    options: ["Junior Designer", "Site Engineer", "Office Receptionist"],
    questions: [
      { id: "q1", prompt: "Comes with a company vehicle." },
      { id: "q2", prompt: "Has fixed weekday hours and no weekend work." },
      { id: "q3", prompt: "Can be done from any location with internet." },
    ],
    answerKey: {
      q1: { value: 1, explanation: 'Site Engineer "includes a company car".' },
      q2: {
        value: 2,
        explanation:
          "Office Receptionist offers Monday-to-Friday 9–5 with no weekend shifts.",
      },
      q3: { value: 0, explanation: 'Junior Designer is "fully remote".' },
    },
  },
]);

const B1_SENTENCE_COMPLETION: ReadingItem[] = bucket([
  {
    slug: "b1-sentence_completion-1",
    level: "b1",
    type: "sentence_completion",
    title: "Solar panels",
    passage:
      "Solar panels capture energy from the sun and convert it into electricity. " +
      "This renewable source of power is excellent for the environment because it does not produce harmful pollution. " +
      "To install solar panels effectively, a homeowner needs a roof that receives plenty of direct sunlight throughout the day.",
    questions: [
      {
        id: "q1",
        prompt: "Solar energy is converted into ____ using special panels.",
      },
      {
        id: "q2",
        prompt:
          "It is considered a clean source of power because it creates no ____.",
      },
      {
        id: "q3",
        prompt: "Panels should be placed on a ____ that gets a lot of sun.",
      },
    ],
    answerKey: {
      q1: {
        value: "electricity",
        explanation:
          'The text says solar panels "convert it into electricity".',
      },
      q2: {
        value: "pollution",
        explanation:
          'The text says solar power "does not produce harmful pollution".',
      },
      q3: {
        value: "roof",
        explanation:
          'The text says you need "a roof that receives plenty of direct sunlight".',
      },
    },
  },
  {
    slug: "b1-sentence_completion-2",
    level: "b1",
    type: "sentence_completion",
    title: "Coral reefs",
    passage:
      "Coral reefs are home to about a quarter of all marine species, despite covering less than one percent of the ocean floor. " +
      "Rising sea temperatures put enormous stress on the corals, causing them to lose their colour, a process known as bleaching. " +
      "Without urgent action on climate change, scientists fear that most reefs could disappear within fifty years.",
    questions: [
      { id: "q1", prompt: "Coral reefs are home to a ____ of marine species." },
      {
        id: "q2",
        prompt: "When corals lose their colour the process is called ____.",
      },
      {
        id: "q3",
        prompt: "Scientists worry many reefs could vanish within fifty ____.",
      },
    ],
    answerKey: {
      q1: {
        value: "quarter",
        explanation:
          'The text says coral reefs are home to "about a quarter of all marine species".',
      },
      q2: {
        value: "bleaching",
        explanation: 'The loss of colour is "a process known as bleaching".',
      },
      q3: {
        value: "years",
        explanation:
          'The text says reefs could disappear "within fifty years".',
      },
    },
  },
  {
    slug: "b1-sentence_completion-3",
    level: "b1",
    type: "sentence_completion",
    title: "Public transport in Curitiba",
    passage:
      "The Brazilian city of Curitiba is famous for its bus network. " +
      "Buses arrive every ninety seconds at busy stops and use dedicated lanes that other vehicles cannot enter. " +
      "Passengers pay the fare before boarding, which keeps the journey times remarkably short and reliable.",
    questions: [
      { id: "q1", prompt: "Curitiba is famous for its ____ network." },
      { id: "q2", prompt: "Other vehicles are not allowed in the bus ____." },
      { id: "q3", prompt: "Passengers must pay before they ____ the bus." },
    ],
    answerKey: {
      q1: {
        value: "bus",
        explanation: 'The text says Curitiba "is famous for its bus network".',
      },
      q2: {
        value: "lanes",
        explanation:
          'The text says the dedicated lanes "other vehicles cannot enter".',
      },
      q3: {
        value: "boarding",
        acceptable: ["board"],
        explanation: 'The text says passengers "pay the fare before boarding".',
      },
    },
  },
  {
    slug: "b1-sentence_completion-4",
    level: "b1",
    type: "sentence_completion",
    title: "Forest schools",
    passage:
      "Forest schools allow children to spend most of their lessons outdoors, learning by exploring trees, soil, and weather. " +
      "Teachers report that pupils show improved concentration and stronger teamwork after a few months in the programme. " +
      "Parents, however, must accept that their children may return home with muddy clothes most days.",
    questions: [
      {
        id: "q1",
        prompt: "Forest school children study mainly outside instead of ____.",
      },
      {
        id: "q2",
        prompt: "Teachers say students improve in concentration and ____.",
      },
      {
        id: "q3",
        prompt:
          "Parents need to accept that the children's clothes may be ____.",
      },
    ],
    answerKey: {
      q1: {
        value: "indoors",
        acceptable: ["inside"],
        explanation:
          "Children spend most lessons outdoors, the opposite of indoors.",
      },
      q2: {
        value: "teamwork",
        explanation:
          'The text mentions "improved concentration and stronger teamwork".',
      },
      q3: {
        value: "muddy",
        explanation: 'The text says clothes "may return home muddy most days".',
      },
    },
  },
  {
    slug: "b1-sentence_completion-5",
    level: "b1",
    type: "sentence_completion",
    title: "Volunteer firefighters",
    passage:
      "In many small towns, the fire service depends entirely on local volunteers. " +
      "These ordinary people leave their normal jobs the moment an alarm sounds. " +
      "All volunteers complete a demanding training course before they are allowed to enter a burning building, " +
      "and the equipment they wear can weigh more than twenty kilos.",
    questions: [
      { id: "q1", prompt: "In small towns the fire service relies on ____." },
      { id: "q2", prompt: "Volunteers must complete a tough ____ course." },
      { id: "q3", prompt: "Their full kit can weigh over twenty ____." },
    ],
    answerKey: {
      q1: {
        value: "volunteers",
        explanation:
          'The text says the service "depends entirely on local volunteers".',
      },
      q2: {
        value: "training",
        explanation:
          'The text says volunteers "complete a demanding training course".',
      },
      q3: {
        value: "kilos",
        acceptable: ["kg", "kilograms"],
        explanation: 'The equipment "can weigh more than twenty kilos".',
      },
    },
  },
]);

const B1_NOTE_COMPLETION: ReadingItem[] = bucket([
  {
    slug: "b1-note_completion-1",
    level: "b1",
    type: "note_completion",
    title: "National History Museum tour",
    passage:
      "Welcome to the National History Museum. Our guided tour starts at 10:30 AM in the Main Hall. " +
      "Please ensure your mobile phones are turned off during the presentation to avoid disturbing others. " +
      "We will first visit the Ancient Egypt section. At the end of the tour, you can purchase souvenirs from the gift shop. " +
      "Remember, backpacks must be left at the reception desk for security reasons.",
    questions: [
      { id: "q1", prompt: "Tour meeting point: The ____" },
      { id: "q2", prompt: "Phone status required: ____" },
      { id: "q3", prompt: "First exhibition to visit:" },
      { id: "q4", prompt: "Items to leave at the reception desk:" },
    ],
    answerKey: {
      q1: {
        value: "Main Hall",
        acceptable: ["main hall"],
        explanation: 'The tour starts "in the Main Hall".',
      },
      q2: {
        value: "turned off",
        explanation: 'Phones must be "turned off during the presentation".',
      },
      q3: {
        value: "Ancient Egypt",
        explanation: 'The first stop is "the Ancient Egypt section".',
      },
      q4: {
        value: "backpacks",
        explanation: '"Backpacks must be left at the reception desk".',
      },
    },
  },
  {
    slug: "b1-note_completion-2",
    level: "b1",
    type: "note_completion",
    title: "Public swimming pool",
    passage:
      "The town swimming pool reopens on Monday after refurbishment. " +
      "Lifeguards will be on duty between 6 AM and 10 PM every day. " +
      "Swimmers under sixteen must be accompanied by an adult. " +
      "The annual membership fee has been frozen at $120 for residents. " +
      "All bags must be stored in the new electronic lockers, which take a $1 coin.",
    questions: [
      { id: "q1", prompt: "Lifeguards finish at:" },
      { id: "q2", prompt: "Swimmers under 16 need an ____." },
      { id: "q3", prompt: "Annual membership fee:" },
      { id: "q4", prompt: "Lockers require a ____." },
    ],
    answerKey: {
      q1: {
        value: "10 PM",
        acceptable: ["10pm", "10 p.m."],
        explanation: 'Lifeguards work "between 6 AM and 10 PM".',
      },
      q2: {
        value: "adult",
        explanation: 'Under-16s "must be accompanied by an adult".',
      },
      q3: {
        value: "$120",
        acceptable: ["120", "$120."],
        explanation: 'The fee is "frozen at $120 for residents".',
      },
      q4: {
        value: "$1 coin",
        acceptable: ["1 coin", "$1"],
        explanation: 'Lockers "take a $1 coin".',
      },
    },
  },
  {
    slug: "b1-note_completion-3",
    level: "b1",
    type: "note_completion",
    title: "Volunteer day instructions",
    passage:
      "Thank you for joining our river clean-up day. Volunteers should meet at the Old Bridge at 9:00 AM. " +
      "Wear sturdy boots and bring strong gloves; we will provide bin bags and litter pickers. " +
      "Lunch is included and will be served at 12:30 PM in the village hall. " +
      "If the weather forecast shows storms, the event will be cancelled and we will email you by 7:00 AM.",
    questions: [
      { id: "q1", prompt: "Meeting point: The ____" },
      { id: "q2", prompt: "Volunteers must bring:" },
      { id: "q3", prompt: "Lunch is served at:" },
      { id: "q4", prompt: "If cancelled, an email is sent by ____ AM." },
    ],
    answerKey: {
      q1: {
        value: "Old Bridge",
        acceptable: ["old bridge"],
        explanation: 'Meet "at the Old Bridge at 9:00 AM".',
      },
      q2: {
        value: "strong gloves",
        acceptable: ["gloves"],
        explanation: 'Volunteers must "bring strong gloves".',
      },
      q3: {
        value: "12:30 PM",
        acceptable: ["12:30pm", "12.30 pm"],
        explanation: "Lunch is served at 12:30 PM.",
      },
      q4: {
        value: "7:00",
        acceptable: ["7", "7:00am", "7am"],
        explanation: 'An email is sent "by 7:00 AM".',
      },
    },
  },
  {
    slug: "b1-note_completion-4",
    level: "b1",
    type: "note_completion",
    title: "Cooking class registration",
    passage:
      "Our four-week Italian cooking course begins next month. Classes are on Tuesday evenings from 6:30 to 8:30 PM. " +
      "The course costs $180 and includes all ingredients. " +
      "Each student receives a printed recipe book on the first evening. " +
      "Spaces are limited to fifteen places, and registration closes on the 25th of the month.",
    questions: [
      { id: "q1", prompt: "Class day: ____" },
      { id: "q2", prompt: "Course cost:" },
      { id: "q3", prompt: "Free gift on first evening:" },
      { id: "q4", prompt: "Maximum places: ____" },
    ],
    answerKey: {
      q1: {
        value: "Tuesday",
        acceptable: ["tuesdays", "tuesday evenings"],
        explanation: "Classes are on Tuesday evenings.",
      },
      q2: {
        value: "$180",
        acceptable: ["180", "$180."],
        explanation: '"The course costs $180".',
      },
      q3: {
        value: "recipe book",
        acceptable: ["printed recipe book", "book"],
        explanation:
          'Each student receives "a printed recipe book on the first evening".',
      },
      q4: {
        value: "fifteen",
        acceptable: ["15"],
        explanation: '"Spaces are limited to fifteen places".',
      },
    },
  },
  {
    slug: "b1-note_completion-5",
    level: "b1",
    type: "note_completion",
    title: "Hiking club Saturday walk",
    passage:
      "This Saturday's walk goes through Beech Wood and along the river. " +
      "We meet at the car park behind the village shop at 8:00 AM and expect to return by 4:00 PM. " +
      "The route is about 14 kilometres and includes one steep climb of forty minutes. " +
      "Each walker must carry at least one litre of water. There is a small entrance fee of $3 for the wood.",
    questions: [
      { id: "q1", prompt: "Meeting place: Car park behind the ____" },
      { id: "q2", prompt: "Route distance: about ____ km" },
      { id: "q3", prompt: "Minimum water per walker:" },
      { id: "q4", prompt: "Entrance fee:" },
    ],
    answerKey: {
      q1: {
        value: "village shop",
        acceptable: ["shop"],
        explanation: 'Meet "at the car park behind the village shop".',
      },
      q2: {
        value: "14",
        acceptable: ["fourteen"],
        explanation: 'The route is "about 14 kilometres".',
      },
      q3: {
        value: "one litre",
        acceptable: ["1 litre", "1l", "1 liter"],
        explanation: 'Each walker must carry "at least one litre of water".',
      },
      q4: {
        value: "$3",
        acceptable: ["3", "$3."],
        explanation: 'There is "a small entrance fee of $3".',
      },
    },
  },
]);

const B1_TABLE_COMPLETION: ReadingItem[] = bucket([
  {
    slug: "b1-table_completion-1",
    level: "b1",
    type: "table_completion",
    title: "Language courses",
    passage:
      "We offer three language courses this semester. " +
      "French for Beginners is held on Mondays; you need to buy a specific textbook which costs $20. " +
      "The Spanish Intermediate class is on Wednesdays, and the required material is a bilingual dictionary. " +
      "Finally, the Advanced German course takes place on Fridays, and all students must bring a laptop to participate in online exercises.",
    questions: [
      { id: "q1", prompt: "French — Required Item: A $20 ____" },
      { id: "q2", prompt: "Spanish — Level: ____" },
      { id: "q3", prompt: "____ — Advanced — A laptop" },
    ],
    answerKey: {
      q1: {
        value: "textbook",
        explanation: 'The required item for French is "a specific textbook".',
      },
      q2: {
        value: "Intermediate",
        explanation: 'The Spanish class is the "Intermediate" level.',
      },
      q3: {
        value: "German",
        explanation: "The Advanced German course requires a laptop.",
      },
    },
  },
  {
    slug: "b1-table_completion-2",
    level: "b1",
    type: "table_completion",
    title: "Three new museum exhibits",
    passage:
      "The City Museum opens three new exhibits this autumn. " +
      "The Bronze Age room, curated by Dr Patel, runs for six months on the ground floor. " +
      "The Modern Photography exhibit, curated by Ms Tang, lasts three months on the first floor. " +
      "The Children's Dinosaur Hall, curated by Professor Weiss, will stay permanently in the basement.",
    questions: [
      { id: "q1", prompt: "Bronze Age — Curator: Dr ____" },
      { id: "q2", prompt: "Modern Photography — Duration: ____ months" },
      { id: "q3", prompt: "____ — Permanent — Basement" },
    ],
    answerKey: {
      q1: {
        value: "Patel",
        explanation: "The Bronze Age room is curated by Dr Patel.",
      },
      q2: {
        value: "three",
        acceptable: ["3"],
        explanation: 'Modern Photography "lasts three months".',
      },
      q3: {
        value: "Children's Dinosaur Hall",
        acceptable: [
          "children's dinosaur",
          "dinosaur hall",
          "children's dinosaur hall",
        ],
        explanation:
          "The Children's Dinosaur Hall is permanent and in the basement.",
      },
    },
  },
  {
    slug: "b1-table_completion-3",
    level: "b1",
    type: "table_completion",
    title: "Three short courses for managers",
    passage:
      "Our autumn programme includes three short courses for managers. " +
      "The Negotiation course runs for two days and is led by Sarah Yu. " +
      "The Time Management course lasts only one day and is led by Marco Bianchi. " +
      "Finally, the Leadership Foundations course takes five days and is run by Linda Owusu.",
    questions: [
      { id: "q1", prompt: "Negotiation — Days: ____" },
      { id: "q2", prompt: "Time Management — Trainer: ____ Bianchi" },
      { id: "q3", prompt: "____ Foundations — 5 days — Linda Owusu" },
    ],
    answerKey: {
      q1: {
        value: "two",
        acceptable: ["2"],
        explanation: 'Negotiation "runs for two days".',
      },
      q2: {
        value: "Marco",
        explanation: "Time Management is led by Marco Bianchi.",
      },
      q3: {
        value: "Leadership",
        explanation: "The five-day course is Leadership Foundations.",
      },
    },
  },
  {
    slug: "b1-table_completion-4",
    level: "b1",
    type: "table_completion",
    title: "Three internship programmes",
    passage:
      "Three internship programmes start in June. " +
      "The Marketing internship at Northstar lasts ten weeks and pays $400 per week. " +
      "The Engineering internship at Helios lasts twelve weeks and pays $550 per week. " +
      "The Research internship at Polara lasts six weeks and is unpaid, but covers travel costs.",
    questions: [
      { id: "q1", prompt: "Marketing — Company: ____" },
      { id: "q2", prompt: "Engineering — Pay per week: $____" },
      { id: "q3", prompt: "Research — Length: ____ weeks" },
    ],
    answerKey: {
      q1: {
        value: "Northstar",
        explanation: "The Marketing internship is at Northstar.",
      },
      q2: {
        value: "550",
        acceptable: ["$550"],
        explanation: "Engineering pays $550 per week.",
      },
      q3: {
        value: "six",
        acceptable: ["6"],
        explanation: "The Research internship lasts six weeks.",
      },
    },
  },
  {
    slug: "b1-table_completion-5",
    level: "b1",
    type: "table_completion",
    title: "Three new cycling routes",
    passage:
      "The city is opening three new cycling routes. " +
      "Route Blue follows the river for ten kilometres, with a flat surface ideal for beginners. " +
      "Route Green crosses three parks over a distance of fifteen kilometres and includes a small uphill section. " +
      "Route Red is a serious 25-kilometre loop on country roads and is recommended only for experienced riders.",
    questions: [
      { id: "q1", prompt: "Route Blue — Distance: ____ km" },
      { id: "q2", prompt: "Route Green — Crosses: three ____" },
      { id: "q3", prompt: "Route ____ — 25 km — country roads" },
    ],
    answerKey: {
      q1: {
        value: "ten",
        acceptable: ["10"],
        explanation: 'Route Blue follows the river "for ten kilometres".',
      },
      q2: { value: "parks", explanation: 'Route Green "crosses three parks".' },
      q3: {
        value: "Red",
        explanation: "Route Red is the 25-kilometre country-road route.",
      },
    },
  },
]);

const B1_FLOW_CHART: ReadingItem[] = bucket([
  {
    slug: "b1-flow_chart_completion-1",
    level: "b1",
    type: "flow_chart_completion",
    title: "Plastic recycling",
    passage:
      "The plastic recycling process involves several clear steps. " +
      "First, trucks collect the plastic waste from residential bins. " +
      "Next, the waste is transported to a recycling facility. " +
      "Here, workers sort the items by color and plastic type. " +
      "After sorting, machines wash the plastic to remove any dirt, labels, or food. " +
      "Finally, the clean plastic is melted and formed into new products.",
    questions: [
      {
        id: "q1",
        prompt:
          "Collect plastic waste from bins → Transport the waste to a ____.",
      },
      { id: "q2", prompt: "→ Workers ____ the items by type and color." },
      { id: "q3", prompt: "→ Use machines to ____ the plastic." },
      { id: "q4", prompt: "→ Melt the clean plastic to create ____." },
    ],
    answerKey: {
      q1: {
        value: "recycling facility",
        acceptable: ["facility"],
        explanation: 'The waste is taken to "a recycling facility".',
      },
      q2: {
        value: "sort",
        explanation: 'Workers "sort the items by color and plastic type".',
      },
      q3: {
        value: "wash",
        explanation: 'Machines "wash the plastic" to remove dirt.',
      },
      q4: {
        value: "new products",
        acceptable: ["products"],
        explanation: 'Clean plastic is melted and "formed into new products".',
      },
    },
  },
  {
    slug: "b1-flow_chart_completion-2",
    level: "b1",
    type: "flow_chart_completion",
    title: "Coffee from bean to cup",
    passage:
      "Coffee begins as a small red fruit called a cherry. Pickers harvest the cherries by hand. " +
      "Workers then remove the outer fruit to leave the green beans inside. " +
      "The beans are dried in the sun for several days before being shipped abroad. " +
      "At the destination, roasters heat the beans until they turn dark brown. " +
      "Finally, baristas grind the roasted beans and brew them with hot water.",
    questions: [
      { id: "q1", prompt: "Pickers harvest the ____ by hand." },
      {
        id: "q2",
        prompt: "→ Workers remove the outer fruit to leave the ____ beans.",
      },
      { id: "q3", prompt: "→ Roasters heat the beans until they turn ____." },
      { id: "q4", prompt: "→ Baristas ____ the beans and brew them." },
    ],
    answerKey: {
      q1: {
        value: "cherries",
        acceptable: ["cherry"],
        explanation: "Pickers harvest the cherries by hand.",
      },
      q2: {
        value: "green",
        explanation: 'After removing the fruit, only the "green beans" remain.',
      },
      q3: {
        value: "dark brown",
        acceptable: ["brown"],
        explanation: 'Roasters heat the beans until they "turn dark brown".',
      },
      q4: {
        value: "grind",
        explanation: 'Baristas "grind the roasted beans".',
      },
    },
  },
  {
    slug: "b1-flow_chart_completion-3",
    level: "b1",
    type: "flow_chart_completion",
    title: "Booking a doctor's appointment online",
    passage:
      "Most clinics now allow patients to book appointments online. " +
      "First, you log in to the clinic's website using your patient number. " +
      "Choose a doctor from the list and pick a free time slot in the calendar. " +
      "The system will ask you to describe your symptoms briefly so the staff can prepare. " +
      "Once you confirm, you receive a text message with the appointment details.",
    questions: [
      { id: "q1", prompt: "→ Log in with your patient ____." },
      { id: "q2", prompt: "→ Pick a free time ____ in the calendar." },
      { id: "q3", prompt: "→ Describe your ____ briefly." },
      { id: "q4", prompt: "→ Receive a ____ message with details." },
    ],
    answerKey: {
      q1: {
        value: "number",
        explanation: 'Log in using "your patient number".',
      },
      q2: {
        value: "slot",
        explanation: 'Pick a free "time slot" in the calendar.',
      },
      q3: {
        value: "symptoms",
        explanation: "Describe your symptoms briefly so staff can prepare.",
      },
      q4: { value: "text", explanation: 'You receive "a text message".' },
    },
  },
  {
    slug: "b1-flow_chart_completion-4",
    level: "b1",
    type: "flow_chart_completion",
    title: "How a passport application works",
    passage:
      "Applying for a new passport is a multi-step process. " +
      "First, complete the online form with your personal details. " +
      "Then, upload a recent digital photo that meets the official rules. " +
      "Next, pay the application fee online with a credit card. " +
      "Finally, visit your local post office to provide your fingerprints, and the new passport will be sent to your home within ten days.",
    questions: [
      { id: "q1", prompt: "→ Complete the online ____." },
      { id: "q2", prompt: "→ Upload a recent ____." },
      { id: "q3", prompt: "→ Pay the application ____ online." },
      { id: "q4", prompt: "→ Visit the post office to give your ____." },
    ],
    answerKey: {
      q1: { value: "form", explanation: 'Complete "the online form".' },
      q2: {
        value: "digital photo",
        acceptable: ["photo"],
        explanation: "Upload a recent digital photo.",
      },
      q3: { value: "fee", explanation: "Pay the application fee online." },
      q4: {
        value: "fingerprints",
        explanation: "Visit the post office to provide your fingerprints.",
      },
    },
  },
  {
    slug: "b1-flow_chart_completion-5",
    level: "b1",
    type: "flow_chart_completion",
    title: "Wine production",
    passage:
      "Making red wine begins with the grape harvest in early autumn. " +
      "Workers crush the grapes to release the juice, which is then placed in large tanks. " +
      "Yeast is added to the juice to start fermentation, a process that takes about two weeks. " +
      "After fermentation, the wine is moved to oak barrels, where it ages for at least one year. " +
      "Finally, the matured wine is filtered and poured into bottles, which are sealed with a cork.",
    questions: [
      { id: "q1", prompt: "→ Workers ____ the grapes to release juice." },
      { id: "q2", prompt: "→ Add ____ to start fermentation." },
      { id: "q3", prompt: "→ Move the wine to oak ____ to age." },
      { id: "q4", prompt: "→ Bottles are sealed with a ____." },
    ],
    answerKey: {
      q1: {
        value: "crush",
        explanation: "Workers crush the grapes to release the juice.",
      },
      q2: {
        value: "yeast",
        explanation: "Yeast is added to start fermentation.",
      },
      q3: {
        value: "barrels",
        explanation: "The wine is moved to oak barrels to age.",
      },
      q4: { value: "cork", explanation: "Bottles are sealed with a cork." },
    },
  },
]);

const B1_SHORT_ANSWER: ReadingItem[] = bucket([
  {
    slug: "b1-short_answer-1",
    level: "b1",
    type: "short_answer",
    title: "Alexander Graham Bell",
    passage:
      "Alexander Graham Bell is widely credited with inventing the first practical telephone in 1876. " +
      "Before this, he was a teacher of the deaf, which inspired his deep interest in sound and human communication. " +
      "The first successful words spoken over the telephone were directed to his assistant, Thomas Watson. " +
      "Bell later founded a telecommunications company that became extremely successful.",
    questions: [
      {
        id: "q1",
        prompt: "In what year was the practical telephone invented?",
      },
      { id: "q2", prompt: "What was Alexander Graham Bell's original job?" },
      {
        id: "q3",
        prompt:
          "Who was the first person to hear words spoken over the telephone?",
      },
    ],
    answerKey: {
      q1: {
        value: "1876",
        explanation: 'The text says the telephone was invented "in 1876".',
      },
      q2: {
        value: "teacher of the deaf",
        acceptable: ["teacher", "a teacher of the deaf"],
        explanation: 'Bell "was a teacher of the deaf".',
      },
      q3: {
        value: "Thomas Watson",
        acceptable: ["his assistant", "thomas watson"],
        explanation:
          "The first words were directed to his assistant, Thomas Watson.",
      },
    },
  },
  {
    slug: "b1-short_answer-2",
    level: "b1",
    type: "short_answer",
    title: "The story of denim",
    passage:
      "Denim was first made in the French city of Nimes in the 17th century. " +
      "American businessman Levi Strauss began producing strong denim work trousers in 1873, mainly for gold miners in California. " +
      "The famous blue colour comes from a natural dye called indigo. Today, more than two billion pairs of jeans are sold every year worldwide.",
    questions: [
      { id: "q1", prompt: "Where was denim first made?" },
      { id: "q2", prompt: "Who began producing denim work trousers in 1873?" },
      { id: "q3", prompt: "What dye gives denim its blue colour?" },
    ],
    answerKey: {
      q1: {
        value: "Nimes",
        acceptable: ["the city of nimes", "nimes, france"],
        explanation: "Denim was first made in the French city of Nimes.",
      },
      q2: {
        value: "Levi Strauss",
        acceptable: ["levi strauss"],
        explanation: "Levi Strauss began producing the trousers in 1873.",
      },
      q3: {
        value: "indigo",
        explanation:
          'The blue colour comes from "a natural dye called indigo".',
      },
    },
  },
  {
    slug: "b1-short_answer-3",
    level: "b1",
    type: "short_answer",
    title: "Mount Everest climbers",
    passage:
      "Mount Everest is the highest mountain in the world at 8,849 metres. " +
      "Edmund Hillary and Tenzing Norgay reached the summit for the first time in 1953. " +
      "Today the climb usually costs over $40,000 per person and lasts about two months because climbers need time to adjust to the altitude.",
    questions: [
      { id: "q1", prompt: "How tall is Mount Everest?" },
      { id: "q2", prompt: "In what year was the summit first reached?" },
      { id: "q3", prompt: "How long does a typical climb last?" },
    ],
    answerKey: {
      q1: {
        value: "8,849 metres",
        acceptable: ["8849 metres", "8,849 m", "8849 m"],
        explanation: 'The text says Everest is "8,849 metres" tall.',
      },
      q2: {
        value: "1953",
        explanation: "The summit was first reached in 1953.",
      },
      q3: {
        value: "two months",
        acceptable: ["2 months", "about two months"],
        explanation: 'A typical climb "lasts about two months".',
      },
    },
  },
  {
    slug: "b1-short_answer-4",
    level: "b1",
    type: "short_answer",
    title: "The history of paper",
    passage:
      "The earliest form of paper was produced in China around 100 BCE. " +
      "It was made from a mixture of wood pulp, water, and old fishing nets. " +
      "The technology spread slowly to the Middle East and only reached Europe in the 12th century. " +
      "The invention of the printing press by Johannes Gutenberg in 1440 caused paper demand to rise dramatically.",
    questions: [
      { id: "q1", prompt: "Where was the earliest paper produced?" },
      { id: "q2", prompt: "When did paper reach Europe?" },
      { id: "q3", prompt: "Who invented the printing press?" },
    ],
    answerKey: {
      q1: {
        value: "China",
        explanation: 'The earliest paper was "produced in China".',
      },
      q2: {
        value: "12th century",
        acceptable: ["the 12th century"],
        explanation: 'Paper "reached Europe in the 12th century".',
      },
      q3: {
        value: "Johannes Gutenberg",
        acceptable: ["gutenberg", "johannes gutenberg"],
        explanation: "The printing press was invented by Johannes Gutenberg.",
      },
    },
  },
  {
    slug: "b1-short_answer-5",
    level: "b1",
    type: "short_answer",
    title: "The blue whale",
    passage:
      "The blue whale is the largest animal that has ever lived on Earth, reaching up to 30 metres long and weighing 200 tonnes. " +
      "Despite its huge size, it eats some of the smallest creatures in the ocean — tiny shrimp called krill. " +
      "A single adult blue whale can consume around four tonnes of krill in one day during the summer feeding season.",
    questions: [
      { id: "q1", prompt: "How long can a blue whale grow?" },
      { id: "q2", prompt: "What creatures does the blue whale eat?" },
      { id: "q3", prompt: "How much can a blue whale eat in one day?" },
    ],
    answerKey: {
      q1: {
        value: "30 metres",
        acceptable: ["30m", "thirty metres", "up to 30 metres"],
        explanation: 'Blue whales reach "up to 30 metres long".',
      },
      q2: {
        value: "krill",
        acceptable: ["tiny shrimp", "shrimp"],
        explanation: 'They eat "tiny shrimp called krill".',
      },
      q3: {
        value: "four tonnes",
        acceptable: ["4 tonnes", "around four tonnes"],
        explanation:
          'A blue whale can eat "around four tonnes of krill in one day".',
      },
    },
  },
]);

// ---------------------------------------------------------------------------
// Combined export
// ---------------------------------------------------------------------------
// ===========================================================================
// Skimming and scanning (the two foundational reading skills) — 5 items per
// level per type. Skimming uses 4-option MCQ for main idea / topic / purpose;
// scanning uses short-answer for one specific fact found in the text.
// ===========================================================================

const A2_SKIMMING: ReadingItem[] = bucket([
  {
    slug: "a2-skimming-1",
    level: "a2",
    type: "skimming",
    title: "Smartwatches today",
    passage:
      "Smartwatches are small computers you wear on your wrist. They tell the time like a normal watch, " +
      "but they can also count your steps, check your heart, and show messages from your phone. " +
      "Many people wear a smartwatch when they run or go to the gym. Some smartwatches even let you pay " +
      "for a coffee or a bus ticket without taking your phone out of your pocket.",
    questions: [
      {
        id: "q1",
        prompt: "What is the passage mainly about?",
        mcqOptions: [
          "How to repair a broken smartwatch.",
          "The many things a modern smartwatch can do.",
          "Why old watches were better than new ones.",
          "The price of smartwatches in different shops.",
        ],
      },
    ],
    answerKey: {
      q1: {
        value: 1,
        explanation:
          "The whole passage lists what smartwatches can do (time, steps, heart rate, messages, payments), so it is mainly about their many uses.",
      },
    },
  },
  {
    slug: "a2-skimming-2",
    level: "a2",
    type: "skimming",
    title: "Online classes",
    passage:
      "Online classes have become very popular. Students can study at home using a laptop and the internet. " +
      "They can watch the teacher on a screen and ask questions in a chat box. Online classes are good " +
      "for people who live far from a school, or who work during the day. However, some students miss " +
      "seeing their friends and prefer a normal classroom.",
    questions: [
      {
        id: "q1",
        prompt: "What is the main idea of the passage?",
        mcqOptions: [
          "Online classes are always better than normal classes.",
          "Online classes have good points and bad points for students.",
          "Online classes only work for adult workers.",
          "Online classes use the same books as normal schools.",
        ],
      },
    ],
    answerKey: {
      q1: {
        value: 1,
        explanation:
          "The text gives advantages (study at home, ask in chat) and a disadvantage (missing friends), so the main idea is that online classes have good and bad sides.",
      },
    },
  },
  {
    slug: "a2-skimming-3",
    level: "a2",
    type: "skimming",
    title: "Plastic in the sea",
    passage:
      "Every year, millions of plastic bottles and bags end up in the sea. Fish and birds sometimes eat " +
      "small pieces of plastic and become very ill. Many countries are now asking shops to use less " +
      "plastic and to give customers paper bags instead. People are also learning to take a reusable " +
      "bottle when they leave home, so they do not buy a new plastic one each time.",
    questions: [
      {
        id: "q1",
        prompt: "Why did the writer write this text?",
        mcqOptions: [
          "To sell a new type of plastic bottle.",
          "To explain a problem with plastic and how people are trying to fix it.",
          "To describe a holiday by the sea.",
          "To teach readers how to recycle paper at home.",
        ],
      },
    ],
    answerKey: {
      q1: {
        value: 1,
        explanation:
          "The text describes a problem (plastic harms sea animals) and the actions people are taking (less plastic, paper bags, reusable bottles).",
      },
    },
  },
  {
    slug: "a2-skimming-4",
    level: "a2",
    type: "skimming",
    title: "Bees and flowers",
    passage:
      "Bees are very important small insects. They fly from flower to flower to find food, and as they " +
      "do this they carry yellow dust called pollen with them. This helps the flowers grow into fruit " +
      "like apples, oranges and strawberries. Without bees, farmers would have a much smaller harvest " +
      "and many of the foods we love would become rare.",
    questions: [
      {
        id: "q1",
        prompt: "What is the passage mainly about?",
        mcqOptions: [
          "Why bees can sometimes sting people.",
          "How bees help fruit and food to grow.",
          "Where bees build their homes in winter.",
          "The difference between bees and butterflies.",
        ],
      },
    ],
    answerKey: {
      q1: {
        value: 1,
        explanation:
          "The whole passage explains how bees move pollen between flowers and that this helps fruit grow, so the main topic is bees helping food to grow.",
      },
    },
  },
  {
    slug: "a2-skimming-5",
    level: "a2",
    type: "skimming",
    title: "Life in cities and villages",
    passage:
      "Many people are leaving small villages and moving to big cities. In cities they can find more " +
      "jobs, bigger schools and modern hospitals. There are also more shops, cinemas and restaurants. " +
      "But cities can be noisy and busy, and houses are often expensive. In a quiet village, life is " +
      "slower and the air is cleaner, but there are fewer jobs.",
    questions: [
      {
        id: "q1",
        prompt: "What is the topic of this passage?",
        mcqOptions: [
          "How to build a new village.",
          "The good and bad sides of city life and village life.",
          "The history of one famous city.",
          "A plan to close all the shops in cities.",
        ],
      },
    ],
    answerKey: {
      q1: {
        value: 1,
        explanation:
          "The text compares city life (jobs, shops, but noisy and expensive) with village life (slow, clean, but fewer jobs), so the topic is the good and bad sides of each.",
      },
    },
  },
]);

const A2_SCANNING: ReadingItem[] = bucket([
  {
    slug: "a2-scanning-1",
    level: "a2",
    type: "scanning",
    title: "The Great Wall of China",
    passage:
      "The Great Wall of China is one of the most famous walls in the world. People started to build it " +
      "more than 2,000 years ago to keep enemies out of the country. The wall is more than 21,000 " +
      "kilometres long and crosses mountains, rivers and deserts. Today, millions of tourists visit " +
      "the Great Wall every year.",
    questions: [
      {
        id: "q1",
        prompt: "How long is the Great Wall of China?",
        mcqOptions: [
          "About 2,100 kilometres.",
          "More than 21,000 kilometres.",
          "Exactly 2,000 kilometres.",
          "Less than 1,000 kilometres.",
        ],
      },
      {
        id: "q2",
        prompt: "When did people start to build the wall?",
        mcqOptions: [
          "More than 2,000 years ago.",
          "About 200 years ago.",
          "In the last 50 years.",
          "Around 500 years ago.",
        ],
      },
      {
        id: "q3",
        prompt: "Why did people first build the wall?",
        mcqOptions: [
          "To attract more tourists.",
          "To make farming easier.",
          "To keep enemies out of the country.",
          "To mark the border with the sea.",
        ],
      },
    ],
    answerKey: {
      q1: {
        value: 1,
        explanation:
          'The text says: "The wall is more than 21,000 kilometres long."',
      },
      q2: {
        value: 0,
        explanation:
          'The text says people started building it "more than 2,000 years ago".',
      },
      q3: {
        value: 2,
        explanation:
          'The text says it was built "to keep enemies out of the country".',
      },
    },
  },
  {
    slug: "a2-scanning-2",
    level: "a2",
    type: "scanning",
    title: "The Eiffel Tower",
    passage:
      "The Eiffel Tower stands in the city of Paris in France. A French engineer called Gustave Eiffel " +
      "designed it, and workers finished building it in 1889. The tower is about 330 metres high. " +
      "It was the tallest building in the world for more than 40 years.",
    questions: [
      {
        id: "q1",
        prompt: "In which city does the Eiffel Tower stand?",
        mcqOptions: ["London.", "Madrid.", "Paris.", "Berlin."],
      },
      {
        id: "q2",
        prompt: "In what year was the tower finished?",
        mcqOptions: ["1789.", "1889.", "1989.", "1879."],
      },
      {
        id: "q3",
        prompt: "Who designed the tower?",
        mcqOptions: [
          "A French king.",
          "A French painter.",
          "A British engineer.",
          "Gustave Eiffel.",
        ],
      },
    ],
    answerKey: {
      q1: {
        value: 2,
        explanation:
          'The text says it "stands in the city of Paris in France".',
      },
      q2: {
        value: 1,
        explanation: 'The text says workers "finished building it in 1889".',
      },
      q3: {
        value: 3,
        explanation:
          'The text says "A French engineer called Gustave Eiffel designed it".',
      },
    },
  },
  {
    slug: "a2-scanning-3",
    level: "a2",
    type: "scanning",
    title: "Mount Everest",
    passage:
      "Mount Everest is the highest mountain on Earth. It stands between Nepal and China, in the Himalayan " +
      "mountain range. The top of the mountain is 8,849 metres above sea level. The first climbers to " +
      "reach the top were Edmund Hillary and Tenzing Norgay in 1953.",
    questions: [
      {
        id: "q1",
        prompt: "How high is the top of Mount Everest above sea level?",
        mcqOptions: [
          "8,849 metres.",
          "4,849 metres.",
          "8,489 metres.",
          "9,884 metres.",
        ],
      },
      {
        id: "q2",
        prompt: "Where does Mount Everest stand?",
        mcqOptions: [
          "Between India and Pakistan.",
          "Between China and Russia.",
          "Inside Nepal only.",
          "Between Nepal and China.",
        ],
      },
      {
        id: "q3",
        prompt: "Who first reached the top of Everest?",
        mcqOptions: [
          "A team from Japan in 1933.",
          "Edmund Hillary and Tenzing Norgay.",
          "George Mallory in 1924.",
          "A Chinese team in 1960.",
        ],
      },
    ],
    answerKey: {
      q1: {
        value: 0,
        explanation:
          'The text says "The top of the mountain is 8,849 metres above sea level."',
      },
      q2: {
        value: 3,
        explanation: 'The text says it "stands between Nepal and China".',
      },
      q3: {
        value: 1,
        explanation:
          'The text says "The first climbers to reach the top were Edmund Hillary and Tenzing Norgay in 1953."',
      },
    },
  },
  {
    slug: "a2-scanning-4",
    level: "a2",
    type: "scanning",
    title: "The first Olympic Games",
    passage:
      "The Olympic Games are very old. The first ancient Olympic Games took place in Greece in 776 BC. " +
      "Only men could take part, and they ran, jumped and threw a heavy stone called a discus. " +
      "The modern Olympic Games started in Athens in 1896 and now happen every four years.",
    questions: [
      {
        id: "q1",
        prompt: "In which year did the first ancient Olympic Games take place?",
        mcqOptions: ["1896.", "776 AD.", "776 BC.", "1776."],
      },
      {
        id: "q2",
        prompt: "In which city did the modern Olympic Games begin?",
        mcqOptions: ["Athens.", "Rome.", "Paris.", "London."],
      },
      {
        id: "q3",
        prompt: "How often do the modern Olympic Games happen?",
        mcqOptions: [
          "Every year.",
          "Every four years.",
          "Every two years.",
          "Every ten years.",
        ],
      },
    ],
    answerKey: {
      q1: {
        value: 2,
        explanation:
          'The text says "The first ancient Olympic Games took place in Greece in 776 BC."',
      },
      q2: {
        value: 0,
        explanation:
          'The text says "The modern Olympic Games started in Athens in 1896."',
      },
      q3: {
        value: 1,
        explanation: 'The text says they "now happen every four years".',
      },
    },
  },
  {
    slug: "a2-scanning-5",
    level: "a2",
    type: "scanning",
    title: "The Amazon rainforest",
    passage:
      "The Amazon rainforest is the largest tropical forest in the world. It covers about 5.5 million " +
      "square kilometres of South America. The forest is home to thousands of types of plants, birds, " +
      "monkeys and insects. The Amazon River, which runs through the forest, is around 6,400 kilometres long.",
    questions: [
      {
        id: "q1",
        prompt: "About how much area does the Amazon rainforest cover?",
        mcqOptions: [
          "About 55 thousand square kilometres.",
          "About 5.5 million square kilometres.",
          "About 550 million square kilometres.",
          "About 5,500 square kilometres.",
        ],
      },
      {
        id: "q2",
        prompt: "About how long is the Amazon River?",
        mcqOptions: [
          "Around 640 kilometres.",
          "Around 4,600 kilometres.",
          "Around 6,400 kilometres.",
          "Around 64,000 kilometres.",
        ],
      },
      {
        id: "q3",
        prompt: "On which continent is the Amazon rainforest?",
        mcqOptions: ["Africa.", "Asia.", "Australia.", "South America."],
      },
    ],
    answerKey: {
      q1: {
        value: 1,
        explanation:
          'The text says it "covers about 5.5 million square kilometres of South America".',
      },
      q2: {
        value: 2,
        explanation:
          'The text says the Amazon River "is around 6,400 kilometres long".',
      },
      q3: {
        value: 3,
        explanation: "The text places the rainforest in South America.",
      },
    },
  },
]);

const B1_SKIMMING: ReadingItem[] = bucket([
  {
    slug: "b1-skimming-1",
    level: "b1",
    type: "skimming",
    title: "The growth of renewable energy",
    passage:
      "Over the last twenty years, the way we make electricity has changed faster than at any time in " +
      "history. Coal and oil power stations, which used to produce most of the world's electricity, are " +
      "slowly being replaced by wind farms, solar panels and large hydroelectric dams. Many governments " +
      "now offer money to families and companies that install solar panels on their roofs. Renewable " +
      "energy is also becoming cheaper every year, which means that in many countries it is now less " +
      "expensive to build a new wind farm than a new coal power station. Experts believe this trend " +
      "will only get stronger in the next decade.",
    questions: [
      {
        id: "q1",
        prompt: "What is the writer's main purpose in this passage?",
        mcqOptions: [
          "To complain that wind farms spoil the view.",
          "To describe a fast change from old fuels to renewable energy.",
          "To explain how a single solar panel is built.",
          "To give detailed prices for electricity in one country.",
        ],
      },
    ],
    answerKey: {
      q1: {
        value: 1,
        explanation:
          "The whole text describes how electricity is shifting from coal and oil to renewables, so the writer's purpose is to describe this change.",
      },
    },
  },
  {
    slug: "b1-skimming-2",
    level: "b1",
    type: "skimming",
    title: "The story of coffee",
    passage:
      "Coffee is one of the most popular drinks in the world, but it has a surprising history. It " +
      "probably started in the highlands of Ethiopia, where farmers noticed that goats became very " +
      "lively after eating the red berries of a certain bush. Coffee then travelled to the Middle East, " +
      "where the first coffee houses opened in cities such as Cairo and Istanbul. From there, traders " +
      "brought coffee to Europe in the 17th century, and later to South America, which is now the " +
      "biggest coffee-producing region in the world.",
    questions: [
      {
        id: "q1",
        prompt: "What is the passage mainly about?",
        mcqOptions: [
          "How to make a good cup of coffee at home.",
          "The journey of coffee from Ethiopia to the rest of the world.",
          "The health problems caused by drinking too much coffee.",
          "Why goats should not eat red berries.",
        ],
      },
    ],
    answerKey: {
      q1: {
        value: 1,
        explanation:
          "The text traces coffee from Ethiopia, to the Middle East, to Europe, and finally to South America, so it is mainly about coffee's journey across the world.",
      },
    },
  },
  {
    slug: "b1-skimming-3",
    level: "b1",
    type: "skimming",
    title: "Sleep and memory",
    passage:
      "Most adults need around seven to nine hours of sleep each night, but many people get much less. " +
      "Scientists have shown that sleep is not a waste of time. While we sleep, the brain quietly " +
      "organises the things we learned during the day and decides which memories to keep. Students who " +
      "sleep well before an exam usually remember more facts than those who study late and only sleep " +
      "for a few hours. Even short naps in the afternoon can help us remember new information better.",
    questions: [
      {
        id: "q1",
        prompt: "What is the main idea of the passage?",
        mcqOptions: [
          "Adults should always sleep for exactly nine hours.",
          "Sleep helps the brain organise and keep new memories.",
          "Naps in the afternoon are dangerous for students.",
          "Studying late is the best way to pass an exam.",
        ],
      },
    ],
    answerKey: {
      q1: {
        value: 1,
        explanation:
          "The passage explains that during sleep the brain organises memories and that good sleep helps students remember more, so the main idea is that sleep helps memory.",
      },
    },
  },
  {
    slug: "b1-skimming-4",
    level: "b1",
    type: "skimming",
    title: "Gardens in the city",
    passage:
      "In recent years, many cities have started to use empty land, rooftops and even old car parks as " +
      "small gardens. Local people grow vegetables, fruit and flowers in these spaces. Supporters say " +
      "city gardens give people fresh, cheap food and a chance to meet their neighbours. Children also " +
      "learn where their food really comes from. Of course, city gardens cannot feed an entire city, " +
      "but they make neighbourhoods greener, cooler in summer, and more pleasant places to live.",
    questions: [
      {
        id: "q1",
        prompt: "What is the writer's overall view of city gardens?",
        mcqOptions: [
          "They are a waste of money for most cities.",
          "They are mostly positive, even if they cannot feed everyone.",
          "They are dangerous for children and old people.",
          "They should replace all of a city's parks.",
        ],
      },
    ],
    answerKey: {
      q1: {
        value: 1,
        explanation:
          "The writer lists several benefits (food, neighbours, learning, cooler streets) and only one limit (cannot feed an entire city), so the overall view is mostly positive.",
      },
    },
  },
  {
    slug: "b1-skimming-5",
    level: "b1",
    type: "skimming",
    title: "Artificial intelligence in classrooms",
    passage:
      "Artificial intelligence, or AI, is starting to appear in schools around the world. Some teachers " +
      "now use AI tools to give students extra practice questions, to mark simple tests, or to help " +
      "students who are learning a foreign language. Supporters say AI can give each student more " +
      "personal attention than a single teacher in a busy classroom can. Critics warn that students " +
      "may stop thinking for themselves if a computer always gives them the answer. Most experts agree " +
      "that AI should support teachers, not replace them.",
    questions: [
      {
        id: "q1",
        prompt: "What is the main purpose of the passage?",
        mcqOptions: [
          "To advertise a new AI product for sale to schools.",
          "To present both the good and bad sides of using AI in classrooms.",
          "To explain how to build an AI program from scratch.",
          "To argue that all teachers should be replaced by computers.",
        ],
      },
    ],
    answerKey: {
      q1: {
        value: 1,
        explanation:
          "The text gives both supporters' arguments and critics' warnings, and ends with a balanced view, so its purpose is to present both sides of AI in classrooms.",
      },
    },
  },
]);

// B1 scanning is fill-in-the-blank (short-answer) shape: each passage has
// 3 questions, each one looking for ONE specific fact, name or number from
// the text. The grader / validator / admin / player all detect this shape
// per-question by the absence of `mcqOptions` and switch to text-input + the
// `acceptable[]` alternative-spelling list.
const B1_SCANNING_INSTR =
  "Scan the passage to find specific facts. " +
  "Answer each question in NO MORE THAN THREE WORDS AND/OR A NUMBER from the text.";

const B1_SCANNING: ReadingItem[] = bucket([
  {
    slug: "b1-scanning-1",
    level: "b1",
    type: "scanning",
    title: "Marie Curie",
    instructions: B1_SCANNING_INSTR,
    passage:
      "Marie Curie was a Polish-French scientist who became famous for her work on radioactive elements. " +
      "She was the first woman to win a Nobel Prize, which she received in 1903 in Physics, together " +
      "with her husband Pierre Curie. Eight years later, in 1911, she won a second Nobel Prize, this " +
      "time in Chemistry, for the discovery of two new elements: polonium and radium. She is still the " +
      "only person to have won Nobel Prizes in two different sciences.",
    questions: [
      {
        id: "q1",
        prompt: "In which year did Marie Curie win her first Nobel Prize?",
      },
      { id: "q2", prompt: "In which subject was her second Nobel Prize?" },
      { id: "q3", prompt: "What was the name of Marie Curie's husband?" },
    ],
    answerKey: {
      q1: {
        value: "1903",
        acceptable: ["in 1903"],
        explanation:
          'The text says she "received [the prize] in 1903 in Physics".',
      },
      q2: {
        value: "Chemistry",
        acceptable: ["chemistry", "in Chemistry"],
        explanation: 'The text says her second Nobel was "in Chemistry".',
      },
      q3: {
        value: "Pierre Curie",
        acceptable: ["Pierre", "pierre curie"],
        explanation: 'The text refers to "her husband Pierre Curie".',
      },
    },
  },
  {
    slug: "b1-scanning-2",
    level: "b1",
    type: "scanning",
    title: "The Sahara Desert",
    instructions: B1_SCANNING_INSTR,
    passage:
      "The Sahara is the largest hot desert in the world. It stretches across most of northern Africa " +
      "and covers around 9 million square kilometres, an area almost as large as the whole of the " +
      "United States. Although the Sahara is famous for its huge sand dunes, much of the desert is " +
      "actually made of rocky plateaus, gravel plains and dry mountains. Daytime temperatures often " +
      "rise above 45 degrees Celsius in summer.",
    questions: [
      {
        id: "q1",
        prompt: "About how many square kilometres does the Sahara cover?",
      },
      {
        id: "q2",
        prompt: "Which part of Africa does the Sahara stretch across?",
      },
      {
        id: "q3",
        prompt:
          "Above how many degrees Celsius can the Sahara reach in summer?",
      },
    ],
    answerKey: {
      q1: {
        value: "9 million",
        acceptable: ["nine million", "around 9 million", "9,000,000"],
        explanation:
          'The text says it "covers around 9 million square kilometres".',
      },
      q2: {
        value: "northern Africa",
        acceptable: ["the north", "north Africa", "northern"],
        explanation:
          'The text says it "stretches across most of northern Africa".',
      },
      q3: {
        value: "45",
        acceptable: ["45 degrees", "above 45", "forty-five"],
        explanation:
          'The text says "Daytime temperatures often rise above 45 degrees Celsius in summer."',
      },
    },
  },
  {
    slug: "b1-scanning-3",
    level: "b1",
    type: "scanning",
    title: "The story of Wikipedia",
    instructions: B1_SCANNING_INSTR,
    passage:
      "Wikipedia is one of the most-visited websites in the world. It was created by Jimmy Wales and " +
      "Larry Sanger and went online for the first time in January 2001. The original idea was to build " +
      "a free encyclopedia that anyone could read and that volunteers could edit. Today, Wikipedia is " +
      "available in more than 300 languages and contains over 60 million articles, all written and " +
      "checked by people who do not get paid for their work.",
    questions: [
      {
        id: "q1",
        prompt: "In which month and year did Wikipedia first go online?",
      },
      { id: "q2", prompt: "In how many languages is Wikipedia now available?" },
      { id: "q3", prompt: "About how many articles does Wikipedia contain?" },
    ],
    answerKey: {
      q1: {
        value: "January 2001",
        acceptable: ["Jan 2001", "in January 2001", "01/2001"],
        explanation:
          'The text says it "went online for the first time in January 2001".',
      },
      q2: {
        value: "more than 300",
        acceptable: ["over 300", "300+", "more than three hundred"],
        explanation:
          'The text says it "is available in more than 300 languages".',
      },
      q3: {
        value: "60 million",
        acceptable: ["over 60 million", "sixty million", "60,000,000"],
        explanation: 'The text says it "contains over 60 million articles".',
      },
    },
  },
  {
    slug: "b1-scanning-4",
    level: "b1",
    type: "scanning",
    title: "Concorde",
    instructions: B1_SCANNING_INSTR,
    passage:
      "Concorde was a famous passenger plane that could fly faster than the speed of sound. Built by " +
      "engineers from Britain and France, it began carrying passengers in 1976. At top speed, Concorde " +
      "could travel at about 2,180 kilometres per hour, more than twice as fast as a normal jet. " +
      "A flight from London to New York took only three and a half hours. Concorde stopped flying in " +
      "2003 because it was very expensive to operate.",
    questions: [
      {
        id: "q1",
        prompt: "In which year did Concorde start carrying passengers?",
      },
      {
        id: "q2",
        prompt: "What was Concorde's top speed in kilometres per hour?",
      },
      { id: "q3", prompt: "In which year did Concorde stop flying?" },
    ],
    answerKey: {
      q1: {
        value: "1976",
        acceptable: ["in 1976"],
        explanation: 'The text says "it began carrying passengers in 1976".',
      },
      q2: {
        value: "2,180",
        acceptable: ["2180", "about 2,180", "2,180 km/h"],
        explanation:
          'The text says "Concorde could travel at about 2,180 kilometres per hour."',
      },
      q3: {
        value: "2003",
        acceptable: ["in 2003"],
        explanation: 'The text says "Concorde stopped flying in 2003".',
      },
    },
  },
  {
    slug: "b1-scanning-5",
    level: "b1",
    type: "scanning",
    title: "The Great Pyramid of Giza",
    instructions: B1_SCANNING_INSTR,
    passage:
      "The Great Pyramid of Giza, in Egypt, was built more than 4,500 years ago for the pharaoh Khufu. " +
      "When it was finished, it stood about 147 metres tall and was the tallest human-made structure " +
      "in the world. Over the centuries, the outer stones were taken away or worn down by the wind, so " +
      "today the pyramid is around 139 metres high. It is the only one of the seven ancient wonders " +
      "of the world that still stands almost complete.",
    questions: [
      { id: "q1", prompt: "For which pharaoh was the Great Pyramid built?" },
      {
        id: "q2",
        prompt:
          "How tall (in metres) was the pyramid when it was first finished?",
      },
      { id: "q3", prompt: "About how many metres high is the pyramid today?" },
    ],
    answerKey: {
      q1: {
        value: "Khufu",
        acceptable: ["khufu", "the pharaoh Khufu", "pharaoh Khufu"],
        explanation: 'The text says it was built "for the pharaoh Khufu".',
      },
      q2: {
        value: "147",
        acceptable: ["147 metres", "about 147", "one hundred and forty-seven"],
        explanation:
          'The text says "it stood about 147 metres tall" when finished.',
      },
      q3: {
        value: "139",
        acceptable: ["139 metres", "around 139", "one hundred and thirty-nine"],
        explanation:
          'The text says "today the pyramid is around 139 metres high".',
      },
    },
  },
]);

export const READING_ITEMS: ReadingItem[] = [
  ...A2_SKIMMING,
  ...A2_SCANNING,
  ...A2_MCQ,
  ...A2_TFNG,
  ...A2_YNNG,
  ...A2_MATCHING_HEADINGS,
  ...A2_MATCHING_FEATURES,
  ...A2_SENTENCE_COMPLETION,
  ...A2_NOTE_COMPLETION,
  ...A2_TABLE_COMPLETION,
  ...A2_FLOW_CHART,
  ...A2_SHORT_ANSWER,
  ...B1_SKIMMING,
  ...B1_SCANNING,
  ...B1_MCQ,
  ...B1_TFNG,
  ...B1_YNNG,
  ...B1_MATCHING_HEADINGS,
  ...B1_MATCHING_FEATURES,
  ...B1_SENTENCE_COMPLETION,
  ...B1_NOTE_COMPLETION,
  ...B1_TABLE_COMPLETION,
  ...B1_FLOW_CHART,
  ...B1_SHORT_ANSWER,
];
