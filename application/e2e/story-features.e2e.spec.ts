// E2E tests for chapter addition and story settings editing using Playwright

import { test, expect } from '@playwright/test';

test.describe('Story Features Flows', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173/');
    // Assume user is already signed in and a story exists, or add sign-in and story creation steps if needed
    await page.getByText('E2E Test Story').click();
  });

  test('User can add a chapter to a story', async ({ page }) => {
    await page.getByRole('button', { name: /add chapter|new chapter/i }).click();
    await page.getByLabel(/chapter title/i).fill('E2E Chapter 1');
    await page.getByRole('button', { name: /create|save/i }).click();
    await expect(page.getByText('E2E Chapter 1')).toBeVisible();
  });

  test('User can edit story settings', async ({ page }) => {
    await page.getByRole('button', { name: /settings|edit story/i }).click();
    await page.getByLabel(/title/i).fill('E2E Test Story Updated');
    await page.getByRole('button', { name: /save|update/i }).click();
    await expect(page.getByText('E2E Test Story Updated')).toBeVisible();
  });
test('Story arc/outline and chapter guidance/rating UI are visible and functional', async ({ page }) => {
    // Go to the story view (assume story is already selected in beforeEach)
    // 1. Story arc/outline should be visible
    await expect(page.getByText(/story arc|outline/i)).toBeVisible();
    // 2. At least one arc step should be visible
    await expect(page.locator('ol').locator('li')).toHaveCount(1);

    // 3. Each chapter should display its arc step/guidance
    const arcStep = await page.locator('text=Arc Step:').first();
    await expect(arcStep).toBeVisible();

    // 4. Rating UI should be present for each chapter
    const ratingStars = page.locator('[aria-label^="chapter-rating-"]');
    await expect(ratingStars.first()).toBeVisible();

    // 5. User can rate a chapter and see the rating update
    // Click the 4th star (simulate a 4-star rating)
    await ratingStars.first().locator('svg').nth(3).click();
    // The rating text should update to 4 or 4.0
    await expect(page.locator('text=4')).toBeVisible();
  });
});