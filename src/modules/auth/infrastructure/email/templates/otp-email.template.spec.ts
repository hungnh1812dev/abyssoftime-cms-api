import { buildOtpEmailHtml } from "./otp-email.template";

describe("buildOtpEmailHtml", () => {
  it("includes the given OTP in the output", () => {
    const html = buildOtpEmailHtml({ otp: "123456" });

    expect(html).toContain("123456");
  });

  it("mentions the real 10-minute expiry window", () => {
    const html = buildOtpEmailHtml({ otp: "123456" });

    expect(html).toMatch(/10 minutes/i);
  });
});
