import { Controller, Get, Post, Body, Param, Patch, Delete, ParseIntPipe } from "@nestjs/common";
import { MatchesService } from "./matches.service";
import { CreateMatchDto } from "./dto/create-match.dto";
import { UpdateMatchDto } from "./dto/update-match.dto";
import { ApiCreatedResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from "@nestjs/swagger";

@ApiTags("Matches")
@Controller("matches")
export class MatchesController {
  constructor(private readonly service: MatchesService) {}

  @Post()
  @ApiOperation({ summary: "Créer un match" })
  @ApiCreatedResponse({ type: Object })
  create(@Body() dto: CreateMatchDto) {
    return this.service.create(dto);
  }

  @Get()
  @ApiOperation({ summary: "Lister les matchs" })
  @ApiOkResponse({ type: Object, isArray: true })
  findAll() {
    return this.service.findAll();
  }

  @Get(":id")
  @ApiOperation({ summary: "Récupérer un match" })
  @ApiParam({ name: "id", type: Number })
  @ApiOkResponse({ type: Object })
  @ApiNotFoundResponse({ description: "Match not found" })
  findOne(@Param("id", ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Mettre à jour un match" })
  @ApiParam({ name: "id", type: Number })
  @ApiOkResponse({ type: Object })
  update(@Param("id", ParseIntPipe) id: number, @Body() dto: UpdateMatchDto) {
    return this.service.update(id, dto);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Supprimer un match" })
  @ApiParam({ name: "id", type: Number })
  @ApiOkResponse({ schema: { type: "object", properties: { success: { type: "boolean", example: true } } } })
  async remove(@Param("id", ParseIntPipe) id: number) {
    await this.service.remove(id);
    return { success: true };
  }
}
