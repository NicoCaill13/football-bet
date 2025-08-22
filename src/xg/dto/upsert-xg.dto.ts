import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, IsInt } from 'class-validator';

export class UpsertXgDto {
  @ApiProperty({ example: 'lille', required: false })
  @IsOptional()
  @IsString()
  teamSlug?: string;
  @ApiProperty({ example: 1, required: false })
  @IsOptional()
  @IsInt()
  teamId?: number;
  @ApiProperty({ example: '5m' }) @IsString() span!: string;
  @ApiProperty({ example: 7.2 }) @IsNumber() xgFor!: number;
  @ApiProperty({ example: 5.6 }) @IsNumber() xgAgainst!: number;
}
