import { BadRequestException, Controller, Post, Query } from '@nestjs/common';
import { ApiOkResponse, ApiQuery, ApiTags } from '@nestjs/swagger';
import { PlayerImpactService } from './player-impact.service';

@ApiTags('import')
// ✅ plus de collision : /import/players-impact/api-football/build
@Controller('import/players-impact')
export class PlayerImpactController {
  constructor(private readonly svc: PlayerImpactService) {}

  @Post('build')
  @ApiQuery({ name: 'league', example: 'L1', description: 'Code interne (L1, PL, SA, LL, BUN, ...)' })
  @ApiQuery({ name: 'season', example: 2025, type: Number, description: 'Année de début de saison (ex: 2025)' })
  @ApiOkResponse({ description: 'Construit/MAJ PlayerImpact pour league+season' })
  async buildImpact(
    @Query('league') league: string,
    @Query('season') season: string, // pas de ParseIntPipe ici
  ) {
    const seasonNum = Number(season);
    if (!Number.isFinite(seasonNum)) throw new BadRequestException('season must be numeric, e.g. 2025');
    if (!league || typeof league !== 'string') throw new BadRequestException('league must be a string code, e.g. L1');
    return this.svc.buildLeagueSeasonImpact(league, seasonNum);
  }
}
