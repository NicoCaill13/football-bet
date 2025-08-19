import { ApiProperty } from "@nestjs/swagger";
import { IsDateString, IsInt, IsOptional, IsString } from "class-validator";

export class CreateRoundDto {
  @ApiProperty({ example: 1 }) @IsInt() seasonId!: number;
  @ApiProperty({ example: "Matchday 3" }) @IsString() name!: string;
  @ApiProperty({ required: false, example: 3 }) @IsOptional() @IsInt() roundNo?: number;
  @ApiProperty({ required: false, example: "Group A" }) @IsOptional() @IsString() stage?: string;
  @ApiProperty({ required: false, example: 1 }) @IsOptional() @IsInt() leg?: number;
  @ApiProperty({ required: false, example: "2025-09-10T00:00:00.000Z" }) @IsOptional() @IsDateString() startDate?: string;
  @ApiProperty({ required: false, example: "2025-09-16T00:00:00.000Z" }) @IsOptional() @IsDateString() endDate?: string;
}

