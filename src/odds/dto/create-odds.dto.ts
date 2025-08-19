import { ApiProperty } from "@nestjs/swagger";
import { IsNumber, IsPositive, IsString } from "class-validator";

export class CreateOddsDto {
  @ApiProperty({ example: "pinnacle" })
  @IsString()
  book!: string;

  @ApiProperty({ example: 3.05 })
  @IsNumber()
  @IsPositive()
  o1!: number; // Home

  @ApiProperty({ example: 3.60 })
  @IsNumber()
  @IsPositive()
  oX!: number; // Draw

  @ApiProperty({ example: 2.40 })
  @IsNumber()
  @IsPositive()
  o2!: number; // Away
}