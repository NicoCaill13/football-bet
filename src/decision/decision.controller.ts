import { Controller, Get, Param, ParseIntPipe } from "@nestjs/common";
import { DecisionService } from "./decision.service";
import { PrismaService } from "../prisma/prisma.service";

@Controller()
export class DecisionController {
  constructor(private readonly service: DecisionService, private prisma: PrismaService) {}

  @Get("matches/:matchId/pick")
  getPick(@Param("matchId", ParseIntPipe) matchId: number) {
    return this.service.pickForMatch(matchId);
  }

  @Get("matches/:matchId/decision-log")
  logs(@Param("matchId", ParseIntPipe) matchId: number) {
    return this.prisma.decisionLog.findMany({ where: { matchId }, orderBy: { createdAt: "desc" }, take: 20 });
  }
}
