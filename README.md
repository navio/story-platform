# Story Platform

A premium, book-like, responsive web application for interactive, AI-powered storytelling. Built with React, TypeScript, Vite, Supabase, and OpenAI, it enables users to create, read, and manage dynamic stories with a focus on narrative structure, reading level adaptation, and a distraction-free experience.

---

## Table of Contents

- [Project Description](#project-description)
- [Features](#features)
- [Architecture](#architecture)
- [Technical and Product Challenges](#technical-and-product-challenges)
- [Modes to Run](#modes-to-run)
- [Testing Environment](#testing-environment)
- [References](#references)

---

## Project Description

The Story Platform empowers users to generate and read AI-driven stories, with configurable reading levels, story arcs, and chapter-by-chapter progression. It combines a modern, distraction-free UI with robust backend logic and advanced prompt engineering for narrative coherence.

---

## Features

- **Authentication:** Secure login/registration via Supabase Auth ([`Auth.tsx`](application/src/Auth.tsx:17)).
- **Story Creation:** Configurable story creation (reading level, length, prompts) via [`NewStoryDialog.tsx`](application/src/components/NewStoryDialog.tsx:48).
- **AI-Powered Story Generation:** OpenAI generates a structured story arc and chapters, adapting to user preferences.
- **Story Arc Visualization:** Full story outline and per-chapter guidance ([`StoryView.tsx`](application/src/components/StoryView.tsx:49)).
- **Chapter Management:** Add, read, and rate chapters; view AI-generated continuations ([`ChapterList.tsx`](application/src/components/ChapterList.tsx:13)).
- **Settings Management:** Update story settings mid-story ([`StorySettingsDialog.tsx`](application/src/components/StorySettingsDialog.tsx:31)).
- **Responsive UI:** Book-like, distraction-free interface with Material UI, supporting both desktop and mobile ([`App.tsx`](application/src/App.tsx:11), [`Dashboard.tsx`](application/src/Dashboard.tsx:25)).
- **Testing:** Comprehensive e2e and unit/integration tests (see [Testing Environment](#testing-environment)).

---

## Architecture

- **Frontend:**  
  - React + TypeScript, Vite, Material UI.
  - State and API logic encapsulated in custom hooks ([`useStories`](application/src/hooks/useStories.ts:25), [`useChapters`](application/src/hooks/useChapters.ts:8)).
- **Backend:**  
  - Supabase (PostgreSQL, Auth, Edge Functions).
  - Business logic in serverless functions ([`start_story`](application/supabase/functions/start_story/index.ts:1), [`continue_story`](application/supabase/functions/continue_story/index.ts:1), [`rate_chapter`](application/supabase/functions/rate_chapter/index.ts:1), etc.).
- **LLM Integration:**  
  - OpenAI API for story arc and chapter generation, with advanced prompt engineering.
- **Data Model:**  
  - Stories and chapters with rich metadata, user preferences, and strong type safety ([`story.ts`](application/src/types/story.ts:1), [`chapter.ts`](application/src/types/chapter.ts:1)).
- **Testing:**  
  - Playwright for e2e, Vitest/React Testing Library for unit/integration ([`playwright.config.ts`](application/playwright.config.ts:1), [`useChapters.test.ts`](application/src/hooks/__tests__/useChapters.test.ts:1), [`StoryList.test.tsx`](application/src/components/__tests__/StoryList.test.tsx:1)).

---

## Technical and Product Challenges

- **LLM Integration:** Prompt design, context management, error/cost handling.
- **Narrative Coherence:** Structured arc generation, metadata management, reading level adaptation.
- **Real-time UX:** Responsive feedback, loading/error states.
- **Data Consistency:** Schema/type safety, migration management, validation.
- **Serverless Architecture:** Edge function design, authentication, service integration.
- **Testing:** E2E coverage, unit/integration, test data management.

---

## Modes to Run

### Development

- `npm run dev` — Local dev server at http://localhost:5173
- `npm run dev:remote` — Uses remote Supabase instance

### Testing

- `npm run test` / `npm run test:unit` — Unit/integration tests (Vitest)
- `npm run test:e2e` / `npm run e2e` — End-to-end tests (Playwright)
- `npm run playwright:report` — View Playwright HTML reports

### Build & Deploy

- `npm run build` — Production build
- `npm run preview` — Local preview of production build
- `npm run deploy` — Deploy frontend to Netlify
- `npm run release:be` — Deploy all backend Edge Functions

### Code Quality

- `npm run lint` — ESLint
- `npm run typecheck` — TypeScript type checking

---

## Testing Environment

- **Production/Testing URL:**  
  [https://story-platform.netlify.app/](https://story-platform.netlify.app/)
- **Local Testing:**  
  - E2E tests run against the local dev server (`http://localhost:5173`), closely mirroring the deployed environment.
  - Playwright and Vitest scripts ensure robust coverage of user flows and component logic.

---

## References

- For deep dives into architecture, components, and design principles, see [`SYSTEM_DESIGN.md`](SYSTEM_DESIGN.md).
- For backend schema and migrations, see [`application/supabase/schema.sql`](application/supabase/schema.sql) and [`application/supabase/migrations/`](application/supabase/migrations/).
- For edge function logic, see [`application/supabase/functions/`](application/supabase/functions/).
- For frontend types and hooks, see [`application/src/types/`](application/src/types/) and [`application/src/hooks/`](application/src/hooks/).

---
