import { test, expect } from '@playwright/test';

test.describe('Employee Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login');
    await page.fill('input[name="email"]', 'admin@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');
  });

  test('should display employee list', async ({ page }) => {
    await page.goto('/employees');
    await expect(page.locator('h1')).toContainText('Employees');
    await expect(page.locator('[data-testid="employee-list"]')).toBeVisible();
  });

  test('should open add employee form', async ({ page }) => {
    await page.goto('/employees');
    await page.click('button:has-text("Add Employee")');
    await expect(page.locator('[data-testid="employee-form"]')).toBeVisible();
  });
});