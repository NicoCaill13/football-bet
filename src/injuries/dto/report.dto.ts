import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, IsString } from 'class-validator';

export class InjuryReportDto {
  @ApiProperty({ example: 'lille', required: false })
  @IsOptional()
  @IsString()
  teamSlug?: string;
  @ApiProperty({ example: 1, required: false })
  @IsOptional()
  @IsInt()
  teamId?: number;
  @ApiProperty({ example: 'Tiago Santos' }) @IsString() player!: string;
  @ApiProperty({ example: 'out' }) @IsIn(['out', 'doubt', 'fit']) status!:
    | 'out'
    | 'doubt'
    | 'fit';
  @ApiProperty({ required: false, example: 'club presser' })
  @IsOptional()
  @IsString()
  source?: string;
}
