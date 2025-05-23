-- Supabase Database Schema for Story Platform

-- Table: stories
create table if not exists stories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  title text not null,
  status text check (status in ('in_progress', 'completed')) not null default 'in_progress',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  preferences jsonb
-- Migration: Add new fields to stories table (section 7.1 ARCHITECTURE_PLAN.md)
alter table stories
  add column if not exists reading_level integer,
  add column if not exists story_length integer,
  add column if not exists chapter_length integer,
  add column if not exists structural_prompt text;

-- Existing stories will have these fields as NULL by default.
-- If you want to backfill with defaults, run an UPDATE statement as needed, e.g.:
-- update stories set reading_level = 0 where reading_level is null;
);

-- Table: chapters
create table if not exists chapters (
  id uuid primary key default gen_random_uuid(),
  story_id uuid references stories(id) not null,
  chapter_number int not null,
  content text not null,
  created_at timestamptz not null default now(),
  prompt text
);

-- Table: user_preferences (optional, for global settings)
create table if not exists user_preferences (
  user_id uuid primary key references auth.users,
  preferences jsonb
);

-- Indexes for efficient queries
create index if not exists idx_stories_user_id on stories(user_id);
create index if not exists idx_chapters_story_id on chapters(story_id);

-- Supabase Auth handles the users table.