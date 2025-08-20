import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { ApiFootballClient } from 'src/common/api-football.client';
import { AF_META } from 'src/import/af-import.service'; // <-- garde TON chemin

type ImportSummary = {
  provider: 'api-football';
  league: string;
  season: string;
  scannedOdds: number;
  rowsSaved: number;
  skipped: number;
  mode: 'by-fixture';
};

const url = process.env.API_FOOTBALL_BASE_URL || "url"


@Injectable()
export class OddsImportService {
  private readonly logger = new Logger(OddsImportService.name);
  private readonly afClient = new ApiFootballClient(url);

  constructor(private readonly prisma: PrismaService) {}

  /** DB -> AF_META */
  private async resolveAfLeagueId(codeRaw: string): Promise<number> {
    const code = (codeRaw ?? '').toUpperCase().trim();
    const comp = await this.prisma.competition.findFirst({ where: { code } });
    if (comp?.afLeagueId) return comp.afLeagueId;
    const meta = AF_META[code];
    if (meta?.afLeagueId) return meta.afLeagueId;
    throw new BadRequestException(`Unknown league code "${code}"`);
  }

  /** Parse 1X2 (Match Winner) : 1 row par bookmaker */
  private parse1x2Rows(node: any): Array<{ book: string; o1: number; oX: number; o2: number }> {
    const out: Array<{ book: string; o1: number; oX: number; o2: number }> = [];
    const books = node?.bookmakers ?? [];
    for (const b of books) {
      const bet = (b?.bets ?? []).find((x: any) => /^(match winner|1x2)$/i.test(x?.name ?? ''));
      if (!bet) continue;
      const vals = bet.values ?? [];
      const num = (v: any) => (v != null ? Number(v) : undefined);
      const find = (label: string) => vals.find((v: any) => v?.value === label)?.odd;

      const o1 = num(find('1') ?? find('Home'));
      const oX = num(find('X') ?? find('Draw'));
      const o2 = num(find('2') ?? find('Away'));
      if ([o1, oX, o2].every((n) => typeof n === 'number' && !Number.isNaN(n))) {
        out.push({ book: b.name, o1: o1 as number, oX: oX as number, o2: o2 as number });
      }
    }
    return out;
  }

  /** Appel odds par fixture avec fallbacks selon l’impl du client */
  private async fetchOddsByFixture(fixtureId: number): Promise<any> {
    const anyClient = this.afClient as any;
    if (typeof anyClient.odds === 'function') {
      return anyClient.odds({ fixture: fixtureId });
    }
    if (typeof anyClient.getOddsByFixture === 'function') {
      return anyClient.getOddsByFixture(fixtureId);
    }
    if (typeof anyClient.get === 'function') {
      return anyClient.get('odds', { fixture: fixtureId });
    }
    throw new Error('ApiFootballClient: no odds method available');
  }

  /**
   * Import PRÉ-MATCH odds *par fixture* (PAS de `days`).
   * - liste les prochains matches (DB) de la saison
   * - GET /odds?fixture={afFixtureId}
   * - insert 1 row Odds par bookmaker
   */
  async importUpcomingFromApiFootball(
    leagueCodeRaw: string,
    seasonYear: number,
    next?: number, // défaut 40
  ): Promise<ImportSummary> {
    const code = (leagueCodeRaw ?? '').toUpperCase().trim();
    if (!seasonYear || Number.isNaN(Number(seasonYear))) {
      throw new BadRequestException(`Invalid season year "${seasonYear}"`);
    }

    // Ligue + saison pour scoper la recherche de matches
    await this.resolveAfLeagueId(code); // validateur (même si on n’en a pas besoin ensuite)
    const comp = await this.prisma.competition.findFirst({ where: { code } });
    const seasonLabel = `${seasonYear}-${seasonYear + 1}`;
    const season = await this.prisma.season.findFirst({
      where: { competitionId: comp?.id, label: seasonLabel },
    });
    if (!season) {
      throw new BadRequestException(
        `Season not found for ${code} ${seasonYear}. Import fixtures first.`,
      );
    }

    const take = Math.max(next ?? 40, 1);
    const matches = await this.prisma.match.findMany({
      where: { seasonId: season.id, startsAt: { gte: new Date() } },
      orderBy: { startsAt: 'asc' },
      take,
    });

    let scanned = 0;
    let saved = 0;
    let skipped = 0;

    for (const m of matches) {
      if (!m.afFixtureId) { skipped++; continue; }

      const res = await this.fetchOddsByFixture(m.afFixtureId);
      const nodes: any[] = Array.isArray(res?.response) ? res.response : [];
      if (!nodes.length) continue;

      const rows = this.parse1x2Rows(nodes[0]); // on prend le 1er bloc
      scanned += rows.length;

      for (const r of rows) {
        await this.prisma.odds.create({
          data: {
            matchId: m.id,
            book: r.book,
            o1: r.o1,
            oX: r.oX,
            o2: r.o2,
            sampledAt: new Date(),
          },
        });
        saved++;
      }
    }

    return {
      provider: 'api-football',
      league: code,
      season: season.label,
      scannedOdds: scanned,
      rowsSaved: saved,
      skipped,
      mode: 'by-fixture',
    };
  }
}
