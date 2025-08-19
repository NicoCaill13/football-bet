import { ApiProperty } from "@nestjs/swagger";
import { IsString } from "class-validator";

export class UpdateVenueDto {
  @ApiProperty({ example: "Allianz Riviera" }) @IsString() venue!: string;
  @ApiProperty({ example: "Stadium unavailable" }) @IsString() reason!: string;
}

