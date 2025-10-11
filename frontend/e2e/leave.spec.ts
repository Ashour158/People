import { test, expect } from '@playwright/test';

test.describe('Leave Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login');
    await page.fill('input[name="email"]', 'admin@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');
  });

  test('should display leave application form', async ({ page }) => {
    await page.goto('/leave');
    await expect(page.locator('h1')).toContainText('Leave Application');
    await expect(page.locator('[data-testid="leave-form"]')).toBeVisible();
  });

  test('should submit leave request', async ({ page }) => {
    await page.goto('/leave');
    await page.fill('input[name="startDate"]', '2024-01-01');
    await page.fill('input[name="endDate"]', '2024-01-05');
    await page.selectOption('select[name="leaveType"]', 'vacation');
    await page.fill('textarea[name="reason"]', 'Family vacation');
    await page.click('button[type="submit"]');
    
    await expect(page.locator('.MuiAlert-message')).toContainText('Leave request submitted');
  });
});