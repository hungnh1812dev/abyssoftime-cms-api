import { IsNotEmpty, IsString, MinLength } from "class-validator";

const PASSWORD_MIN_LENGTH = 8;

export class ResetPasswordDto {
  @IsString()
  @IsNotEmpty()
  token!: string;

  @IsString()
  @MinLength(PASSWORD_MIN_LENGTH)
  newPassword!: string;
}
