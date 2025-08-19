import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateMatchDto } from "./dto/create-match.dto";
import { UpdateMatchDto } from "./dto/update-match.dto";

@Injectable()
export class MatchesService {
  constructor(private prisma: PrismaService) {}

  create(dto: CreateMatchDto) {
    return this.prisma.match.create({
      data: {
        homeTeamId: dto.homeTeamId,
        awayTeamId: dto.awayTeamId,
        startsAt: new Date(dto.startsAt),
        competition: dto.competition,
        venue: dto.venue,
      },
    });
  }

  findAll() {
    return this.prisma.match.findMany({
      orderBy: { startsAt: "asc" },
      include: { homeTeam: true, awayTeam: true, odds: true, weather: true },
    });
  }

  async findOne(id: number) {
    const match = await this.prisma.match.findUnique({
      where: { id },
      include: { homeTeam: true, awayTeam: true, odds: true, weather: true },
    });
    if (!match) throw new NotFoundException("Match not found");
    return match;
  }

  update(id: number, dto: UpdateMatchDto) {
    return this.prisma.match.update({
      where: { id },
      data: {
        homeTeamId: dto.homeTeamId,
        awayTeamId: dto.awayTeamId,
        startsAt: dto.startsAt ? new Date(dto.startsAt) : undefined,
        competition: dto.competition,
        venue: dto.venue,
      },
    });
  }

  remove(id: number) {
    return this.prisma.match.delete({ where: { id } });
  }
}