import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { TeamsService } from './teams.service';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';
import {
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';

@ApiTags('Teams')
@Controller('teams')
export class TeamsController {
  constructor(private readonly service: TeamsService) {}

  @Post()
  @ApiOperation({ summary: 'Créer une équipe' })
  @ApiCreatedResponse({ type: Object })
  create(@Body() dto: CreateTeamDto) {
    return this.service.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Lister les équipes' })
  @ApiOkResponse({ type: Object, isArray: true })
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Récupérer une équipe' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ type: Object })
  @ApiNotFoundResponse({ description: 'Team not found' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Mettre à jour une équipe' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ type: Object })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateTeamDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Supprimer une équipe' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: { success: { type: 'boolean', example: true } },
    },
  })
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.service.remove(id);
    return { success: true };
  }

  @Get(':id/fixtures')
  @ApiOperation({
    summary:
      "Calendrier d'une équipe (filtrable date, statut, type de compétition)",
  })
  @ApiParam({ name: 'id', type: Number })
  @ApiQuery({
    name: 'from',
    required: false,
    example: '2025-08-01T00:00:00.000Z',
  })
  @ApiQuery({
    name: 'to',
    required: false,
    example: '2026-06-30T00:00:00.000Z',
  })
  @ApiQuery({ name: 'status', required: false, example: 'scheduled' })
  @ApiQuery({
    name: 'type',
    required: false,
    enum: ['league', 'cup', 'europe'],
  })
  @ApiOkResponse({ type: Object, isArray: true })
  async fixtures(
    @Param('id', ParseIntPipe) teamId: number,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('status') status?: string,
    @Query('type') type?: 'league' | 'cup' | 'europe',
  ) {
    const where: any = {
      OR: [{ homeTeamId: teamId }, { awayTeamId: teamId }],
    };
    if (from || to) {
      where.startsAt = {};
      if (from) where.startsAt.gte = new Date(from);
      if (to) where.startsAt.lte = new Date(to);
    }
    if (status) where.status = status;
    if (type) where.competition = { type };

    const matches = await this.service['prisma'].match.findMany({
      where,
      orderBy: { startsAt: 'asc' },
      include: {
        competition: true,
        season: true,
        round: true,
        homeTeam: true,
        awayTeam: true,
      },
    });
    return matches;
  }
}
