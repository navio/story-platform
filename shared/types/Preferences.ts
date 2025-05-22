export type Preferences = {
  structural_prompt?: string;
  chapter_length?: number; // Ensure this is number
  story_length?: number;
  // reading_level was part of Story object directly, not Preferences in backend.
  // Let's omit [key: string]: any; for stricter typing unless explicitly needed later.
};
