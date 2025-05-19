supabase migration new add_story_config_fields
ALTER TABLE stories
  ADD COLUMN reading_level integer,
  ADD COLUMN story_length integer,
  ADD COLUMN chapter_length integer,
  ADD COLUMN structural_prompt text;
