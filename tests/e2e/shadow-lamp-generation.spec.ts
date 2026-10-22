import { expect, test } from '@playwright/test';

test.describe('Shadow Lamp Generator', () => {
  test('should load the page and display core UI elements', async ({ page }) => {
    await page.goto('./');

    // Page loads with correct content
    await expect(page.locator('text=Shadecaster')).toBeVisible();
    await expect(page.locator('text=Shadow lamp STL generator')).toBeVisible();

    // Core form elements exist; the download button stays hidden until an STL is ready
    await expect(page.locator('#image-upload')).toBeAttached();
    await expect(page.locator('#download-btn')).toBeAttached();
    await expect(page.locator('#download-btn')).toBeHidden();

    // Control inputs exist with correct defaults
    await expect(page.locator('#dome-diameter')).toHaveValue('60');
    await expect(page.locator('#dome-height')).toHaveValue('20');
    await expect(page.locator('#angular-resolution')).toHaveValue('18');
    await expect(page.locator('#threshold')).toHaveValue('128');
  });

  test('should update control value displays', async ({ page }) => {
    await page.goto('./');

    // Angular resolution display updates
    const angularResolution = page.locator('#angular-resolution');
    await angularResolution.evaluate((el) => {
      (el as HTMLInputElement).value = '24';
      el.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await expect(page.locator('#angular-value')).toContainText('24 angles');

    // Threshold display updates
    const threshold = page.locator('#threshold');
    await threshold.evaluate((el) => {
      (el as HTMLInputElement).value = '200';
      el.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await expect(page.locator('#threshold-value')).toContainText('200');
  });
});
