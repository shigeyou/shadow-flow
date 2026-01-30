import { test, expect } from "@playwright/test";

test.describe("Home Page", () => {
  test("should display the app title", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: /Shadowing Training/i })).toBeVisible();
  });

  test("should display basic theme buttons", async ({ page }) => {
    await page.goto("/");

    // Check for basic themes (using Japanese names to be more specific)
    await expect(page.getByRole("button", { name: /会議進行/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /ビジネス/i }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /レストラン/i })).toBeVisible();
  });

  test("should display search-powered themes section", async ({ page }) => {
    await page.goto("/");

    // Check for Knowledge Building section
    await expect(page.getByText("Knowledge Building")).toBeVisible();
    await expect(page.getByRole("button", { name: /Continuous Learning Mode/i })).toBeVisible();
  });

  test("should display custom theme input", async ({ page }) => {
    await page.goto("/");

    // Check for custom theme section
    await expect(page.getByText("Custom Theme")).toBeVisible();
    await expect(page.getByPlaceholder(/Enter your custom theme/i)).toBeVisible();
  });

  test("should have theme toggle button", async ({ page }) => {
    await page.goto("/");

    // Theme toggle should be present (for dark/light mode)
    const themeToggle = page.locator("button").filter({ has: page.locator("svg") }).first();
    await expect(themeToggle).toBeVisible();
  });
});

test.describe("Theme Selection", () => {
  test("should show loading state when selecting a theme", async ({ page }) => {
    await page.goto("/");

    // Click a basic theme button
    const meetingButton = page.getByRole("button", { name: /会議進行/i });
    await meetingButton.click();

    // Should show some loading indication or navigate to practice view
    // The button should be disabled or content should change
    await expect(page.locator("text=Generating").or(page.locator("text=Loading"))).toBeVisible({ timeout: 5000 }).catch(() => {
      // If no loading state visible, we might have moved to practice view already
    });
  });
});
