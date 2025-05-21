export type Story = {
  id: string;
  title: string;
  status: string;
  created_at: string;
  updated_at: string;
  preferences?: any;
  story_length?: number;
  reading_level?: number;
  chapter_length?: string;
  structural_prompt?: string;
};