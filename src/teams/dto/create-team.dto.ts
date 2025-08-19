import { ApiProperty } from "@nestjs/swagger";
import { IsOptional, IsString } from "class-validator";

export class CreateTeamDto {
  @ApiProperty()
  @IsString()
  name!: string;

  @ApiProperty({ example: "fr" })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiProperty({ example: "lille" })
  @IsString()
  slug!: string;
}