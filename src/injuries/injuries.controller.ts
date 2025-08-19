import { Body, Controller, Get, Param, ParseIntPipe, Post, Query } from "@nestjs/common";
import { InjuriesService } from "./injuries.service";
import { InjuryReportDto } from "./dto/report.dto";

@Controller("injuries")
export class InjuriesController {
  constructor(private readonly service: InjuriesService) {}

  @Post()
  report(@Body() dto: InjuryReportDto) { return this.service.report(dto); }

  @Get(":teamId/recent")
  recent(@Param("teamId", ParseIntPipe) teamId: number, @Query("days") days = "14") {
    return this.service.recentOutCount(teamId, Number(days));
  }
}
