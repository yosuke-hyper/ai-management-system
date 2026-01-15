import { Page } from '@playwright/test';

export async function navigateToDashboard(page: Page, view: 'daily' | 'weekly' | 'monthly' = 'daily') {
  await page.goto(`/dashboard/${view}`);
  await page.waitForLoadState('networkidle');
}

export async function navigateToReports(page: Page) {
  await page.goto('/reports');
  await page.waitForLoadState('networkidle');
}

export async function navigateToNewReport(page: Page) {
  await page.goto('/reports/new');
  await page.waitForLoadState('networkidle');
}

export async function navigateToAdminSettings(page: Page) {
  await page.goto('/admin/settings');
  await page.waitForLoadState('networkidle');
}

export async function navigateToOrganizationSettings(page: Page) {
  await page.goto('/organization/settings');
  await page.waitForLoadState('networkidle');
}

export async function navigateToAIChat(page: Page) {
  await page.goto('/ai/chat');
  await page.waitForLoadState('networkidle');
}

export async function navigateToAIReports(page: Page) {
  await page.goto('/ai/reports');
  await page.waitForLoadState('networkidle');
}

export async function waitForPageLoad(page: Page) {
  await page.waitForLoadState('networkidle');
  await page.waitForLoadState('domcontentloaded');
}

export async function refreshPage(page: Page) {
  await page.reload();
  await waitForPageLoad(page);
}
