import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { ApiFootballClient } from 'src/common/api-football.client';
import { toSlug } from "../common/slug.util";


type CompetitionTypeValue = "league" | "cup" | "europe";

export const AF_META: Record<string, { afLeagueId: number; name: string; country?: string; type: CompetitionTypeValue }> = {
  L1:  { afLeagueId: 61,  name: "Ligue 1",                        country: "FR", type: "league" },
  PL:  { afLeagueId: 39,  name: "Premier League",                 country: "GB", type: "league" },
  SA:  { afLeagueId: 135, name: "Serie A",                        country: "IT", type: "league" },
  LL:  { afLeagueId: 140, name: "LaLiga",                         country: "ES", type: "league" },
  BUN: { afLeagueId: 78,  name: "Bundesliga",                     country: "DE", type: "league" },
  UCL: { afLeagueId: 2,   name: "UEFA Champions League",                          type: "cup"    },
  UEL: { afLeagueId: 3,   name: "UEFA Europa League",                             type: "cup"    },
  UECL:{ afLeagueId: 848, name: "UEFA Europa Conference League",                  type: "cup"    },
};


@Injectable()
export class AfImportService {
  constructor(private prisma: PrismaService) {}

  private seasonLabel(year: number) { return `${year}-${year + 1}`; }
  private parseRoundName(s?: string | null) {
    if (!s) return undefined;
    const m = s.match(/(\d+)/);
    return m ? `Matchday ${m[1]}` : s.replace(/_/g, " ");
  }

  async importLeagueSeason(leagueCode: string, seasonYear: number) {
    const key = process.env.API_FOOTBALL_KEY;
    if (!key) throw new NotFoundException("API_FOOTBALL_KEY manquant");
    const api = new ApiFootballClient(key);

    const meta = AF_META[leagueCode];
    if (!meta) throw new NotFoundException(`Aucun mapping meta pour "${leagueCode}"`);
    const leagueId = meta.afLeagueId;

    // Competition (création auto si absente)
    let comp = await this.prisma.competition.findFirst({ where: { code: leagueCode } });
    if (!comp) {
      comp = await this.prisma.competition.create({
        data: {
          code: leagueCode,
          name: meta.name,
          country: meta.country,
          type: meta.type,       
          afLeagueId: leagueId,
        },
      });
    } else if ((comp as any).afLeagueId == null) {
      comp = await this.prisma.competition.update({
        where: { id: comp.id },
        data: { afLeagueId: leagueId },
      });
    }

    // Saison
    const label = this.seasonLabel(seasonYear);
    let season = await this.prisma.season.findFirst({ where: { competitionId: comp.id, label } });
    if (!season) {
      season = await this.prisma.season.create({
        data: {
          competitionId: comp.id,
          label,
          afSeasonYear: seasonYear,
          startDate: new Date(`${seasonYear}-07-01`),
          endDate: new Date(`${seasonYear + 1}-06-30`),
        },
      });
    }

    // Teams
    const teams = await api.teams(leagueId, seasonYear);
    for (const t of teams) {
      const slug = toSlug(t.team.name);
      await this.prisma.team.upsert({
        where: { slug },
        update: { name: t.team.name, country: t.team.country ?? undefined, afTeamId: t.team.id },
        create: { slug, name: t.team.name, country: t.team.country ?? undefined, afTeamId: t.team.id },
      });
    }

    // Fixtures
    const fixtures = await api.fixturesSeason(leagueId, seasonYear);
    let created = 0, updated = 0;

    for (const f of fixtures) {
      const home = await this.prisma.team.findFirst({ where: { afTeamId: f.teams.home.id } });
      const away = await this.prisma.team.findFirst({ where: { afTeamId: f.teams.away.id } });
      if (!home || !away) continue;

      const roundName = this.parseRoundName(f.league.round) ?? undefined;
      let roundId: number | undefined;
      if (roundName) {
        let round = await this.prisma.round.findFirst({ where: { seasonId: season.id, name: roundName, leg: null } });
        if (!round) round = await this.prisma.round.create({ data: { seasonId: season.id, name: roundName, leg: null } });
        roundId = round.id;
      }

      const status = (f.fixture.status?.short ?? "NS").toLowerCase();
      const venue = f.fixture.venue?.name ?? undefined;

      const existing = await this.prisma.match.findUnique({ where: { afFixtureId: f.fixture.id } });
      const data = {
        competitionId: comp.id,
        seasonId: season.id,
        roundId,
        homeTeamId: home.id,
        awayTeamId: away.id,
        startsAt: new Date(f.fixture.date),
        status,
        venue,
        afFixtureId: f.fixture.id,
      } as const;

      if (existing) { await this.prisma.match.update({ where: { id: existing.id }, data }); updated++; }
      else          { await this.prisma.match.create({ data });                                created++; }
    }

    return { provider: "api-football", league: leagueCode, season: label, fixtures: fixtures.length, created, updated };
  }
}
