import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsDateString, IsInt, IsOptional, IsPositive, IsString } from "class-validator";

export class CreateMatchDto {
  @ApiPropertyOptional() @IsOptional() @IsInt() @IsPositive() competitionId?: number;
  @ApiPropertyOptional({ description: "Code/nom compétition si pas d'ID" })
  @IsOptional() @IsString() competition?: string;

  @ApiPropertyOptional() @IsOptional() @IsInt() @IsPositive() seasonId?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @IsPositive() roundId?: number;

  @ApiProperty() @IsInt() @IsPositive() homeTeamId!: number;
  @ApiProperty() @IsInt() @IsPositive() awayTeamId!: number;

  @ApiProperty() @IsDateString() startsAt!: string;

  @ApiPropertyOptional({ default: "scheduled" }) @IsOptional() @IsString() status?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() venue?: string | null;

  @ApiPropertyOptional() @IsOptional() @IsInt() @IsPositive() afFixtureId?: number;
}
