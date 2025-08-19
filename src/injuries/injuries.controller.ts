import { Body, Controller, Get, Param, ParseIntPipe, Post, Query } from "@nestjs/common";
import { InjuriesService } from "./injuries.service";
import { InjuryReportDto } from "./dto/report.dto";
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiParam, ApiQuery, ApiTags } from "@nestjs/swagger";

@ApiTags("Injuries")
@Controller("injuries")
export class InjuriesController {
  constructor(private readonly service: InjuriesService) {}

  @Post()
  @ApiOperation({ summary: "Déclarer un joueur blessé / indisponible / fit" })
  @ApiCreatedResponse({ type: Object })
  report(@Body() dto: InjuryReportDto) { return this.service.report(dto); }

  @Get(":teamId/recent")
  @ApiOperation({ summary: "Compter les 'out' récents (lookback en jours)" })
  @ApiParam({ name: "teamId", type: Number })
  @ApiQuery({ name: "days", required: false, example: 14 })
  @ApiOkResponse({ schema: { type: "integer", example: 2 } })
  recent(@Param("teamId", ParseIntPipe) teamId: number, @Query("days") days = "14") {
    return this.service.recentOutCount(teamId, Number(days));
  }
}
