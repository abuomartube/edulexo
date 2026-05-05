export type Voice = "alloy" | "nova";

export interface Segment {
  voice: Voice;
  text: string;
}

export type QuestionType =
  | "mcq"
  | "matching"
  | "note_completion"
  | "sentence_completion"
  | "short_answer";

export interface MCQQuestion {
  id: string;
  type: "mcq";
  prompt: string;
  options: string[];
  answer: number;
}

export interface MatchingQuestion {
  id: string;
  type: "matching";
  prompt: string;
  items: string[];
  options: string[];
  answers: number[];
}

export interface CompletionQuestion {
  id: string;
  type: "note_completion" | "sentence_completion" | "short_answer";
  prompt: string;
  wordLimit: number;
  answer: string;
  acceptable: string[];
  context?: string;
}

export type Question = MCQQuestion | MatchingQuestion | CompletionQuestion;

export interface ListeningTest {
  id: string;
  sectionId: 1 | 2 | 3 | 4;
  title: string;
  description: string;
  segments: Segment[];
  questions: Question[];
}

export interface ListeningSection {
  id: 1 | 2 | 3 | 4;
  title: string;
  description: string;
}

export const SECTIONS: ListeningSection[] = [
  {
    id: 1,
    title: "Section 1",
    description:
      "A conversation between two people set in an everyday social context.",
  },
  {
    id: 2,
    title: "Section 2",
    description: "A monologue set in an everyday social context.",
  },
  {
    id: 3,
    title: "Section 3",
    description:
      "A conversation between up to four people set in an educational or training context.",
  },
  {
    id: 4,
    title: "Section 4",
    description: "A monologue on an academic subject.",
  },
];

export const TESTS: ListeningTest[] = [];
