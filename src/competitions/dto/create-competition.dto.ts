import { ApiProperty } from "@nestjs/swagger";
import { IsEnum, IsOptional, IsString } from "class-validator";

export enum CompetitionType {
  league = "league",
  cup = "cup",
  europe = "europe",
}

export class CreateCompetitionDto {
  @ApiProperty({ example: "Ligue 1" }) @IsString() name!: string;
  @ApiProperty({ example: "L1", required: false }) @IsOptional() @IsString() code?: string;
  @ApiProperty({ example: "FR", required: false }) @IsOptional() @IsString() country?: string;
  @ApiProperty({ enum: CompetitionType, example: CompetitionType.league }) @IsEnum(CompetitionType) type!: CompetitionType;
  @ApiProperty({ example: "LFP", required: false }) @IsOptional() @IsString() organizer?: string;
}

