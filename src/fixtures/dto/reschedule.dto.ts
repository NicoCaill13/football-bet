import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString } from 'class-validator';

export class RescheduleDto {
  @ApiProperty({ description: 'Date/heure initiale (ISO)' })
  @IsDateString()
  from!: string;

  @ApiProperty({ description: 'Nouvelle date/heure (ISO)' })
  @IsDateString()
  to!: string;

  @ApiPropertyOptional({ description: 'Note (raison, source...)' })
  @IsOptional()
  @IsString()
  note?: string;
}
