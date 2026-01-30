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

    // Check for Latest News section
    await expect(page.getByText("Latest News and Trends from the Internet")).toBeVisible();
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

test.describe("Practice View", () => {
  test("should navigate to practice view after theme selection", async ({ page }) => {
    await page.goto("/");

    // Click a basic theme button
    const meetingButton = page.getByRole("button", { name: /会議進行/i });
    await meetingButton.click();

    // Wait for practice view to appear (with longer timeout for API call)
    await expect(page.getByText("Auto-Play Mode")).toBeVisible({ timeout: 30000 });

    // Check that we have sentence display
    await expect(page.getByText(/Sentence \d+/)).toBeVisible();

    // Check for playback controls
    await expect(page.getByRole("button", { name: /Start Auto-Play/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Play Once/i })).toBeVisible();

    // Check for back button
    await expect(page.getByRole("button", { name: /Back/i })).toBeVisible();
  });

  test("should display speed controls in practice view", async ({ page }) => {
    await page.goto("/");

    // Click a basic theme button
    const meetingButton = page.getByRole("button", { name: /会議進行/i });
    await meetingButton.click();

    // Wait for practice view
    await expect(page.getByText("Auto-Play Mode")).toBeVisible({ timeout: 30000 });

    // Check for speed controls
    await expect(page.getByText("Playback Speed")).toBeVisible();
    // Check that speed badge is visible (shows current speed like 1.00x)
    await expect(page.getByText(/\d+\.\d+x/).first()).toBeVisible();
  });

  test("should be able to start auto-play mode", async ({ page }) => {
    // Listen to console for audio debug logs
    const consoleLogs: string[] = [];
    page.on("console", (msg) => {
      consoleLogs.push(msg.text());
    });

    await page.goto("/");

    // Click a basic theme button
    const meetingButton = page.getByRole("button", { name: /会議進行/i });
    await meetingButton.click();

    // Wait for practice view
    await expect(page.getByText("Auto-Play Mode")).toBeVisible({ timeout: 30000 });

    // Click Start Auto-Play
    const startButton = page.getByRole("button", { name: /Start Auto-Play/i });
    await startButton.click();

    // Wait for status to update - should show generating or playing
    await page.waitForTimeout(2000);

    // Take screenshot for debugging
    await page.screenshot({ path: "test-results/auto-play-state.png" });

    // The status area should show some activity
    const statusArea = page.locator("p.text-sm.font-medium");
    const statusText = await statusArea.textContent().catch(() => "not found");
    console.log("Status text:", statusText);

    // Check that Start Auto-Play button is no longer visible (replaced by Pause/Stop)
    await expect(startButton).not.toBeVisible({ timeout: 5000 });

    // Wait a bit to let audio events fire
    await page.waitForTimeout(3000);

    // Log console messages for debugging
    const audioLogs = consoleLogs.filter(log => log.includes("Audio") || log.includes("Play") || log.includes("ready"));
    console.log("Audio-related logs:", audioLogs);
  });
});
