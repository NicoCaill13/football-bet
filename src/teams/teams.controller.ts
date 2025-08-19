import { Controller, Get, Post, Body, Param, Patch, Delete, ParseIntPipe } from "@nestjs/common";
import { TeamsService } from "./teams.service";
import { CreateTeamDto } from "./dto/create-team.dto";
import { UpdateTeamDto } from "./dto/update-team.dto";
import { ApiCreatedResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from "@nestjs/swagger";

@ApiTags("Teams")
@Controller("teams")
export class TeamsController {
  constructor(private readonly service: TeamsService) {}

  @Post()
  @ApiOperation({ summary: "Créer une équipe" })
  @ApiCreatedResponse({ type: Object })
  create(@Body() dto: CreateTeamDto) {
    return this.service.create(dto);
  }

  @Get()
  @ApiOperation({ summary: "Lister les équipes" })
  @ApiOkResponse({ type: Object, isArray: true })
  findAll() {
    return this.service.findAll();
  }

  @Get(":id")
  @ApiOperation({ summary: "Récupérer une équipe" })
  @ApiParam({ name: "id", type: Number })
  @ApiOkResponse({ type: Object })
  @ApiNotFoundResponse({ description: "Team not found" })
  findOne(@Param("id", ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Mettre à jour une équipe" })
  @ApiParam({ name: "id", type: Number })
  @ApiOkResponse({ type: Object })
  update(@Param("id", ParseIntPipe) id: number, @Body() dto: UpdateTeamDto) {
    return this.service.update(id, dto);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Supprimer une équipe" })
  @ApiParam({ name: "id", type: Number })
  @ApiOkResponse({ schema: { type: "object", properties: { success: { type: "boolean", example: true } } } })
  async remove(@Param("id", ParseIntPipe) id: number) {
    await this.service.remove(id);
    return { success: true };
  }
}
