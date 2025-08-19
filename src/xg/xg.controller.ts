import { Body, Controller, Get, Param, ParseIntPipe, Post } from "@nestjs/common";
import { XgService } from "./xg.service";
import { UpsertXgDto } from "./dto/upsert-xg.dto";

@Controller("xg")
export class XgController {
  constructor(private readonly service: XgService) {}

  @Post("rolling")
  upsert(@Body() dto: UpsertXgDto) { return this.service.upsert(dto); }

  @Get(":teamId/rolling/:span")
  get(@Param("teamId", ParseIntPipe) teamId: number, @Param("span") span: string) {
    return this.service.get(teamId, span);
  }
}
