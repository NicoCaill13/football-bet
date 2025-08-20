import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, Match } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { CreateMatchDto } from "./dto/create-match.dto";
import { UpdateMatchDto } from "./dto/update-match.dto";

@Injectable()
export class MatchesService {
  constructor(private readonly prisma: PrismaService) {}

  private async resolveCompetitionId(input: { competitionId?: number; competition?: string | null; }) {
    if (typeof input.competitionId === "number") return input.competitionId;
    if (input.competition && input.competition.trim()) {
      const comp = await this.prisma.competition.findFirst({
        where: { OR: [{ code: input.competition }, { name: input.competition }] },
        select: { id: true },
      });
      if (!comp) throw new NotFoundException(`Competition introuvable: ${input.competition}`);
      return comp.id;
    }
    return undefined;
  }

  async create(dto: CreateMatchDto): Promise<Match> {
    const competitionId = await this.resolveCompetitionId(dto);
    const data: Prisma.MatchUncheckedCreateInput = {
      homeTeamId: dto.homeTeamId,
      awayTeamId: dto.awayTeamId,
      startsAt: new Date(dto.startsAt),
      status: dto.status ?? "scheduled",
      venue: dto.venue ?? null,
      ...(competitionId !== undefined ? { competitionId } : {}),
      ...(dto.seasonId !== undefined ? { seasonId: dto.seasonId } : {}),
      ...(dto.roundId !== undefined ? { roundId: dto.roundId } : {}),
      ...(dto.afFixtureId !== undefined ? { afFixtureId: dto.afFixtureId } : {}),
    };
    return this.prisma.match.create({ data });
  }

  async update(id: number, dto: UpdateMatchDto): Promise<Match> {
    let competitionId: number | undefined = undefined;
    if (dto.competitionId !== undefined || (dto.competition && dto.competition.trim())) {
      competitionId = await this.resolveCompetitionId(dto);
    }
    const data: Prisma.MatchUncheckedUpdateInput = {
      ...(competitionId !== undefined ? { competitionId } : {}),
      ...(dto.seasonId !== undefined ? { seasonId: dto.seasonId } : {}),
      ...(dto.roundId !== undefined ? { roundId: dto.roundId } : {}),
      ...(dto.homeTeamId !== undefined ? { homeTeamId: dto.homeTeamId } : {}),
      ...(dto.awayTeamId !== undefined ? { awayTeamId: dto.awayTeamId } : {}),
      ...(dto.startsAt ? { startsAt: new Date(dto.startsAt) } : {}),
      ...(dto.status ? { status: dto.status } : {}),
      ...(dto.venue !== undefined ? { venue: dto.venue } : {}),
      ...(dto.afFixtureId !== undefined ? { afFixtureId: dto.afFixtureId } : {}),
    };
    return this.prisma.match.update({ where: { id }, data });
  }

  findOne(id: number) { return this.prisma.match.findUnique({ where: { id } }); }
  findAll() { return this.prisma.match.findMany({ orderBy: { startsAt: "asc" } }); }
  remove(id: number) { return this.prisma.match.delete({ where: { id } }); }
}
