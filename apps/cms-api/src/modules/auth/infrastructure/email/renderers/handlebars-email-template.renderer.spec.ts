import { HandlebarsEmailTemplateRenderer } from "./handlebars-email-template.renderer";

describe("HandlebarsEmailTemplateRenderer", () => {
  const renderer = new HandlebarsEmailTemplateRenderer();

  it("renders the OTP email with the code interpolated", () => {
    const html = renderer.renderOtpEmail({ otp: "654321" });

    expect(html).toContain("654321");
    expect(html).toMatch(/verify your email/i);
  });

  it("renders the password-reset email with the reset URL interpolated", () => {
    const html = renderer.renderPasswordResetEmail({ resetUrl: "https://abyssoftime.com/reset-password" });

    expect(html).toContain("https://abyssoftime.com/reset-password");
    expect(html).toMatch(/reset your password/i);
  });

  it("HTML-escapes interpolated values", () => {
    const html = renderer.renderPasswordResetEmail({ resetUrl: "https://abyssoftime.com?a=1&b=2" });

    expect(html).toContain("https://abyssoftime.com?a&#x3D;1&amp;b&#x3D;2");
  });
});
