import { IsBoolean, IsEmail, IsNotEmpty, IsOptional, IsString } from "class-validator";

import { ApiProperty } from "@nestjs/swagger";

export class LoginDto {
  @ApiProperty({ example: "user@example.com" })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: "SecurePass123!" })
  @IsString()
  @IsNotEmpty()
  password!: string;

  @ApiProperty({ example: false, required: false, default: false, description: "Extends the refresh token/cookie lifetime from 7 days to 30 days" })
  @IsOptional()
  @IsBoolean()
  rememberMe?: boolean;
}
