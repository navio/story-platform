-- Migration: Add story_arc to stories, structural_metadata and rating to chapters

alter table stories
  add column if not exists story_arc jsonb;

alter table chapters
  add column if not exists structural_metadata jsonb,
  add column if not exists rating integer;