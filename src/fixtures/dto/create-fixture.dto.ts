import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsInt, IsOptional, IsString } from 'class-validator';

export class CreateFixtureDto {
  @ApiProperty({ example: 1 }) @IsInt() seasonId!: number;
  @ApiProperty({ required: false, example: 2 })
  @IsOptional()
  @IsInt()
  roundId?: number;
  @ApiProperty({ example: 1 }) @IsInt() homeTeamId!: number;
  @ApiProperty({ example: 2 }) @IsInt() awayTeamId!: number;
  @ApiProperty({ example: '2025-09-14T19:00:00.000Z' })
  @IsDateString()
  startsAt!: string;
  @ApiProperty({ required: false, example: 'Stade Pierre-Mauroy' })
  @IsOptional()
  @IsString()
  venue?: string;
}
