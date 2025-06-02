# Milestone 4: LLM Prompt Engineering & Arc Integration

## Objective
Update LLM prompt engineering and backend/frontend integration to:
- Generate a full story arc/outline at story creation.
- Use the arc and per-chapter arc step as context for every chapter continuation.
- Ensure the initial user input is treated as metadata/guidance, not as story content.

## Implementation Steps

### 1. Story Arc Generation
- Design a prompt for the LLM to generate a structured story arc/outline (e.g., hero’s journey) from the user's initial input.
- Store the generated arc in the `story_arc` field in the stories table.

### 2. Chapter Generation & Continuation
- For each chapter, design prompts that:
  - Include the full arc and current arc step as context.
  - Reference previous chapters and the overall arc.
  - Guide the LLM to follow the arc, not just continue the last chapter.
- Store the arc step/guidance in the chapter’s `structural_metadata` field.

### 3. Backend/Frontend Integration
- Ensure API responses include the arc and per-chapter metadata for frontend display.
- Update frontend logic to display arc and chapter metadata as needed.

## Details of the Change

- The LLM will be prompted to generate a story arc at the start, and each chapter will be generated with explicit reference to the arc and its current step.
- The initial user input will be used as the "north star" for the arc, not as the first line of the story.
- The backend and frontend will be updated to support this flow.

## Acceptance Criteria

- LLM prompts for story and chapter generation use the arc and arc step as context.
- The initial user input is not used as story content.
- API and frontend display the arc and per-chapter metadata.
- All changes are covered by integration and prompt tests.