import { ApiProperty } from "@nestjs/swagger";
import { IsOptional, IsString } from "class-validator";

export class CancelDto {
  @ApiProperty({ example: "Security issues" }) @IsString() reason!: string;
  @ApiProperty({ required: false, example: "https://..." }) @IsOptional() @IsString() sourceUrl?: string;
}

