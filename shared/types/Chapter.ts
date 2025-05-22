export type Chapter = {
  id: string;
  story_id: string; // From backend
  chapter_number: number;
  content: string;
  created_at: string;
  prompt?: string;
};
