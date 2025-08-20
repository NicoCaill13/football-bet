import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { RescheduleDto } from "./dto/reschedule.dto";
import { PostponeDto } from "./dto/postpone.dto";
import { CancelDto } from "./dto/cancel.dto";
import { UpdateVenueDto } from "./dto/update-venue.dto";

export type CreateFixtureDto = {
  seasonId: number;
  homeTeamId: number;
  awayTeamId: number;
  startsAt: string;
  competitionId?: number;
  roundId?: number;
  status?: string;
  venue?: string;
  afFixtureId?: number;
};

@Injectable()
export class FixturesService {
  constructor(private readonly prisma: PrismaService) {}

  /** ====== Implémentations principales ====== */

  async create(dto: CreateFixtureDto) {
    return this.prisma.match.create({
      data: {
        season: { connect: { id: dto.seasonId } },
        homeTeam: { connect: { id: dto.homeTeamId } },
        awayTeam: { connect: { id: dto.awayTeamId } },
        startsAt: new Date(dto.startsAt),
        status: dto.status ?? "scheduled",
        venue: dto.venue ?? undefined,
        ...(dto.roundId ? { round: { connect: { id: dto.roundId } } } : {}),
        ...(dto.competitionId ? { competition: { connect: { id: dto.competitionId } } } : {}),
        ...(dto.afFixtureId ? { afFixtureId: dto.afFixtureId } : {}),
      },
      include: { homeTeam: true, awayTeam: true, competition: true, season: true, round: true },
    });
  }

  async get(id: number) {
    return this.prisma.match.findUnique({
      where: { id },
      include: { homeTeam: true, awayTeam: true, competition: true, season: true, round: true },
    });
  }

  async byCompetition(competitionId: number) {
    return this.prisma.match.findMany({
      where: { competitionId },
      orderBy: { startsAt: "asc" },
      include: { homeTeam: true, awayTeam: true, round: true, season: true },
    });
  }

  async bySeason(seasonId: number) {
    return this.prisma.match.findMany({
      where: { seasonId },
      orderBy: { startsAt: "asc" },
      include: { homeTeam: true, awayTeam: true, round: true, competition: true },
    });
  }

  async logReschedule(matchId: number, from: Date, to: Date, note?: string) {
    await this.prisma.fixtureChangeLog.create({ data: { matchId, type: "reschedule", from, to, note } });
    return { ok: true };
  }
  async logPostpone(matchId: number, from: Date, note?: string) {
    await this.prisma.fixtureChangeLog.create({ data: { matchId, type: "postpone", from, note } });
    return { ok: true };
  }
  async logCancel(matchId: number, from: Date, note?: string) {
    await this.prisma.fixtureChangeLog.create({ data: { matchId, type: "cancel", from, note } });
    return { ok: true };
  }
  async logVenueChange(matchId: number, note?: string) {
    await this.prisma.fixtureChangeLog.create({ data: { matchId, type: "venue", note } });
    return { ok: true };
  }

  async history(matchId: number) {
    return this.prisma.fixtureChangeLog.findMany({ where: { matchId }, orderBy: { createdAt: "desc" } });
  }

  /** ====== Wrappers attendus par le controller ====== */

  createFixture(dto: CreateFixtureDto) { return this.create(dto); }
  getFixture(id: number) { return this.get(id); }
  listCompetitionFixtures(competitionId: number) { return this.byCompetition(competitionId); }
  listSeasonFixtures(seasonId: number) { return this.bySeason(seasonId); }

  reschedule(id: number, dto: RescheduleDto) {
    return this.logReschedule(id, new Date(dto.from), new Date(dto.to), dto.note);
  }
  postpone(id: number, dto: PostponeDto) {
    return this.logPostpone(id, new Date(dto.from), dto.note);
  }
  cancel(id: number, dto: CancelDto) {
    return this.logCancel(id, new Date(dto.from), dto.note);
  }
  changeVenue(id: number, dto: UpdateVenueDto) {
    return this.logVenueChange(id, dto.note);
  }
  changeLog(id: number) {
    return this.history(id);
  }
}
