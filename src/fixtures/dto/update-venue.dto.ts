import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UpdateVenueDto {
  @ApiPropertyOptional({ description: 'Note (raison, source...)' })
  @IsOptional()
  @IsString()
  note?: string;
}
