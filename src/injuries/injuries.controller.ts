import { Controller, Post, Query, BadRequestException } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { InjuriesImportService } from './injuries.service';

@ApiTags('Import • Injuries')
@Controller('import/injuries')
export class InjuriesImportController {
  constructor(private readonly svc: InjuriesImportService) {}

  @Post('sync')
  @ApiOperation({
    summary: 'Sync injuries depuis API-FOOTBALL (balayage par dates)',
  })
  @ApiQuery({
    name: 'league',
    required: true,
    description: 'Code ligue (L1, PL, SA, LL, BUN, ...)',
  })
  @ApiQuery({
    name: 'season',
    required: true,
    description: 'Année de début ex: 2025',
  })
  @ApiQuery({
    name: 'days',
    required: false,
    description: 'Fenêtre de jours à balayer (défaut=INJ_LOOKBACK_DAYS ou 14)',
  })
  async sync(
    @Query('league') league: string,
    @Query('season') season: string,
    @Query('days') days?: string,
  ) {
    const seasonYear = Number(season);
    if (!league || !seasonYear)
      throw new BadRequestException('league & season requis');
    const windowDays = days ? Math.max(1, Number(days)) : undefined;
    return this.svc.syncFromApiFootballByDates(
      league.toUpperCase(),
      seasonYear,
      windowDays,
    );
  }
}
