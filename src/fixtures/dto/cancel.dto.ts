import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsDateString, IsOptional, IsString } from "class-validator";

export class CancelDto {
  @ApiProperty({ description: "Date/heure prévue (ISO)" })
  @IsDateString()
  from!: string;

  @ApiPropertyOptional({ description: "Note (raison, source...)" })
  @IsOptional()
  @IsString()
  note?: string;
}
