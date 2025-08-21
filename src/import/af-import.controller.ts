import { Controller, Param, ParseIntPipe, Post } from "@nestjs/common";
import { ApiOperation, ApiParam, ApiTags } from "@nestjs/swagger";
import { AfImportService } from "./af-import.service";

@ApiTags("Import")
@Controller("import/matches")
export class AfImportController {
  constructor(private readonly service: AfImportService) {}

  @Post(":code/:season")
  @ApiOperation({ summary: "Import fixtures & teams pour une ligue/saison (API-FOOTBALL)" })
  @ApiParam({ name: "code", example: "L1" })
  @ApiParam({ name: "season", example: 2025 })
  run(@Param("code") code: string, @Param("season", ParseIntPipe) season: number) {
    return this.service.importLeagueSeason(code.toUpperCase(), season);
  }
}
