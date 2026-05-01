import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { customFetch } from "./custom-fetch";
import type { FlashcardLevel } from "./generated/api.schemas";

// ── Types ──────────────────────────────────────────────────────────────────

export interface WordOfDay {
  id: number;
  english: string;
  arabic: string;
  level: FlashcardLevel;
  category: string;
  exampleSentence?: string;
  exampleSentenceArabic?: string;
}

export interface StreakInfo {
  streak: number;
  totalDays: number;
}

export interface QuizQuestion {
  flashcard: WordOfDay;
  options: string[];
  correctIndex: number;
}

export interface FillBlankQuestion {
  flashcard: WordOfDay;
  sentence: string;
}

export interface SrsUpdateResult {
  flashcardId: number;
  nextReviewAt: string;
  intervalDays: number;
  reviewCount: number;
}

// ── Bookmarks ──────────────────────────────────────────────────────────────

export const useListBookmarks = () =>
  useQuery<number[]>({
    queryKey: ["/api-ielts/bookmarks"],
    queryFn: () => customFetch<number[]>("/api-ielts/bookmarks", { method: "GET" }),
  });

export const useToggleBookmark = () => {
  const qc = useQueryClient();
  return useMutation<{ bookmarked: boolean }, unknown, number>({
    mutationFn: (id) => customFetch<{ bookmarked: boolean }>(`/api-ielts/bookmarks/${id}`, { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api-ielts/bookmarks"] }),
  });
};

// ── Word of the Day ────────────────────────────────────────────────────────

export const useWordOfDay = () =>
  useQuery<WordOfDay | null>({
    queryKey: ["/api-ielts/word-of-day"],
    queryFn: () => customFetch<WordOfDay>("/api-ielts/word-of-day", { method: "GET" }),
  });

// ── Streak ─────────────────────────────────────────────────────────────────

export const useStreak = () =>
  useQuery<StreakInfo>({
    queryKey: ["/api-ielts/streak"],
    queryFn: () => customFetch<StreakInfo>("/api-ielts/streak", { method: "GET" }),
  });

// ── XP ─────────────────────────────────────────────────────────────────────

export interface XpInfo {
  total: number;
  todayXp: number;
  level: number;
  levelName: string;
}

export interface AwardXpResult {
  awarded: number;
  total: number;
  level: number;
  levelName: string;
}

export const useXp = () =>
  useQuery<XpInfo>({
    queryKey: ["/api-ielts/xp"],
    queryFn: () => customFetch<XpInfo>("/api-ielts/xp", { method: "GET" }),
  });

export const useAwardXp = () => {
  const qc = useQueryClient();
  return useMutation<AwardXpResult, unknown, { activity: string; amount: number }>({
    mutationFn: ({ activity, amount }) =>
      customFetch<AwardXpResult>("/api-ielts/xp/award", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activity, amount }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api-ielts/xp"] }),
  });
};

// ── Weak Words ─────────────────────────────────────────────────────────────

export interface WeakWordItem {
  id: number;
  flashcardId: number;
  wrongCount: number;
  lastWrongAt: string;
  english: string;
  arabic: string;
  level: string;
  category: string;
  exampleSentence?: string;
  exampleSentenceArabic?: string;
}

export const useWeakWords = () =>
  useQuery<WeakWordItem[]>({
    queryKey: ["/api-ielts/weak-words"],
    queryFn: () => customFetch<WeakWordItem[]>("/api-ielts/weak-words", { method: "GET" }),
  });

export const useAddWeakWords = () => {
  const qc = useQueryClient();
  return useMutation<{ added: number }, unknown, number[]>({
    mutationFn: (flashcardIds) =>
      customFetch<{ added: number }>("/api-ielts/weak-words/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ flashcardIds }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api-ielts/weak-words"] }),
  });
};

export const useMasterWeakWord = () => {
  const qc = useQueryClient();
  return useMutation<{ mastered: boolean }, unknown, number>({
    mutationFn: (id) =>
      customFetch<{ mastered: boolean }>(`/api-ielts/weak-words/${id}/master`, { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api-ielts/weak-words"] }),
  });
};

// Add a weak word by its English word string — for synonym/antonym modes.
export const useAddWeakWordByWord = () => {
  const qc = useQueryClient();
  return useMutation<{ added: number }, unknown, string>({
    mutationFn: (word) =>
      customFetch<{ added: number }>("/api-ielts/weak-words/add-by-word", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ word }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api-ielts/weak-words"] }),
  });
};

// Phrasal verb weak tracking — toggle individual phrasal verbs by their JSON id.
export const usePhrasalVerbWeak = () => {
  const qc = useQueryClient();
  const query = useQuery<{ ids: number[] }>({
    queryKey: ["/api-ielts/phrasal-verbs/weak"],
    queryFn: () => customFetch<{ ids: number[] }>("/api-ielts/phrasal-verbs/weak"),
    staleTime: 30_000,
  });
  const toggle = useMutation<{ weak: boolean }, unknown, number>({
    mutationFn: (id) =>
      customFetch<{ weak: boolean }>("/api-ielts/phrasal-verbs/weak/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api-ielts/phrasal-verbs/weak"] }),
  });
  return { weakIds: query.data?.ids ?? [], toggle };
};

// ── Quiz ───────────────────────────────────────────────────────────────────

export const useQuiz = (level?: string, count = 10) =>
  useQuery<QuizQuestion[]>({
    queryKey: ["/api-ielts/quiz", level, count],
    queryFn: () => {
      const params = new URLSearchParams();
      if (level && level !== "ALL") params.set("level", level);
      params.set("count", String(count));
      return customFetch<QuizQuestion[]>(`/api-ielts/quiz?${params}`, { method: "GET" });
    },
  });

// ── Fill in the Blank ──────────────────────────────────────────────────────

export const useFillBlank = (level?: string, count = 10) =>
  useQuery<FillBlankQuestion[]>({
    queryKey: ["/api-ielts/fill-blank", level, count],
    queryFn: () => {
      const params = new URLSearchParams();
      if (level && level !== "ALL") params.set("level", level);
      params.set("count", String(count));
      return customFetch<FillBlankQuestion[]>(`/api-ielts/fill-blank?${params}`, { method: "GET" });
    },
  });

// ── SRS ────────────────────────────────────────────────────────────────────

export const useSrsDue = (level?: string) =>
  useQuery<WordOfDay[]>({
    queryKey: ["/api-ielts/srs/due", level],
    queryFn: () => {
      const params = level && level !== "ALL" ? `?level=${level}` : "";
      return customFetch<WordOfDay[]>(`/api-ielts/srs/due${params}`, { method: "GET" });
    },
  });

export const useUpdateSrs = () => {
  const qc = useQueryClient();
  return useMutation<SrsUpdateResult, unknown, { id: number; known: boolean }>({
    mutationFn: ({ id, known }) =>
      customFetch<SrsUpdateResult>(`/api-ielts/srs/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ known }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api-ielts/srs/due"] }),
  });
};
