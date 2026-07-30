import { IsNotEmpty, IsString, MinLength } from "class-validator";

import { ApiProperty } from "@nestjs/swagger";

const PASSWORD_MIN_LENGTH = 8;

export class ResetPasswordDto {
  @ApiProperty({ example: "a1b2c3...redacted", description: "Plaintext reset token emailed by /forgot-password (1-hour expiry)." })
  @IsString()
  @IsNotEmpty()
  token!: string;

  @ApiProperty({ example: "NewSecurePass456!", minLength: PASSWORD_MIN_LENGTH })
  @IsString()
  @MinLength(PASSWORD_MIN_LENGTH)
  newPassword!: string;
}
