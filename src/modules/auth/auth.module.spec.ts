import { MODULE_METADATA } from "@nestjs/common/constants";

import { RoleModule } from "@/modules/roles/role.module";
import { UserModule } from "@/modules/users/user.module";

import { ForgotPasswordService } from "./application/services/forgot-password.service";
import { HasUsersService } from "./application/services/has-users.service";
import { LoginService } from "./application/services/login.service";
import { RefreshTokenService } from "./application/services/refresh-token.service";
import { RegisterService } from "./application/services/register.service";
import { ResendOtpService } from "./application/services/resend-otp.service";
import { ResetPasswordService } from "./application/services/reset-password.service";
import { VerifyOtpService } from "./application/services/verify-otp.service";
import { AuthModule } from "./auth.module";
import { EMAIL_SENDER } from "./domain/ports/email-sender.port";
import { ConsoleEmailSender } from "./infrastructure/email/console-email.sender";
import { AuthController } from "./presentation/auth.controller";

describe("AuthModule", () => {
  it("imports UserModule and RoleModule", () => {
    expect(Reflect.getMetadata(MODULE_METADATA.IMPORTS, AuthModule)).toEqual([UserModule, RoleModule]);
  });

  it("registers the AuthController", () => {
    expect(Reflect.getMetadata(MODULE_METADATA.CONTROLLERS, AuthModule)).toEqual([AuthController]);
  });

  it("registers the auth services and binds EMAIL_SENDER to ConsoleEmailSender", () => {
    const providers = Reflect.getMetadata(MODULE_METADATA.PROVIDERS, AuthModule) as unknown[];

    expect(providers).toEqual([
      RegisterService,
      VerifyOtpService,
      ResendOtpService,
      HasUsersService,
      LoginService,
      RefreshTokenService,
      ForgotPasswordService,
      ResetPasswordService,
      { provide: EMAIL_SENDER, useClass: ConsoleEmailSender },
    ]);
  });

  it("declares no exports", () => {
    expect(Reflect.getMetadata(MODULE_METADATA.EXPORTS, AuthModule)).toBeUndefined();
  });
});
