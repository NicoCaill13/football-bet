import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';

@Injectable()
export class TeamsService {
  constructor(private prisma: PrismaService) {}

  create(dto: CreateTeamDto) {
    return this.prisma.team.create({ data: dto });
  }

  findAll() {
    return this.prisma.team.findMany({ orderBy: { name: 'asc' } });
  }

  async findOne(id: number) {
    const team = await this.prisma.team.findUnique({ where: { id } });
    if (!team) throw new NotFoundException('Team not found');
    return team;
  }

  update(id: number, dto: UpdateTeamDto) {
    return this.prisma.team.update({ where: { id }, data: dto });
  }

  remove(id: number) {
    return this.prisma.team.delete({ where: { id } });
  }
}
