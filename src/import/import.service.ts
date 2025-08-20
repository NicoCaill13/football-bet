import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { FootballDataClient } from "./providers/football-data.client";
import { toSlug } from "../common/slug.util";

@Injectable()
export class ImportService {
  constructor(private prisma: PrismaService) {}

  private seasonLabelFromYear(year: number) { return `${year}-${year + 1}`; }
  private titleCase(s?: string | null) {
    if (!s) return undefined;
    return s.toLowerCase().replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
  }

  private readonly FD_TO_LOCAL: Record<string,string> = {
    FL1: "L1",
    PL: "PL",
    SA: "SA",
    PD: "LL",
    BL1: "BUN",
   // Coupes nationales
    FAC: "FAC",
    ELC: "EFLC",
    CDF: "CDF",
    CDR: "CDR",
    DFB: "DFB",
   // Europe
    CL: "UCL",
    EL: "UEL",
    ECL: "UECL",
  };

  async importFromFootballData(fdCodeRaw: string, seasonYear: number) {
    const token = process.env.FOOTBALL_DATA_TOKEN;
    if (!token) throw new NotFoundException("FOOTBALL_DATA_TOKEN manquant");
    const fd = new FootballDataClient(token);

    const fdCode = fdCodeRaw.toUpperCase();
    const localCode = this.FD_TO_LOCAL[fdCode] ?? fdCode;

    // Trouver la compétition locale (par code local OU par code FD si identique)
    const comp = await this.prisma.competition.findFirst({
      where: { OR: [{ code: localCode }, { code: fdCode }] },
    });
    if (!comp) {
      throw new NotFoundException(`Competition introuvable pour code="${fdCode}" (code local attendu="${localCode}"). Seed Phase 3 requis.`);
    }

    const label = this.seasonLabelFromYear(seasonYear);
    let season = await this.prisma.season.findFirst({ where: { competitionId: comp.id, label } });
    if (!season) {
      season = await this.prisma.season.create({
        data: {
          competitionId: comp.id,
          label,
          startDate: new Date(`${seasonYear}-08-01`),
          endDate: new Date(`${seasonYear + 1}-06-30`),
        },
      });
    }

    const matches = await fd.matchesByCompetition(fdCode, seasonYear);

    let created = 0, updated = 0;
    for (const m of matches) {
      // Équipes (créées/MAJ si besoin)
      const homeSlug = toSlug(m.homeTeam.name);
      const awaySlug = toSlug(m.awayTeam.name);
      const home = await this.prisma.team.upsert({
        where: { slug: homeSlug },
        update: { name: m.homeTeam.name, country: comp.country ?? undefined },
        create: { slug: homeSlug, name: m.homeTeam.name, country: comp.country ?? undefined },
      });
      const away = await this.prisma.team.upsert({
        where: { slug: awaySlug },
        update: { name: m.awayTeam.name, country: comp.country ?? undefined },
        create: { slug: awaySlug, name: m.awayTeam.name, country: comp.country ?? undefined },
      });

      // Round (journée ou nom de stage)
      const roundName = m.matchday ? `Matchday ${m.matchday}` : (this.titleCase(m.stage) ?? "Round");
      let round = await this.prisma.round.findFirst({
        where: { seasonId: season.id, name: roundName, leg: null },
      });
      if (!round) {
        round = await this.prisma.round.create({
          data: { seasonId: season.id, name: roundName, leg: null, roundNo: m.matchday ?? undefined },
        });
      }

      // Id externe football-data
      const extId = `FD-${m.id}`;

      // Upsert match (on s'appuie sur extId @unique)
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
      } as const;

      const existing = await this.prisma.match.findUnique({ where: { extId } });
      if (existing) {
        await this.prisma.match.update({ where: { id: existing.id }, data });
        updated++;
      } else {
        await this.prisma.match.create({ data });
        created++;
      }
    }

    return { provider: "football-data", fdCode, competition: comp.name, season: label, total: matches.length, created, updated };
  }
}

