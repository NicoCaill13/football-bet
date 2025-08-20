import { PartialType } from "@nestjs/mapped-types";
import { CreateMatchDto } from "./create-match.dto";
import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString } from "class-validator";

export class UpdateMatchDto extends PartialType(CreateMatchDto) {
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string;
}
