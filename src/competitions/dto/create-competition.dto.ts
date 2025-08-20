import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsIn, IsOptional, IsString } from "class-validator";

type CompetitionTypeDto = "league" | "cup" | "europe";

export class CreateCompetitionDto {
  @ApiProperty() @IsString()
  name!: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  code?: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  country?: string;

  @ApiProperty({ enum: ["league", "cup", "europe"], enumName: "CompetitionType" })
  @IsIn(["league", "cup", "europe"])
  type!: CompetitionTypeDto;

  @ApiPropertyOptional() @IsOptional() @IsString()
  organizer?: string;
}
