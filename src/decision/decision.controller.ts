import { Controller, Get, Param, ParseIntPipe } from "@nestjs/common";
import { DecisionService } from "./decision.service";
import { PrismaService } from "../prisma/prisma.service";
import { ApiOkResponse, ApiOperation, ApiParam, ApiTags } from "@nestjs/swagger";
import { DecisionLogRecordDto, DecisionResultDto } from "../common/api-types";

@ApiTags("Decision")
@Controller()
export class DecisionController {
  constructor(private readonly service: DecisionService, private prisma: PrismaService) {}

  @Get("matches/:matchId/pick")
  @ApiOperation({ summary: "Décision 1N2 (EV + confiance + stake)" })
  @ApiParam({ name: "matchId", type: Number })
  @ApiOkResponse({ type: DecisionResultDto })
  getPick(@Param("matchId", ParseIntPipe) matchId: number) {
    return this.service.pickForMatch(matchId);
  }

  @Get("matches/:matchId/decision-log")
  @ApiOperation({ summary: "Historique des décisions (20 dernières)" })
  @ApiParam({ name: "matchId", type: Number })
  @ApiOkResponse({ type: DecisionLogRecordDto, isArray: true })
  logs(@Param("matchId", ParseIntPipe) matchId: number) {
    return this.prisma.decisionLog.findMany({ where: { matchId }, orderBy: { createdAt: "desc" }, take: 20 });
  }
}
