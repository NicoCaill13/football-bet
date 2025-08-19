import { ApiProperty } from "@nestjs/swagger";
import { IsDateString, IsInt, IsOptional, IsString } from "class-validator";

export class CreateSeasonDto {
  @ApiProperty({ example: 1 }) @IsInt() competitionId!: number;
  @ApiProperty({ example: "2025-2026" }) @IsString() label!: string;
  @ApiProperty({ required: false, example: "2025-08-01T00:00:00.000Z" }) @IsOptional() @IsDateString() startDate?: string;
  @ApiProperty({ required: false, example: "2026-06-30T00:00:00.000Z" }) @IsOptional() @IsDateString() endDate?: string;
}

