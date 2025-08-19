import { ApiProperty } from "@nestjs/swagger";
import { IsOptional, IsString } from "class-validator";

export class PostponeDto {
  @ApiProperty({ example: "Weather alert" }) @IsString() reason!: string;
  @ApiProperty({ required: false, example: "https://..." }) @IsOptional() @IsString() sourceUrl?: string;
}

