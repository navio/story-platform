import { Preferences } from './Preferences'; // Import Preferences

export type Story = {
  id: string;
  user_id: string; // From backend
  title: string;
  status: string;
  created_at: string;
  updated_at: string;
  preferences?: Preferences; // Use the Preferences type
  reading_level?: number;
  story_length?: number;
  chapter_length?: number; // Ensure this is number
  structural_prompt?: string;
};
