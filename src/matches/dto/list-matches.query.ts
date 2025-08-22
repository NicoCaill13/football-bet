import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ListMatchesQueryDto {
  @ApiPropertyOptional({
    description: 'Competition code (L1, PL, SA, ...)',
    example: 'L1',
  })
  @IsOptional()
  @IsString()
  league?: string;

  @ApiPropertyOptional({
    description: 'Season start year (YYYY)',
    example: '2025',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  season?: number;

  @ApiPropertyOptional({ enum: ['all', 'upcoming', 'past'], default: 'all' })
  @IsOptional()
  @IsIn(['all', 'upcoming', 'past'])
  scope?: 'all' | 'upcoming' | 'past';

  @ApiPropertyOptional({
    description: 'From date (ISO)',
    example: '2025-08-01',
  })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ description: 'To date (ISO)', example: '2025-09-30' })
  @IsOptional()
  @IsDateString()
  to?: string;

  @ApiPropertyOptional({ description: 'Limit', default: 40, maximum: 200 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;

  @ApiPropertyOptional({
    description: 'Odds aggregation',
    enum: ['none', 'best', 'latest'],
    default: 'none',
  })
  @IsOptional()
  @IsIn(['none', 'best', 'latest'])
  odds?: 'none' | 'best' | 'latest';

  @IsOptional()
  @IsIn(['prediction', 'best', 'latest'])
  with?: string;
}
