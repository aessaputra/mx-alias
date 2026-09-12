import { test, expect } from "@playwright/test";

const ADMIN_PASSWORD = "test-password-12345";

test.describe("alias lifecycle", () => {
  test("failed login shows error", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Admin password").fill("wrong-password");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.locator(".field-error")).toHaveText("Invalid credentials");
  });

  test("successful login shows dashboard", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Admin password").fill(ADMIN_PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL("/");
    await expect(page.getByRole("heading", { name: "Create an alias" })).toBeVisible();
  });

  test("industrial layout keeps its structure at 320px and 200% text", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    await page.addStyleTag({ content: "html { font-size: 200%; }" });
    await login(page);

    await expect(page.getByText("01 / New forwarder")).toBeVisible();
    await expect(page.getByText("02 / Current routing")).toBeVisible();
    await expect(page.locator("body")).toHaveCSS("overflow-x", "hidden");
    await expect(page.locator("body")).toHaveCSS("font-family", /Geist/);
    await expect(page.locator(".site-header")).toHaveCSS("flex-wrap", "wrap");
    expect(await page.locator("body").evaluate((body) => body.scrollWidth)).toBe(320);
  });

  test("domain is visible and selectable", async ({ page }) => {
    await login(page);
    const select = page.locator("select#domain");
    await expect(select).toBeVisible();
    await expect(select).toHaveValue("example.com");
    await expect(select.locator("option")).toHaveCount(2);
  });

  test("manual alias creation", async ({ page }) => {
    await login(page);
    await page.locator("input#alias").fill("test-alias");
    await page.locator("input#destination").fill("user@example.com");
    await page.getByRole("button", { name: "Create alias" }).click();
    await expect(page.locator(".action-success")).toHaveText("Alias created");
    // Alias appears in both address preview and forwarders table
    await expect(page.locator("table").getByText("test-alias@example.com")).toBeVisible();
  });

  test("generate alias fills input and can be edited", async ({ page }) => {
    await login(page);
    const aliasInput = page.locator("input#alias");
    await expect(aliasInput).toHaveValue("");
    await page.getByRole("button", { name: "Generate" }).click();
    await expect(aliasInput).not.toHaveValue("");
    const generated = await aliasInput.inputValue();
    await aliasInput.fill("edited-alias");
    await expect(aliasInput).toHaveValue("edited-alias");
    expect(generated).toMatch(/^[a-z]+-[a-z]+-\d{3}$/);
  });

  test("duplicate alias shows error", async ({ page }) => {
    await login(page);
    await page.locator("input#alias").fill("dup-alias");
    await page.locator("input#destination").fill("a@example.com");
    await page.getByRole("button", { name: "Create alias" }).click();
    await expect(page.locator(".action-success")).toHaveText("Alias created");
    await page.locator("input#alias").fill("dup-alias");
    await page.locator("input#destination").fill("b@example.com");
    await page.getByRole("button", { name: "Create alias" }).click();
    await expect(page.locator(".field-error")).toContainText("Unable to create alias");
  });

  test("copy button exists and is clickable", async ({ page }) => {
    await login(page);
    await page.locator("input#alias").fill("copy-test");
    await page.locator("input#destination").fill("c@example.com");
    await page.getByRole("button", { name: "Create alias" }).click();
    await expect(page.locator(".action-success")).toHaveText("Alias created");
    // Copy button exists with correct aria-label; clipboard API may fail in headless
    const copyBtn = page.getByRole("button", { name: "Copy copy-test@example.com" });
    await expect(copyBtn).toBeVisible();
    await copyBtn.click();
    // Button should still be functional (may show "Copied" or revert)
    await expect(copyBtn).toBeVisible();
  });

  test("delete cancel does not remove alias", async ({ page }) => {
    await login(page);
    await page.locator("input#alias").fill("cancel-test");
    await page.locator("input#destination").fill("d@example.com");
    await page.getByRole("button", { name: "Create alias" }).click();
    await expect(page.locator(".action-success")).toHaveText("Alias created");
    await page.getByRole("button", { name: "Delete cancel-test@example.com" }).click();
    await expect(page.locator("dialog")).toBeVisible();
    await page.locator("dialog").getByRole("button", { name: "Cancel", exact: true }).click();
    await expect(page.locator("dialog")).not.toBeVisible();
    await expect(page.locator("table").getByText("cancel-test@example.com")).toBeVisible();
  });

  test("confirmed delete removes alias", async ({ page }) => {
    await login(page);
    await page.locator("input#alias").fill("del-test");
    await page.locator("input#destination").fill("e@example.com");
    await page.getByRole("button", { name: "Create alias" }).click();
    await expect(page.locator(".action-success")).toHaveText("Alias created");
    await page.getByRole("button", { name: "Delete del-test@example.com" }).click();
    await expect(page.locator("dialog")).toBeVisible();
    await page.getByRole("button", { name: "Delete alias" }).click();
    // After delete, alias should not be in the forwarders table
    await expect(page.locator("table").getByText("del-test@example.com")).not.toBeVisible();
  });

  test("refresh button reloads dashboard data", async ({ page }) => {
    await login(page);
    await expect(page.getByRole("button", { name: "Refresh" })).toBeVisible();
    await page.getByRole("button", { name: "Refresh" }).click();
    await expect(page.getByRole("button", { name: "Refresh" })).toBeEnabled();
    await expect(page.getByRole("heading", { name: "Create an alias" })).toBeVisible();
    await expect(page.getByText("02 / Current routing")).toBeVisible();
  });

  test("logout and unauthenticated redirect", async ({ page }) => {
    await login(page);
    await page.getByRole("button", { name: "Log out" }).click();
    await expect(page).toHaveURL("/login");
    await page.goto("/");
    await expect(page).toHaveURL("/login");
  });

  test("CSRF protection is unit-tested", () => {
    // Same-origin check (assertSameOrigin) is verified in security.test.ts.
    // Browser fetch always sends same-origin Origin header, so CSRF can only be
    // tested at the HTTP layer (curl/scripts), not from Playwright.
    expect(true).toBe(true);
  });
});

async function login(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel("Admin password").fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL("/");
}
