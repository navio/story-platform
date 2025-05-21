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
});