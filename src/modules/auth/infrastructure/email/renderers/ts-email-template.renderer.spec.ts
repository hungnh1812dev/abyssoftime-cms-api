import { TsEmailTemplateRenderer } from "./ts-email-template.renderer";

describe("TsEmailTemplateRenderer", () => {
  const renderer = new TsEmailTemplateRenderer();

  it("renders the OTP email with the code interpolated", () => {
    const html = renderer.renderOtpEmail({ otp: "654321" });

    expect(html).toContain("654321");
    expect(html).toMatch(/verify your email/i);
  });

  it("renders the password-reset email with the reset URL interpolated", () => {
    const html = renderer.renderPasswordResetEmail({ resetUrl: "https://abyssoftime.com/reset-password?token=abc" });

    expect(html).toContain("https://abyssoftime.com/reset-password?token=abc");
    expect(html).toMatch(/reset your password/i);
  });
});
