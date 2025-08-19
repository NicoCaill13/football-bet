import { Body, Controller, Get, Param, ParseIntPipe, Post } from "@nestjs/common";
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from "@nestjs/swagger";
import { CompetitionsService } from "./competitions.service";
import { CreateCompetitionDto } from "./dto/create-competition.dto";
import { CreateSeasonDto } from "./dto/create-season.dto";
import { CreateRoundDto } from "./dto/create-round.dto";

@ApiTags("Competitions")
@Controller()
export class CompetitionsController {
  constructor(private readonly service: CompetitionsService) {}

  @Post("competitions")
  @ApiOperation({ summary: "Créer une compétition (L1, Coupe, UCL...)" })
  @ApiCreatedResponse({ type: Object })
  createCompetition(@Body() dto: CreateCompetitionDto) {
    return this.service.createCompetition(dto);
  }

  @Get("competitions")
  @ApiOperation({ summary: "Lister les compétitions" })
  @ApiOkResponse({ type: Object, isArray: true })
  listCompetitions() {
    return this.service.listCompetitions();
  }

  @Post("competitions/:id/seasons")
  @ApiOperation({ summary: "Créer une saison pour une compétition" })
  @ApiParam({ name: "id", type: Number })
  @ApiCreatedResponse({ type: Object })
  createSeason(@Param("id", ParseIntPipe) competitionId: number, @Body() dto: CreateSeasonDto) {
    return this.service.createSeason({ ...dto, competitionId });
  }

  @Get("competitions/:id/seasons")
  @ApiOperation({ summary: "Lister les saisons d'une compétition" })
  @ApiParam({ name: "id", type: Number })
  @ApiOkResponse({ type: Object, isArray: true })
  listSeasons(@Param("id", ParseIntPipe) competitionId: number) {
    return this.service.listSeasons(competitionId);
  }

  @Post("seasons/:seasonId/rounds")
  @ApiOperation({ summary: "Créer un round (matchday / tour) pour une saison" })
  @ApiParam({ name: "seasonId", type: Number })
  @ApiCreatedResponse({ type: Object })
  createRound(@Param("seasonId", ParseIntPipe) seasonId: number, @Body() dto: CreateRoundDto) {
    return this.service.createRound({ ...dto, seasonId });
  }

  @Get("seasons/:seasonId/rounds")
  @ApiOperation({ summary: "Lister les rounds d'une saison" })
  @ApiParam({ name: "seasonId", type: Number })
  @ApiOkResponse({ type: Object, isArray: true })
  listRounds(@Param("seasonId", ParseIntPipe) seasonId: number) {
    return this.service.listRounds(seasonId);
  }
}

