import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { FixturesService } from './fixtures.service';
import { CreateFixtureDto } from './dto/create-fixture.dto';
import { RescheduleDto } from './dto/reschedule.dto';
import { PostponeDto } from './dto/postpone.dto';
import { CancelDto } from './dto/cancel.dto';
import { UpdateVenueDto } from './dto/update-venue.dto';

@ApiTags('Fixtures')
@Controller()
export class FixturesController {
  constructor(private readonly service: FixturesService) {}

  @Post('fixtures')
  @ApiOperation({ summary: 'Créer un fixture (match) lié à une saison/round' })
  @ApiCreatedResponse({ type: Object })
  create(@Body() dto: CreateFixtureDto) {
    return this.service.createFixture(dto);
  }

  @Get('fixtures/:id')
  @ApiOperation({ summary: 'Récupérer un fixture' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ type: Object })
  get(@Param('id', ParseIntPipe) id: number) {
    return this.service.getFixture(id);
  }

  @Get('competitions/:competitionId/fixtures')
  @ApiOperation({ summary: "Lister les fixtures d'une compétition" })
  @ApiParam({ name: 'competitionId', type: Number })
  @ApiOkResponse({ type: Object, isArray: true })
  byCompetition(@Param('competitionId', ParseIntPipe) competitionId: number) {
    return this.service.listCompetitionFixtures(competitionId);
  }

  @Get('seasons/:seasonId/fixtures')
  @ApiOperation({ summary: "Lister les fixtures d'une saison" })
  @ApiParam({ name: 'seasonId', type: Number })
  @ApiOkResponse({ type: Object, isArray: true })
  bySeason(@Param('seasonId', ParseIntPipe) seasonId: number) {
    return this.service.listSeasonFixtures(seasonId);
  }

  @Patch('fixtures/:id/reschedule')
  @ApiOperation({ summary: "Reprogrammer la date/heure d'un match" })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ type: Object })
  reschedule(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RescheduleDto,
  ) {
    return this.service.reschedule(id, dto);
  }

  @Patch('fixtures/:id/postpone')
  @ApiOperation({ summary: 'Reporter un match (sans nouvelle date)' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ type: Object })
  postpone(@Param('id', ParseIntPipe) id: number, @Body() dto: PostponeDto) {
    return this.service.postpone(id, dto);
  }

  @Patch('fixtures/:id/cancel')
  @ApiOperation({ summary: 'Annuler un match' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ type: Object })
  cancel(@Param('id', ParseIntPipe) id: number, @Body() dto: CancelDto) {
    return this.service.cancel(id, dto);
  }

  @Patch('fixtures/:id/venue')
  @ApiOperation({ summary: "Changer le stade/lieu d'un match" })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ type: Object })
  changeVenue(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateVenueDto,
  ) {
    return this.service.changeVenue(id, dto);
  }

  @Get('fixtures/:id/changes')
  @ApiOperation({ summary: "Historique des changements d'un match" })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ type: Object, isArray: true })
  changeLog(@Param('id', ParseIntPipe) id: number) {
    return this.service.changeLog(id);
  }
}
