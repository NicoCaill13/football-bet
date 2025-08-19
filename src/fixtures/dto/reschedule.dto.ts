import { ApiProperty } from "@nestjs/swagger";
import { IsDateString, IsOptional, IsString } from "class-validator";

export class RescheduleDto {
  @ApiProperty({ example: "2025-09-15T19:00:00.000Z" }) @IsDateString() newStartsAt!: string;
  @ApiProperty({ required: false, example: "TV rights change" }) @IsOptional() @IsString() reason?: string;
  @ApiProperty({ required: false, example: "https://ligue1.fr/..." }) @IsOptional() @IsString() sourceUrl?: string;
}

