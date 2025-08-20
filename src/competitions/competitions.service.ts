import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { CreateCompetitionDto } from "./dto/create-competition.dto";
import { CreateSeasonDto } from "./dto/create-season.dto";
import { CreateRoundDto } from "./dto/create-round.dto";

@Injectable()
export class CompetitionsService {
  constructor(private readonly prisma: PrismaService) {}

  createCompetition(dto: CreateCompetitionDto) {
    const data: Prisma.CompetitionCreateInput = {
      name: dto.name,
      code: dto.code ?? null,
      country: dto.country ?? null,
      type: dto.type as any, // ✅ littéral "league" | "cup" | "europe"
      organizer: dto.organizer ?? null,
    };
    return this.prisma.competition.create({ data });
  }

  listCompetitions() {
    return this.prisma.competition.findMany({ orderBy: { name: "asc" } });
  }

  createSeason(dto: CreateSeasonDto) {
    return this.prisma.season.create({
      data: {
        competition: { connect: { id: dto.competitionId } },
        label: dto.label,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        ...(dto.afSeasonYear !== undefined ? { afSeasonYear: dto.afSeasonYear } : {}),
      },
    });
  }

  listSeasons(competitionId: number) {
    return this.prisma.season.findMany({ where: { competitionId }, orderBy: { id: "desc" } });
  }

  createRound(dto: CreateRoundDto) {
    const data: Prisma.RoundUncheckedCreateInput = {
      seasonId: dto.seasonId,
      name: dto.name ?? (dto.roundNo ? `Matchday ${dto.roundNo}` : "Round"),
      roundNo: dto.roundNo ?? null,
      leg: dto.leg ?? null,
    };
    return this.prisma.round.create({ data });
  }

  listRounds(seasonId: number) {
    return this.prisma.round.findMany({
      where: { seasonId },
      orderBy: [{ roundNo: "asc" }, { id: "asc" }],
    });
  }
}
