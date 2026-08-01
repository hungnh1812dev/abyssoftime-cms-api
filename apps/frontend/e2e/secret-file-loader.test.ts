import { test, expect } from "@playwright/test";

test("Load Content button: disabled by default, enabled when filePassword has value", async ({ page }) => {
  await page.goto("http://localhost:4000/en/secret");

  const loadBtn = page.getByRole("button", { name: "Load Content" });

  // Initially disabled
  await expect(loadBtn).toBeDisabled();

  // Type into File Password field
  const filePasswordInput = page.locator('input[id="text-input-filePassword"]');
  await filePasswordInput.fill("mypassword");

  // Should now be enabled
  await expect(loadBtn).toBeEnabled();

  // Clear the password
  await filePasswordInput.fill("");

  // Should be disabled again
  await expect(loadBtn).toBeDisabled();
});
