# Milestone 1: Schema & Types Update

## Objective
Update the database schema and TypeScript types to support the new story arc metadata and chapter rating features.

## Implementation Steps

### 1. Database Schema Changes

#### a. Stories Table
- Add a `story_arc` field (type: `jsonb` or `text`) to store the full story arc/outline generated at story creation.

#### b. Chapters Table
- Add a `structural_metadata` field (type: `jsonb` or `text`) to store per-chapter guidance/arc step.
- Add a `rating` field (type: `integer` or `enum`) to store user ratings for each chapter.

#### c. Migration
- Write a migration script to add these fields to the database.

### 2. TypeScript Types

#### a. Story Type
- Add a `story_arc` field to the `Story` type.

#### b. Chapter Type
- Add a `structural_metadata` field to the `Chapter` type.
- Add a `rating` field to the `Chapter` type.

## Details of the Change

- The `story_arc` field will allow the backend to store a structured outline (e.g., hero’s journey steps) for each story.
- The `structural_metadata` field in chapters will allow each chapter to be associated with a specific step or guidance from the arc.
- The `rating` field will allow users to rate each chapter, supporting future curation and feedback features.

## Acceptance Criteria

- The database schema includes the new fields (`story_arc`, `structural_metadata`, `rating`).
- The TypeScript types for Story and Chapter are updated accordingly.
- Migration scripts are present and tested.