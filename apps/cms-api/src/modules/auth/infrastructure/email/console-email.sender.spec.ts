import { Logger } from "@nestjs/common";

import { ConsoleEmailSender } from "./console-email.sender";

describe("ConsoleEmailSender", () => {
  let sender: ConsoleEmailSender;
  let logSpy: jest.SpyInstance;

  beforeEach(() => {
    sender = new ConsoleEmailSender();
    logSpy = jest.spyOn(Logger.prototype, "log").mockImplementation(() => undefined);
  });

  afterEach(() => {
    logSpy.mockRestore();
  });

  it("sendOtpEmail() logs the recipient and OTP", async () => {
    await sender.sendOtpEmail({ email: "user@example.com", otp: "123456" });

    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("user@example.com"));
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("123456"));
  });

  it("sendPasswordResetEmail() logs the recipient and reset token", async () => {
    await sender.sendPasswordResetEmail({ email: "user@example.com", resetToken: "raw-reset-token" });

    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("user@example.com"));
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("raw-reset-token"));
  });
});
