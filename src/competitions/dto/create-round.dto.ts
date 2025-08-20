import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsInt, IsOptional, IsPositive, IsString } from "class-validator";

export class CreateRoundDto {
  @ApiProperty() @IsInt() @IsPositive() seasonId!: number;
  @ApiPropertyOptional({ description: "Nom affiché (ex: Matchday 5 / Quarter-finals)" })
  @IsOptional() @IsString() name?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() roundNo?: number;
  @ApiPropertyOptional({ description: "Manches pour coupes (1,2...); null pour championnat" })
  @IsOptional() @IsInt() leg?: number;
}
