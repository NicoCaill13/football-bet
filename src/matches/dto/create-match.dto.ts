// src/matches/dto/create-match.dto.ts
import { ApiProperty } from "@nestjs/swagger";
import { IsDateString, IsInt, IsOptional, IsString } from "class-validator";

export class CreateMatchDto {
  @ApiProperty()
  @IsInt()
  homeTeamId!: number;

  @ApiProperty()
  @IsInt()
  awayTeamId!: number;

  @ApiProperty({ example: "2025-08-24T18:45:00.000Z" })
  @IsDateString()
  startsAt!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  competition?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  venue?: string;
}
