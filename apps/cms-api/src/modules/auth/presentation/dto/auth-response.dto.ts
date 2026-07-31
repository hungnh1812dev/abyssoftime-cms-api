import { ApiProperty } from "@nestjs/swagger";

export class MessageResponseDto {
  @ApiProperty({ example: "Login successful." })
  message!: string;
}

export class HasUsersResponseDto {
  @ApiProperty()
  hasUsers!: boolean;
}
