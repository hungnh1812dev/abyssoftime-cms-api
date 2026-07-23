import { IsEmail, Matches } from "class-validator";

const OTP_PATTERN = /^\d{6}$/;

export class VerifyOtpDto {
  @IsEmail()
  email!: string;

  @Matches(OTP_PATTERN, { message: "otp must be a 6-digit code" })
  otp!: string;
}
