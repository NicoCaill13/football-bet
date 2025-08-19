import { Body, Controller, Get, Param, ParseIntPipe, Post } from "@nestjs/common";
import { XgService } from "./xg.service";
import { UpsertXgDto } from "./dto/upsert-xg.dto";
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from "@nestjs/swagger";

@ApiTags("xG")
@Controller("xg")
export class XgController {
  constructor(private readonly service: XgService) {}

  @Post("rolling")
  @ApiOperation({ summary: "Upsert du xG rolling (par span ex: 5m)" })
  @ApiCreatedResponse({ type: Object })
  upsert(@Body() dto: UpsertXgDto) { return this.service.upsert(dto); }

  @Get(":teamId/rolling/:span")
  @ApiOperation({ summary: "Lire le xG rolling d'une équipe" })
  @ApiParam({ name: "teamId", type: Number })
  @ApiParam({ name: "span", type: String, example: "5m" })
  @ApiOkResponse({ type: Object })
  get(@Param("teamId", ParseIntPipe) teamId: number, @Param("span") span: string) { return this.service.get(teamId, span); }
}
