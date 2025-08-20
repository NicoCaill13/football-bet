import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsDateString, IsInt, IsOptional, IsPositive, IsString } from "class-validator";

export class CreateSeasonDto {
  @ApiProperty()
  @IsInt()
  @IsPositive()
  competitionId!: number;

  @ApiProperty({ description: 'Libellé de saison ex: "2025-2026"' })
  @IsString()
  label!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endDate?: string;

  /** Année de départ pour API-FOOTBALL (ex: 2025 pour "2025-2026") */
  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @IsPositive()
  afSeasonYear?: number;
}
