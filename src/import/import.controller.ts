import { Controller, Param, ParseIntPipe, Post } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { ImportService } from "./import.service";

@ApiTags("Import")
@Controller("import")
export class ImportController {
  constructor(private readonly service: ImportService) {}

  @Post("football-data/ligue1/:season")
  @ApiOperation({ summary: "Import Ligue 1 depuis football-data.org (v4) pour l'année de saison (ex: 2025)" })
  importL1(@Param("season", ParseIntPipe) season: number) {
    return this.service.importLigue1FromFootballData(season);
  }
}

