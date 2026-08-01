import { Page } from "@playwright/test";

// Pages linked from the homepage (e.g. /learning/english) sit behind the passcode gate (rules/auth.md).
export async function unlockAndGoto(page: Page, targetPath: string) {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`/en/auth?returnTo=${encodeURIComponent(targetPath)}`);
  await page.locator("input[type='password'], input[type='text'], input").first().fill("123456");
  await page.getByRole("button", { name: "Unlock" }).click();
  await page.waitForURL(new RegExp(targetPath.split("?")[0].replace(/\//g, "\\/")));
  await page.waitForLoadState("networkidle");
}
