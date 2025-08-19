import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { FootballDataClient } from "./providers/football-data.client";
import { toSlug } from "../common/slug.util";

@Injectable()
export class ImportService {
  constructor(private prisma: PrismaService) {}

  private seasonLabelFromYear(year: number) { return `${year}-${year + 1}`; }

  async importLigue1FromFootballData(seasonYear: number) {
    const token = process.env.FOOTBALL_DATA_TOKEN;
    if (!token) throw new NotFoundException("FOOTBALL_DATA_TOKEN manquant");
    const fd = new FootballDataClient(token);

    // On cible notre Competition "Ligue 1" déjà seedée (code interne "L1")
    const comp = await this.prisma.competition.findFirst({ where: { code: "L1" } });
    if (!comp) throw new NotFoundException("Competition L1 introuvable (seed Phase 3?)");

    // Saison cible (ex: "2025-2026")
    const label = this.seasonLabelFromYear(seasonYear);
    let season = await this.prisma.season.findFirst({ where: { competitionId: comp.id, label } });
    if (!season) {
      season = await this.prisma.season.create({
        data: { competitionId: comp.id, label, startDate: new Date(`${seasonYear}-08-01`), endDate: new Date(`${seasonYear+1}-06-30`) }
      });
    }

    const matches = await fd.matchesByCompetition("FL1", seasonYear);

    let created = 0, updated = 0, skipped = 0;
    for (const m of matches) {
      // Teams
      const homeSlug = toSlug(m.homeTeam.name);
      const awaySlug = toSlug(m.awayTeam.name);

      const home = await this.prisma.team.upsert({
        where: { slug: homeSlug },
        update: { name: m.homeTeam.name },
        create: { slug: homeSlug, name: m.homeTeam.name, country: "FR" },
      });
      const away = await this.prisma.team.upsert({
        where: { slug: awaySlug },
        update: { name: m.awayTeam.name },
        create: { slug: awaySlug, name: m.awayTeam.name, country: "FR" },
      });

      // Round / Matchday
      const roundName = m.matchday ? `Matchday ${m.matchday}` : "Matchday ?";

        let round = await this.prisma.round.findFirst({
    where: { seasonId: season.id, name: roundName, leg: null },
  });
  if (!round) {
    round = await this.prisma.round.create({
      data: {
        seasonId: season.id,
        name: roundName,
        leg: null,                      // ligue = pas d'aller/retour à ce niveau de "Round"
        roundNo: m.matchday ?? undefined,
      },
    });
  }

      // Idempotence via extId = "FD-{matchId}"
      const extId = `FD-${m.id}`;

      // Existe déjà ?
      const existing = await this.prisma.match.findUnique({ where: { extId } });

      const data = {
        seasonId: season.id,
        competitionId: comp.id,
        roundId: round.id,
        homeTeamId: home.id,
        awayTeamId: away.id,
        startsAt: new Date(m.utcDate),
        status: (m.status ?? "SCHEDULED").toLowerCase(),
        venue: m.venue ?? undefined,
        extId,
      };

      if (existing) {
        await this.prisma.match.update({ where: { id: existing.id }, data });
        updated++;
      } else {
        await this.prisma.match.create({ data });
        created++;
      }
    }

    return { provider: "football-data", competition: "Ligue 1", season: label, total: matches.length, created, updated, skipped };
  }
}

