import { IsBoolean, IsEmail, IsNotEmpty, IsString, Matches, MinLength } from "class-validator";

const USERNAME_PATTERN = /^[a-zA-Z0-9_.-]{3,32}$/;
const PASSWORD_MIN_LENGTH = 8;

export class RegisterDto {
  @IsEmail()
  email!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @Matches(USERNAME_PATTERN, { message: "username must be 3-32 characters and contain only letters, numbers, underscores, dots, or hyphens" })
  username!: string;

  @IsString()
  @MinLength(PASSWORD_MIN_LENGTH)
  password!: string;

  @IsBoolean()
  accountType!: boolean;
}
