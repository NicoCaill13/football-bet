import { Body, Controller, Get, Param, ParseIntPipe, Post } from "@nestjs/common";
import { EloService } from "./elo.service";
import { UpsertEloDto } from "./dto/upsert-elo.dto";

@Controller("elo")
export class EloController {
  constructor(private readonly service: EloService) {}

  @Post()
  upsert(@Body() dto: UpsertEloDto) {
    return this.service.upsert(dto);
  }

  @Get(":teamId/latest")
  latest(@Param("teamId", ParseIntPipe) teamId: number) {
    return this.service.latest(teamId);
  }
}