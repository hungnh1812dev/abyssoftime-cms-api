import { MailerService } from "@nestjs-modules/mailer";

import { MODULE_METADATA } from "@nestjs/common/constants";
import { ConfigService } from "@nestjs/config";
import { PassportModule } from "@nestjs/passport";

import { JwtStrategy } from "@/common/strategies/jwt.strategy";
import { LocalStrategy } from "@/common/strategies/local.strategy";
import { RoleModule } from "@/modules/roles/role.module";
import { UserModule } from "@/modules/users/user.module";

import { ForgotPasswordService } from "./application/services/forgot-password.service";
import { GetMeService } from "./application/services/get-me.service";
import { HasUsersService } from "./application/services/has-users.service";
import { LoginService } from "./application/services/login.service";
import { RefreshTokenService } from "./application/services/refresh-token.service";
import { RegisterService } from "./application/services/register.service";
import { ResendOtpService } from "./application/services/resend-otp.service";
import { ResetPasswordService } from "./application/services/reset-password.service";
import { VerifyOtpService } from "./application/services/verify-otp.service";
import { AuthModule } from "./auth.module";
import { EMAIL_SENDER } from "./domain/ports/email-sender.port";
import { EMAIL_TEMPLATE_RENDERER } from "./infrastructure/email/renderers/email-template-renderer";
import { HandlebarsEmailTemplateRenderer } from "./infrastructure/email/renderers/handlebars-email-template.renderer";
import { resolveEmailSender } from "./infrastructure/email/resolve-email-sender";
import { AuthController } from "./presentation/auth.controller";

describe("AuthModule", () => {
  it("imports UserModule, RoleModule, a MailerModule registration, and a PassportModule registration", () => {
    const imports = Reflect.getMetadata(MODULE_METADATA.IMPORTS, AuthModule) as unknown[];

    expect(imports).toHaveLength(4);
    expect(imports[0]).toBe(UserModule);
    expect(imports[1]).toBe(RoleModule);

    const mailerModuleImport = imports[2] as { module: unknown };
    expect(typeof mailerModuleImport.module).toBe("function");

    const passportModuleImport = imports[3] as { module: unknown };
    expect(passportModuleImport.module).toBe(PassportModule);
  });

  it("registers the AuthController", () => {
    expect(Reflect.getMetadata(MODULE_METADATA.CONTROLLERS, AuthModule)).toEqual([AuthController]);
  });

  it("registers the auth services and binds EMAIL_SENDER via resolveEmailSender", () => {
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
      GetMeService,
      JwtStrategy,
      LocalStrategy,
      { provide: EMAIL_TEMPLATE_RENDERER, useClass: HandlebarsEmailTemplateRenderer },
      {
        provide: EMAIL_SENDER,
        useFactory: resolveEmailSender,
        inject: [ConfigService, MailerService, EMAIL_TEMPLATE_RENDERER],
      },
    ]);
  });

  it("declares no exports", () => {
    expect(Reflect.getMetadata(MODULE_METADATA.EXPORTS, AuthModule)).toBeUndefined();
  });
});
