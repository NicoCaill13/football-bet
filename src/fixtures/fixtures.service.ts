import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateFixtureDto } from "./dto/create-fixture.dto";
import { RescheduleDto } from "./dto/reschedule.dto";
import { PostponeDto } from "./dto/postpone.dto";
import { CancelDto } from "./dto/cancel.dto";
import { UpdateVenueDto } from "./dto/update-venue.dto";

@Injectable()
export class FixturesService {
  constructor(private prisma: PrismaService) {}

  async createFixture(dto: CreateFixtureDto) {
    if (dto.homeTeamId === dto.awayTeamId) {
      throw new Error("homeTeamId cannot equal awayTeamId");
    }

    // Récup competition depuis la saison (pour filtrage ultérieur)
    const season = await this.prisma.season.findUnique({ where: { id: dto.seasonId }, include: { competition: true } });
    if (!season) throw new NotFoundException("Season not found");

    const match = await this.prisma.match.create({
      data: {
        seasonId: dto.seasonId,
        competitionId: season.competitionId,
        roundId: dto.roundId,
        homeTeamId: dto.homeTeamId,
        awayTeamId: dto.awayTeamId,
        startsAt: new Date(dto.startsAt),
        venue: dto.venue,
        status: "scheduled",
      },
      include: { homeTeam: true, awayTeam: true, competition: true, season: true, round: true },
    });
    return match;
  }

  getFixture(id: number) {
    return this.prisma.match.findUnique({
      where: { id },
      include: { homeTeam: true, awayTeam: true, competition: true, season: true, round: true },
    });
  }

  listCompetitionFixtures(competitionId: number) {
    return this.prisma.match.findMany({
      where: { competitionId },
      orderBy: { startsAt: "asc" },
      include: { homeTeam: true, awayTeam: true, round: true, season: true },
    });
  }

  listSeasonFixtures(seasonId: number) {
    return this.prisma.match.findMany({
      where: { seasonId },
      orderBy: { startsAt: "asc" },
      include: { homeTeam: true, awayTeam: true, round: true, competition: true },
    });
  }

  async reschedule(id: number, dto: RescheduleDto) {
    const m = await this.prisma.match.findUnique({ where: { id } });
    if (!m) throw new NotFoundException("Fixture not found");

    const prevStartsAt = m.startsAt;
    const newStartsAt = new Date(dto.newStartsAt);

    const updated = await this.prisma.match.update({
      where: { id },
      data: { startsAt: newStartsAt, status: "rescheduled" },
    });

    await this.prisma.fixtureChangeLog.create({
      data: {
        matchId: id,
        changeType: "reschedule",
        prevStartsAt,
        newStartsAt,
        reason: dto.reason,
        sourceUrl: dto.sourceUrl,
      },
    });

    return updated;
  }

  async postpone(id: number, dto: PostponeDto) {
    const m = await this.prisma.match.findUnique({ where: { id } });
    if (!m) throw new NotFoundException("Fixture not found");

    const updated = await this.prisma.match.update({
      where: { id },
      data: { status: "postponed" },
    });

    await this.prisma.fixtureChangeLog.create({
      data: {
        matchId: id,
        changeType: "postpone",
        prevStartsAt: m.startsAt,
        reason: dto.reason,
        sourceUrl: dto.sourceUrl,
      },
    });

    return updated;
  }

  async cancel(id: number, dto: CancelDto) {
    const m = await this.prisma.match.findUnique({ where: { id } });
    if (!m) throw new NotFoundException("Fixture not found");

    const updated = await this.prisma.match.update({
      where: { id },
      data: { status: "canceled" },
    });

    await this.prisma.fixtureChangeLog.create({
      data: {
        matchId: id,
        changeType: "cancel",
        prevStartsAt: m.startsAt,
        reason: dto.reason,
        sourceUrl: dto.sourceUrl,
      },
    });

    return updated;
  }

  async changeVenue(id: number, dto: UpdateVenueDto) {
    const m = await this.prisma.match.findUnique({ where: { id } });
    if (!m) throw new NotFoundException("Fixture not found");

    const updated = await this.prisma.match.update({
      where: { id },
      data: { venue: dto.venue },
    });

    await this.prisma.fixtureChangeLog.create({
      data: {
        matchId: id,
        changeType: "venue",
        prevVenue: m.venue ?? undefined,
        newVenue: dto.venue,
        reason: dto.reason,
      },
    });

    return updated;
  }

  changeLog(id: number) {
    return this.prisma.fixtureChangeLog.findMany({ where: { matchId: id }, orderBy: { createdAt: "desc" } });
  }
}

