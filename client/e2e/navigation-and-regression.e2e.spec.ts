// E2E tests for navigation and regression checks using Playwright

import { test, expect } from '@playwright/test';

test.describe('Navigation and Regression Flows', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173/');
    // Assume user is already signed in and a story exists, or add sign-in and story creation steps if needed
    await page.getByText('E2E Test Story').click();
  });

  test('User can navigate between main UI areas', async ({ page }) => {
    // Example: Navigate to Dashboard
    await page.getByRole('button', { name: /dashboard|home/i }).click();
    await expect(page.getByRole('heading', { name: /dashboard|stories/i })).toBeVisible();

    // Example: Navigate to Stories/Library
    await page.getByRole('button', { name: /stories|library/i }).click();
    await expect(page.getByRole('heading', { name: /stories|library/i })).toBeVisible();

    // Example: Navigate to Settings
    await page.getByRole('button', { name: /settings/i }).click();
    await expect(page.getByText(/settings/i)).toBeVisible();
  });

  test('Dialogs open and close correctly, error handling works', async ({ page }) => {
    // Open and close "New Story" dialog
    await page.getByRole('button', { name: /new story|add story/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByRole('button', { name: /cancel|close/i }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible();

    // Trigger an error (e.g., create story with empty title)
    await page.getByRole('button', { name: /new story|add story/i }).click();
    await page.getByRole('button', { name: /create|save/i }).click();
    await expect(page.getByText(/error|required|invalid/i)).toBeVisible();
  });
});