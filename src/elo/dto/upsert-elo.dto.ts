import { ApiProperty } from "@nestjs/swagger";
import { IsInt, IsOptional, IsString } from "class-validator";

export class UpsertEloDto {
  @ApiProperty({ example: "lille", required: false })
  @IsOptional()
  @IsString()
  teamSlug?: string;

  @ApiProperty({ example: 1, required: false })
  @IsOptional()
  @IsInt()
  teamId?: number;

  @ApiProperty({ example: 1779 })
  @IsInt()
  rating!: number;

  @ApiProperty({ example: "clubelo", required: false })
  @IsOptional()
  @IsString()
  source?: string;
}