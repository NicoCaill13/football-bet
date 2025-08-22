import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpsertEloDto } from './dto/upsert-elo.dto';

@Injectable()
export class EloService {
  constructor(private prisma: PrismaService) {}

  async upsert(dto: UpsertEloDto) {
    let teamId = dto.teamId;
    if (!teamId && dto.teamSlug) {
      const t = await this.prisma.team.findUnique({
        where: { slug: dto.teamSlug },
      });
      if (!t) throw new NotFoundException('Team not found by slug');
      teamId = t.id;
    }
    if (!teamId) throw new NotFoundException('teamSlug or teamId required');

    const rec = await this.prisma.eloRating.create({
      data: {
        teamId: teamId,
        rating: dto.rating,
        source: dto.source ?? 'manual',
      },
    });
    return rec;
  }

  latest(teamId: number) {
    return this.prisma.eloRating.findFirst({
      where: { teamId },
      orderBy: { ratedAt: 'desc' },
    });
  }
}
