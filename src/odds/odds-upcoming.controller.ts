import { Controller, Get, Post, Query } from '@nestjs/common';
import { OddsImportService } from './odds.import.service';
import { ApiOkResponse, ApiQuery, ApiTags } from '@nestjs/swagger';

@ApiTags('odds')
@Controller('odds')
export class OddsUpcomingController {
  constructor(private readonly importer: OddsImportService) {}

  @Post('import/upcoming')
  @ApiQuery({ name: 'league', required: true, example: 'L1' })
  @ApiQuery({ name: 'season', required: true, example: '2025' })
  @ApiQuery({ name: 'next', required: false, example: '40' })
  @ApiOkResponse({ description: 'Import pre-match odds by fixture' })
  async importUpcoming(
    @Query('league') league: string,
    @Query('season') season: string,
    @Query('next') next?: string,
  ) {
    const l = (league ?? '').toUpperCase();
    const y = Number(season);
    const n = next ? Number(next) : 40;
    return this.importer.importUpcomingFromApiFootball(l, y, n);
  }
}
