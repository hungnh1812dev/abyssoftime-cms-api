import { buildResetPasswordEmailHtml } from "./reset-password-email.template";

describe("buildResetPasswordEmailHtml", () => {
  it("includes the given reset URL in the output", () => {
    const html = buildResetPasswordEmailHtml({ resetUrl: "https://abyssoftime.com/reset-password?token=abc123" });

    expect(html).toContain("https://abyssoftime.com/reset-password?token=abc123");
  });

  it("mentions the real 1-hour expiry window", () => {
    const html = buildResetPasswordEmailHtml({ resetUrl: "https://abyssoftime.com/reset-password?token=abc123" });

    expect(html).toMatch(/1 hour/i);
  });
});
