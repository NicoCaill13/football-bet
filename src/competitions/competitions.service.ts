import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateCompetitionDto } from "./dto/create-competition.dto";
import { CreateSeasonDto } from "./dto/create-season.dto";
import { CreateRoundDto } from "./dto/create-round.dto";

@Injectable()
export class CompetitionsService {
  constructor(private prisma: PrismaService) {}

  createCompetition(dto: CreateCompetitionDto) {
    return this.prisma.competition.create({ data: dto });
  }

  listCompetitions() {
    return this.prisma.competition.findMany({ orderBy: { name: "asc" } });
  }

  createSeason(dto: CreateSeasonDto) {
    return this.prisma.season.create({
      data: {
        competitionId: dto.competitionId,
        label: dto.label,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      },
    });
  }

  listSeasons(competitionId: number) {
    return this.prisma.season.findMany({ where: { competitionId }, orderBy: { id: "desc" } });
  }

  async createRound(dto: CreateRoundDto) {
    const s = await this.prisma.season.findUnique({ where: { id: dto.seasonId } });
    if (!s) throw new NotFoundException("Season not found");
    return this.prisma.round.create({
      data: {
        seasonId: dto.seasonId,
        name: dto.name,
        roundNo: dto.roundNo,
        stage: dto.stage,
        leg: dto.leg,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      },
    });
  }

  listRounds(seasonId: number) {
    return this.prisma.round.findMany({ where: { seasonId }, orderBy: [{ roundNo: "asc" }, { id: "asc" }] });
  }
}

