import { IsEmail, Matches } from "class-validator";

import { ApiProperty } from "@nestjs/swagger";

const OTP_PATTERN = /^\d{6}$/;

export class VerifyOtpDto {
  @ApiProperty({ example: "user@example.com" })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: "123456", description: "6-digit code emailed on registration." })
  @Matches(OTP_PATTERN, { message: "otp must be a 6-digit code" })
  otp!: string;
}
