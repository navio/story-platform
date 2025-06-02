export type Chapter = {
  id: string;
  chapter_number: number;
  content: string;
  created_at: string;
  prompt?: string;
  structural_metadata?: Record<string, unknown>;
  rating?: number;
};

export type Continuation = {
  id: string;
  description: string;
};

export type ContinueStoryResponse = {
  chapter: Chapter;
  continuations: Continuation[];
};