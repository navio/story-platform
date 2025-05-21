// E2E tests for user sign in and sign out using Playwright

import { test, expect } from '@playwright/test';

test.describe('Authentication Flows', () => {
  test('User can sign in and sign out', async ({ page }) => {
    // Adjust the URL as needed for your dev environment
    await page.goto('http://localhost:5173/');

    // Click "Sign In" button (adjust selector as needed)
    await page.getByRole('button', { name: /sign in/i }).click();

    // Fill in credentials (replace with test credentials)
    await page.getByLabel(/email/i).fill('testuser@example.com');
    await page.getByLabel(/password/i).fill('testpassword');
    await page.getByRole('button', { name: /log in|sign in/i }).click();

    // Wait for dashboard or main UI to appear
    await expect(page.getByText(/dashboard|stories|my stories/i)).toBeVisible();

    // Sign out
    await page.getByRole('button', { name: /account|profile|menu/i }).click();
    await page.getByRole('menuitem', { name: /sign out|log out/i }).click();

    // Verify sign out (login screen visible)
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
  });
});