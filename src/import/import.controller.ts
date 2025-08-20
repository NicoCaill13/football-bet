import { Controller, Param, ParseIntPipe, Post } from "@nestjs/common";
import { ApiOperation, ApiParam, ApiTags } from "@nestjs/swagger";
import { ImportService } from "./import.service";

@ApiTags("Import")
@Controller("import/football-data")
export class ImportController {
  constructor(private readonly service: ImportService) {}

  @Post(":code/:season")
  @ApiOperation({ summary: "Import générique via football-data.org (code FD, ex: PL, SA, PD, BL1, FL1, CL, EL, ECL...)" })
  @ApiParam({ name: "code", example: "PL" })
  @ApiParam({ name: "season", example: 2025 })
  importGeneric(@Param("code") code: string, @Param("season", ParseIntPipe) season: number) {
    return this.service.importFromFootballData(code, season);
  }
}

