// E2E tests for story creation, selection, and deletion using Playwright

import { test, expect } from '@playwright/test';

test.describe('Story CRUD Flows', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173/');
    // Assume user is already signed in for these flows, or add sign-in steps if needed
  });

  test('User can create a new story', async ({ page }) => {
    await page.getByRole('button', { name: /new story|add story/i }).click();
    await page.getByLabel(/title/i).fill('E2E Test Story');
    await page.getByRole('button', { name: /create|save/i }).click();
    // Validate that the user is navigated to the new story's view
    await expect(page.getByRole('heading', { name: /e2e test story/i })).toBeVisible();
    // Optionally, also check the story title is visible (redundant, but keeps original intent)
    await expect(page.getByText('E2E Test Story')).toBeVisible();
  });

  test('User can select a story', async ({ page }) => {
    await page.getByText('E2E Test Story').click();
    await expect(page.getByRole('heading', { name: /e2e test story/i })).toBeVisible();
  });

  test('User can delete a story', async ({ page }) => {
    await page.getByText('E2E Test Story').click();
    await page.getByRole('button', { name: /delete story|remove story/i }).click();
    await page.getByRole('button', { name: /confirm|delete/i }).click();
    await expect(page.getByText('E2E Test Story')).not.toBeVisible();
  });
});