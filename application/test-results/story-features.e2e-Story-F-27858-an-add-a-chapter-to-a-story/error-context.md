# Test info

- Name: Story Features Flows >> User can add a chapter to a story
- Location: /Users/alnavarro/Development/story-platform/application/e2e/story-features.e2e.spec.ts:12:3

# Error details

```
Error: locator.click: Test ended.
Call log:
  - waiting for getByText('E2E Test Story')

    at /Users/alnavarro/Development/story-platform/application/e2e/story-features.e2e.spec.ts:9:44
```

# Test source

```ts
   1 | // E2E tests for chapter addition and story settings editing using Playwright
   2 |
   3 | import { test, expect } from '@playwright/test';
   4 |
   5 | test.describe('Story Features Flows', () => {
   6 |   test.beforeEach(async ({ page }) => {
   7 |     await page.goto('http://localhost:5173/');
   8 |     // Assume user is already signed in and a story exists, or add sign-in and story creation steps if needed
>  9 |     await page.getByText('E2E Test Story').click();
     |                                            ^ Error: locator.click: Test ended.
  10 |   });
  11 |
  12 |   test('User can add a chapter to a story', async ({ page }) => {
  13 |     await page.getByRole('button', { name: /add chapter|new chapter/i }).click();
  14 |     await page.getByLabel(/chapter title/i).fill('E2E Chapter 1');
  15 |     await page.getByRole('button', { name: /create|save/i }).click();
  16 |     await expect(page.getByText('E2E Chapter 1')).toBeVisible();
  17 |   });
  18 |
  19 |   test('User can edit story settings', async ({ page }) => {
  20 |     await page.getByRole('button', { name: /settings|edit story/i }).click();
  21 |     await page.getByLabel(/title/i).fill('E2E Test Story Updated');
  22 |     await page.getByRole('button', { name: /save|update/i }).click();
  23 |     await expect(page.getByText('E2E Test Story Updated')).toBeVisible();
  24 |   });
  25 | test('Story arc/outline and chapter guidance/rating UI are visible and functional', async ({ page }) => {
  26 |     // Go to the story view (assume story is already selected in beforeEach)
  27 |     // 1. Story arc/outline should be visible
  28 |     await expect(page.getByText(/story arc|outline/i)).toBeVisible();
  29 |     // 2. At least one arc step should be visible
  30 |     await expect(page.locator('ol').locator('li')).toHaveCount(1);
  31 |
  32 |     // 3. Each chapter should display its arc step/guidance
  33 |     const arcStep = await page.locator('text=Arc Step:').first();
  34 |     await expect(arcStep).toBeVisible();
  35 |
  36 |     // 4. Rating UI should be present for each chapter
  37 |     const ratingStars = page.locator('[aria-label^="chapter-rating-"]');
  38 |     await expect(ratingStars.first()).toBeVisible();
  39 |
  40 |     // 5. User can rate a chapter and see the rating update
  41 |     // Click the 4th star (simulate a 4-star rating)
  42 |     await ratingStars.first().locator('svg').nth(3).click();
  43 |     // The rating text should update to 4 or 4.0
  44 |     await expect(page.locator('text=4')).toBeVisible();
  45 |   });
  46 | });
```