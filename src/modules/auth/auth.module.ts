import { Module } from "@nestjs/common";

import { RoleModule } from "@/modules/roles/role.module";
import { UserModule } from "@/modules/users/user.module";

import { HasUsersService } from "./application/services/has-users.service";
import { LoginService } from "./application/services/login.service";
import { RefreshTokenService } from "./application/services/refresh-token.service";
import { RegisterService } from "./application/services/register.service";
import { ResendOtpService } from "./application/services/resend-otp.service";
import { VerifyOtpService } from "./application/services/verify-otp.service";
import { EMAIL_SENDER } from "./domain/ports/email-sender.port";
import { ConsoleEmailSender } from "./infrastructure/email/console-email.sender";
import { AuthController } from "./presentation/auth.controller";

@Module({
  imports: [UserModule, RoleModule],
  controllers: [AuthController],
  providers: [RegisterService, VerifyOtpService, ResendOtpService, HasUsersService, LoginService, RefreshTokenService, { provide: EMAIL_SENDER, useClass: ConsoleEmailSender }],
})
export class AuthModule {}
