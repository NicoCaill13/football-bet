import { Controller, Get, Post, Query } from "@nestjs/common";
import { ApiOkResponse, ApiOperation, ApiQuery, ApiTags } from "@nestjs/swagger";
import { OddsImportService } from "./odds.import.service";
import { PrismaService } from "../prisma/prisma.service";

@ApiTags("Odds")
@Controller("odds")
export class OddsUpcomingController {
  constructor(private readonly importer: OddsImportService, private readonly prisma: PrismaService) {}

  @Post("import/upcoming")
  @ApiOperation({ summary: "Import cotes 1X2 des prochains matchs (API-FOOTBALL)" })
  @ApiQuery({ name: "league", example: "L1" })
  @ApiQuery({ name: "season", example: 2025 })
  @ApiQuery({ name: "next", required: false, example: 40 })
  @ApiQuery({ name: "days", required: false, example: 30 })
  importUpcoming(@Query("league") league: string, @Query("season") season: string, @Query("next") next?: string, @Query("days") days?: string) {
    return this.importer.importUpcomingFromApiFootball(league, Number(season), next ? Number(next) : 40, days ? Number(days) : undefined);
  }

  @Get("upcoming")
  @ApiOperation({ summary: "Prochains matchs d'une ligue + meilleures cotes" })
  @ApiQuery({ name: "league", example: "L1" })
  @ApiQuery({ name: "season", example: 2025 })
  @ApiQuery({ name: "limit", required: false, example: 20 })
  @ApiOkResponse({ type: Object, isArray: true })
  async upcomingWithOdds(@Query("league") league: string, @Query("season") season: string, @Query("limit") limit = "20") {
    const comp = await this.prisma.competition.findFirst({ where: { code: league } });
    if (!comp) return [];
    const seasonLabel = `${Number(season)}-${Number(season) + 1}`;
    const s = await this.prisma.season.findFirst({ where: { competitionId: comp.id, label: seasonLabel } });
    if (!s) return [];

    const matches = await this.prisma.match.findMany({
      where: { seasonId: s.id, startsAt: { gte: new Date() } },
      orderBy: { startsAt: "asc" },
      take: Number(limit),
      include: { homeTeam: true, awayTeam: true, round: true },
    });

    const out = [];
    for (const m of matches) {
      const last = await this.prisma.odds.findMany({
        where: { matchId: m.id },
        orderBy: { sampledAt: "desc" },
        take: 50,
      });
      const best = (field: "o1" | "oX" | "o2") => {
        let v = 0, book: string | undefined;
        for (const row of last) {
          const x = row[field];
          if (x && x > v) { v = x; book = row.book; }
        }
        return v ? { odd: v, book } : null;
      };
      out.push({
        id: m.id,
        league,
        round: m.round?.name ?? null,
        startsAt: m.startsAt,
        home: m.homeTeam.name,
        away: m.awayTeam.name,
        best: { "1": best("o1"), "X": best("oX"), "2": best("o2") },
      });
    }
    return out;
  }
}
