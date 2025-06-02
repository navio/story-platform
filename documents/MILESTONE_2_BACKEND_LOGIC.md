# Milestone 2: Backend Logic – Story Arc Generation & Chapter Continuation

## Objective
Refactor backend logic to:
- Generate and store a full story arc/outline at story creation.
- Use the arc to guide chapter continuations.
- Store per-chapter structural metadata.
- Support chapter rating updates.

## Implementation Steps

### 1. Story Creation (`start_story` function)
- Update logic to generate a full story arc/outline (e.g., hero’s journey) using the initial user input as metadata.
- Store the generated arc in the new `story_arc` field in the stories table.
- Return the arc in the API response for UI display and for use in continuations.
- Generate the first chapter as a continuation, guided by the arc (not by treating the user input as story content).

### 2. Chapter Continuation (`continue_story` function)
- Retrieve the story arc and structural_prompt for the story.
- Pass the arc and current arc step as context to the LLM for each continuation.
- Store the arc step/guidance in the chapter’s `structural_metadata` field.

### 3. Chapter Rating
- Add or extend API endpoints to allow users to rate chapters (update the `rating` field in chapters).

## Details of the Change

- The backend will use the initial user input as metadata to generate a structured story arc, not as the first chapter.
- Each chapter will be associated with a specific step or guidance from the arc, stored in `structural_metadata`.
- The API will support updating and retrieving chapter ratings.

## Acceptance Criteria

- Story creation generates and stores a full arc/outline in the `story_arc` field.
- Chapter continuations use the arc for guidance and store per-chapter metadata.
- API supports chapter rating updates.
- All changes are covered by unit and integration tests.