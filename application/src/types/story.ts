export type Story = {
  id: string;
  title: string;
  status: string;
  created_at: string;
  updated_at: string;
  preferences?: Record<string, unknown>;
  story_length?: number;
  reading_level?: number;
  chapter_length?: string;
  structural_prompt?: string;
  story_arc?: Record<string, unknown>;
};