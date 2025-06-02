# Milestone 3: Frontend/UI – Story Arc, Chapter Metadata, and Ratings

## Objective
Update the frontend to:
- Treat user input as story guidance/metadata, not as the first line of the story.
- Display the generated story arc/outline.
- Show per-chapter arc step/guidance.
- Allow users to rate chapters and display ratings.

## Implementation Steps

### 1. New Story Dialog
- Update UI to clarify that user input is for story guidance/metadata.
- After story creation, display the generated story arc/outline to the user.

### 2. Story View
- Display the story arc/outline at the top or in a sidebar.
- For each chapter, display its arc step/guidance (from `structural_metadata`).
- Add UI controls for rating chapters (e.g., thumbs up/down, star rating).

### 3. Chapter List/Navigation
- Show chapter ratings.
- Optionally, allow filtering or sorting chapters by rating.

### 4. API Integration & Types
- Update API calls and TypeScript types to handle new fields (`story_arc`, `structural_metadata`, `rating`).

## Details of the Change

- The UI will make it clear that the initial prompt is not the first line of the story, but the "north star" guiding the arc.
- The story arc/outline will be visible to users, providing context for the story’s direction.
- Each chapter will show its place in the arc and allow user feedback via ratings.

## Acceptance Criteria

- New story dialog and story view reflect the new flow and display the arc.
- Chapters display arc step/guidance and rating controls.
- User ratings are stored and displayed.
- All changes are covered by UI and integration tests.