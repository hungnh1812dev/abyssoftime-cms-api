import { expect, test } from "@playwright/test";
import { unlockAndGoto } from "./test-helpers";

test.describe("EN Vocab — learned/total badge", () => {
  test("header shows learned/total count for the active pack and updates live", async ({ page }) => {
    await unlockAndGoto(page, "/en/learning/english?group=1&pack=1");

    await expect(page.getByText("0/10 learned")).toBeVisible();

    await page.locator('input[type="checkbox"]').first().check();

    await expect(page.getByText("1/10 learned")).toBeVisible();
  });
});
