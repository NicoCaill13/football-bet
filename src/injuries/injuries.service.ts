import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { ApiFootballClient } from 'src/common/api-football.client';

type InjResponse = {
  paging?: { current?: number; total?: number };
  errors?: any;
  response?: Array<{
    player?: { id?: number; name?: string };
    team?: { id?: number; name?: string };
    fixture?: { id?: number; date?: string };
    league?: { id?: number; season?: number };
    // reason/type existent mais non indispensables au MVP
  }>;
};

function fmtDate(d: Date) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

@Injectable()
export class InjuriesImportService {
  private readonly logger = new Logger(InjuriesImportService.name);

  constructor(
    private prisma: PrismaService,
    private af: ApiFootballClient,
  ) {}

  /**
   * Ancienne version (league+season brut). Conserve si tu veux.
   */
  async syncFromApiFootball(leagueCode: string, seasonYear: number) {
    const code = leagueCode.trim().toUpperCase();
    const comp = await this.prisma.competition.findFirst({ where: { code } });
    if (!comp || !comp.afLeagueId)
      throw new BadRequestException(
        `Competition ${code} inconnue ou sans afLeagueId`,
      );
    const label = `${seasonYear}-${seasonYear + 1}`;
    const season = await this.prisma.season.findFirst({
      where: { competitionId: comp.id, label },
    });
    if (!season)
      throw new BadRequestException(
        `Season not found for ${code} ${seasonYear}`,
      );

    let page = 1,
      totalPages = 1,
      scanned = 0,
      created = 0,
      skipped = 0;
    do {
      const res: InjResponse = await this.af.injuries({
        league: comp.afLeagueId,
        season: seasonYear,
        page,
      });
      totalPages = Number(res?.paging?.total || 1);
      const list = Array.isArray(res?.response) ? res!.response! : [];
      scanned += list.length;
      for (const it of list) {
        const afTid = it.team?.id ?? null;
        const playerName = (it.player?.name || '').trim();
        if (!afTid || !playerName) {
          skipped++;
          continue;
        }
        const team = await this.prisma.team.findFirst({
          where: { afTeamId: afTid },
        });
        if (!team) {
          skipped++;
          continue;
        }
        const reportedAt = it.fixture?.date
          ? new Date(it.fixture.date)
          : new Date();
        const since = new Date(Date.now() - 21 * 24 * 3600 * 1000);
        const already = await this.prisma.injuryReport.findFirst({
          where: {
            teamId: team.id,
            player: playerName || undefined,
            status: 'out',
            reportedAt: { gte: since },
          },
        });
        if (already) {
          skipped++;
          continue;
        }
        await this.prisma.injuryReport.create({
          data: {
            teamId: team.id,
            status: 'out',
            source: 'api-football',
            player: playerName || 'Unknown',
            reportedAt,
          } as any,
        });
        created++;
      }
      page++;
    } while (page <= totalPages);

    return {
      provider: 'api-football',
      league: code,
      season: label,
      seasonId: season.id,
      scanned,
      created,
      skipped,
      pages: totalPages,
    };
  }

  /**
   * Version robuste: balaye par dates sur une fenêtre (par défaut INJ_LOOKBACK_DAYS ou 14).
   * - GET /injuries?league={id}&date=YYYY-MM-DD [&page=n]
   * - Déduplique par équipe/joueur dans la fenêtre (et contre la DB recente).
   */
  async syncFromApiFootballByDates(
    leagueCode: string,
    seasonYear: number,
    daysWindow?: number,
  ) {
    const code = leagueCode.trim().toUpperCase();
    const comp = await this.prisma.competition.findFirst({ where: { code } });
    if (!comp || !comp.afLeagueId)
      throw new BadRequestException(
        `Competition ${code} inconnue ou sans afLeagueId`,
      );

    const label = `${seasonYear}-${seasonYear + 1}`;
    const season = await this.prisma.season.findFirst({
      where: { competitionId: comp.id, label },
    });
    if (!season)
      throw new BadRequestException(
        `Season not found for ${code} ${seasonYear}`,
      );

    const defaultDays = Number(process.env.INJ_LOOKBACK_DAYS ?? '14');
    const window = Math.max(
      1,
      Number.isFinite(daysWindow as any) ? (daysWindow as number) : defaultDays,
    );

    const today = new Date();
    // on parcourt du plus ancien -> au plus récent pour éviter trop de doublons côté DB
    const dates: string[] = [];
    for (let i = window; i >= 0; i--) {
      const d = new Date(today.getTime() - i * 24 * 3600 * 1000);
      dates.push(fmtDate(d));
    }

    let scanned = 0,
      created = 0,
      skipped = 0;
    const seen = new Set<string>(); // clé: `${afTeamId}|${playerName.toLowerCase()}|${date}`

    for (const date of dates) {
      let page = 1,
        totalPages = 1;
      do {
        const res: InjResponse = await this.af.injuries({
          league: comp.afLeagueId,
          date,
          page,
        });
        totalPages = Number(res?.paging?.total || 1);

        if (Array.isArray(res?.errors) && res!.errors!.length) {
          this.logger.warn(
            `injuries errors @ ${date}: ${JSON.stringify(res!.errors)}`,
          );
        }

        const list = Array.isArray(res?.response) ? res!.response! : [];
        scanned += list.length;

        for (const it of list) {
          const afTid = it.team?.id ?? null;
          const playerName = (it.player?.name || '').trim();
          if (!afTid || !playerName) {
            skipped++;
            continue;
          }

          const key = `${afTid}|${playerName.toLowerCase()}|${date}`;
          if (seen.has(key)) {
            skipped++;
            continue;
          }
          seen.add(key);

          const team = await this.prisma.team.findFirst({
            where: { afTeamId: afTid },
          });
          if (!team) {
            skipped++;
            continue;
          }

          const reportedAt = it.fixture?.date
            ? new Date(it.fixture.date)
            : new Date(`${date}T12:00:00Z`);
          const since = new Date(Date.now() - window * 24 * 3600 * 1000);

          const already = await this.prisma.injuryReport.findFirst({
            where: {
              teamId: team.id,
              player: playerName || undefined,
              status: 'out',
              reportedAt: { gte: since },
            },
          });
          if (already) {
            skipped++;
            continue;
          }

          await this.prisma.injuryReport.create({
            data: {
              teamId: team.id,
              status: 'out',
              source: 'api-football',
              player: playerName || 'Unknown',
              reportedAt,
            } as any,
          });
          created++;
        }

        page++;
      } while (page <= totalPages);
    }

    return {
      provider: 'api-football',
      league: code,
      season: label,
      seasonId: season.id,
      scanned,
      created,
      skipped,
      pages: 'by-date',
      windowDays: window,
    };
  }
}
