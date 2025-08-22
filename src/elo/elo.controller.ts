import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';
import { EloService } from './elo.service';
import { UpsertEloDto } from './dto/upsert-elo.dto';
import {
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';

@ApiTags('Elo')
@Controller('elo')
export class EloController {
  constructor(private readonly service: EloService) {}

  @Post()
  @ApiOperation({ summary: 'Enregistrer un rating Elo' })
  @ApiCreatedResponse({ type: Object })
  upsert(@Body() dto: UpsertEloDto) {
    return this.service.upsert(dto);
  }

  @Get(':teamId/latest')
  @ApiOperation({ summary: "Dernier rating Elo pour l'équipe" })
  @ApiParam({ name: 'teamId', type: Number })
  @ApiOkResponse({ type: Object })
  latest(@Param('teamId', ParseIntPipe) teamId: number) {
    return this.service.latest(teamId);
  }
}
