import { Page, expect } from '@playwright/test';

export async function assertSuccessMessage(page: Page, message?: string) {
  const successLocator = page.locator('[role="status"]').or(page.locator('.success-message'));
  await expect(successLocator).toBeVisible({ timeout: 5000 });

  if (message) {
    await expect(successLocator).toContainText(message);
  }
}

export async function assertErrorMessage(page: Page, message?: string) {
  const errorLocator = page.locator('[role="alert"]').or(page.locator('.error-message'));
  await expect(errorLocator).toBeVisible({ timeout: 5000 });

  if (message) {
    await expect(errorLocator).toContainText(message);
  }
}

export async function assertURLContains(page: Page, urlPart: string) {
  await expect(page).toHaveURL(new RegExp(urlPart));
}

export async function assertElementVisible(page: Page, selector: string) {
  await expect(page.locator(selector)).toBeVisible();
}

export async function assertElementNotVisible(page: Page, selector: string) {
  await expect(page.locator(selector)).not.toBeVisible();
}

export async function assertTextPresent(page: Page, text: string) {
  await expect(page.getByText(text)).toBeVisible();
}

export async function assertTextNotPresent(page: Page, text: string) {
  await expect(page.getByText(text)).not.toBeVisible();
}

export async function assertButtonEnabled(page: Page, buttonName: string) {
  const button = page.getByRole('button', { name: new RegExp(buttonName, 'i') });
  await expect(button).toBeEnabled();
}

export async function assertButtonDisabled(page: Page, buttonName: string) {
  const button = page.getByRole('button', { name: new RegExp(buttonName, 'i') });
  await expect(button).toBeDisabled();
}

export async function assertInputValue(page: Page, label: string, expectedValue: string) {
  const input = page.getByLabel(new RegExp(label, 'i'));
  await expect(input).toHaveValue(expectedValue);
}

export async function assertMetricValue(page: Page, metricName: string, expectedValue: string) {
  const metric = page.locator(`text=${metricName}`).locator('..');
  await expect(metric).toContainText(expectedValue);
}
