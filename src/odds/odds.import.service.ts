import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { ApiFootballClient } from 'src/import/providers/api-football.client';
import { toSlug } from "../common/slug.util";

type SaveOddsRow = { matchId: number; book: string; o1: number; oX: number; o2: number };

@Injectable()
export class OddsImportService {
  constructor(private prisma: PrismaService) {}

  private parse1X2(odds: any | null): Array<{ book: string; o1: number; oX: number; o2: number }> {
    if (!odds) return [];
    const out: Array<{ book: string; o1: number; oX: number; o2: number }> = [];
    for (const bm of odds.bookmakers ?? []) {
      const bet = bm.bets?.find((b: any) => /match winner|^1x2$/i.test(b.name));
      if (!bet) continue;
      let o1: number | undefined, oX: number | undefined, o2: number | undefined;
      for (const v of bet.values ?? []) {
        const key = String(v.value).toUpperCase();
        if (key === "HOME" || key === "1") o1 = Number(v.odd);
        else if (key === "DRAW" || key === "X") oX = Number(v.odd);
        else if (key === "AWAY" || key === "2") o2 = Number(v.odd);
      }
      if (typeof o1 === "number" && typeof oX === "number" && typeof o2 === "number") {
        out.push({ book: bm.name, o1, oX, o2 });
      }
    }
    return out;
  }

  private async findLocalMatchId(seasonId: number, homeName: string, awayName: string, isoDate: string) {
    const homeSlug = toSlug(homeName);
    const awaySlug = toSlug(awayName);
    const home = await this.prisma.team.findFirst({ where: { slug: homeSlug } });
    const away = await this.prisma.team.findFirst({ where: { slug: awaySlug } });
    if (!home || !away) return null;
    const t = new Date(isoDate).getTime();
    const tMin = new Date(t - 2 * 3600_000);
    const tMax = new Date(t + 2 * 3600_000);
    const m = await this.prisma.match.findFirst({
      where: { seasonId, homeTeamId: home.id, awayTeamId: away.id, startsAt: { gte: tMin, lte: tMax } },
      select: { id: true },
    });
    return m?.id ?? null;
  }

  private async saveOddsBatch(rows: SaveOddsRow[]) {
    for (const r of rows) {
      await this.prisma.odds.create({
        data: { matchId: r.matchId, book: r.book, o1: r.o1, oX: r.oX, o2: r.o2, sampledAt: new Date() },
      });
    }
  }

  async importUpcomingFromApiFootball(leagueCode: string, seasonYear: number, _next = 40, days?: number) {
    const key = process.env.API_FOOTBALL_KEY;
    if (!key) throw new NotFoundException("API_FOOTBALL_KEY manquant");

    const comp = await this.prisma.competition.findFirst({ where: { code: leagueCode } });
    if (!comp) throw new NotFoundException(`Competition locale introuvable: ${leagueCode}`);
    const leagueId = (comp as any).afLeagueId;
    if (!leagueId) throw new NotFoundException(`afLeagueId manquant pour ${leagueCode} — lance d'abord l'import fixtures.`);

    const seasonLabel = `${seasonYear}-${seasonYear + 1}`;
    const season = await this.prisma.season.findFirst({ where: { competitionId: comp.id, label: seasonLabel } });
    if (!season) throw new NotFoundException(`Season introuvable: ${leagueCode} ${seasonLabel}`);

    const api = new ApiFootballClient(key);

    const fmt = (d: Date) => d.toISOString().slice(0, 10);
    const today = new Date();
    const horizon = new Date(today.getTime() + (days ?? 30) * 86400000);
    const fromISO = fmt(today), toISO = fmt(horizon);

    let page = 1, totalPages = 1;
    let saved = 0, skipped = 0, scannedOdds = 0;

    do {
      const { results, paging } = await api.oddsRange(leagueId, seasonYear, fromISO, toISO, page);
      totalPages = paging?.total || 1;

      for (const o of results) {
        const fxId: number | undefined = o?.fixture?.id;
        if (!fxId) { skipped++; continue; }

        let match = await this.prisma.match.findUnique({ where: { afFixtureId: fxId } });
        if (!match) {
          const f = await api.fixtureById(fxId);
          if (f) {
            const mid = await this.findLocalMatchId(season.id, f.teams.home.name, f.teams.away.name, f.fixture.date);
            if (mid) {
              await this.prisma.match.update({ where: { id: mid }, data: { afFixtureId: fxId } });
              match = await this.prisma.match.findUnique({ where: { id: mid } });
            }
          }
        }
        if (!match) { skipped++; continue; }

        const rows = this.parse1X2(o).map(r => ({ matchId: match!.id, ...r }));
        if (rows.length) { await this.saveOddsBatch(rows); saved += rows.length; }
        scannedOdds++;
      }
      page++;
    } while (page <= totalPages);

    return { provider: "api-football", league: leagueCode, season: seasonLabel, scannedOdds, rowsSaved: saved, skipped, mode: "odds-range", window: { from: fromISO, to: toISO } };
  }
}
