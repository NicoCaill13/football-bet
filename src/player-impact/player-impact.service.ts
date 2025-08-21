import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { ApiFootballClient } from 'src/common/api-football.client';
import { AF_META } from 'src/import/af-import.service'; // adapte si ton export est ailleurs

function parseSpanKey(v: string | undefined, defKey = '10') {
  if (!v) return defKey;
  const m = String(v).match(/^(\d+)/);
  return m ? m[1] : defKey;
}
function numEnv(name: string, def: number) {
  const n = Number(process.env[name]);
  return Number.isFinite(n) ? n : def;
}

@Injectable()
export class PlayerImpactService {
  private readonly log = new Logger(PlayerImpactService.name);

  private readonly W_MIN = numEnv('IMPACT_WEIGHT_MINUTES', 0.55);
  private readonly W_STA = numEnv('IMPACT_WEIGHT_STARTS', 0.15);
  private readonly W_GI  = numEnv('IMPACT_WEIGHT_GOALINV', 0.30);
  private readonly SPAN  = parseSpanKey(process.env.PLAYER_IMPACT_SPAN, '10');

  constructor(
    private readonly prisma: PrismaService,
    private readonly af: ApiFootballClient,
  ) {}

  async buildLeagueSeasonImpact(leagueCode: string, seasonYear: number) {
    const meta = AF_META[leagueCode];
    if (!meta) throw new Error(`Unknown leagueCode ${leagueCode}`);
    const leagueId = meta.afLeagueId;
    const seasonLabel = String(seasonYear);
  
    // 0) Résoudre competition + season
    const comp = await this.prisma.competition.findFirst({ where: { code: leagueCode } });
    if (!comp) throw new Error(`Competition not found for code=${leagueCode}`);
  
    const yearStr = String(seasonYear);
    const labelYear = yearStr;
    const labelSpan = `${seasonYear}-${seasonYear + 1}`;
  
    const season = await this.prisma.season.findFirst({
      where: {
        competitionId: comp.id,
        OR: [
          { label: labelYear },
          { label: labelSpan },
          { label: { startsWith: yearStr } },
          // enlève cette ligne si ton modèle Season n'a pas ce champ :
          { afSeasonYear: seasonYear as any },
        ],
      },
      orderBy: { id: 'desc' },
    });
    if (!season) {
      throw new Error(`Season not found for ${leagueCode} ${seasonYear}`);
    }
    const seasonId = season.id;
  
    // 1) ⚠️ NOUVEAU: on dérive les équipes à partir des matches de la saison en DB
    const matches = await this.prisma.match.findMany({
      where: { round: { seasonId } },          // on passe par Round -> Season
      select: { homeTeamId: true, awayTeamId: true },
    });
  
    const teamIdSet = new Set<number>();
    for (const m of matches) {
      if (m.homeTeamId) teamIdSet.add(m.homeTeamId);
      if (m.awayTeamId) teamIdSet.add(m.awayTeamId);
    }
    const teamIds = Array.from(teamIdSet);
    if (teamIds.length === 0) {
      this.log.warn(`Aucun match pour seasonId=${seasonId} — rien à faire`);
      return {
        league: leagueCode,
        season: labelSpan,
        seasonId,
        span: this.SPAN,
        playersTouched: 0,
        impactsUpserted: 0,
      };
    }
  
    // récupère les équipes (avec afTeamId pour l’API)
    const teamsDb = await this.prisma.team.findMany({
      where: { id: { in: teamIds } },
      select: { id: true, afTeamId: true, name: true },
    });
  
    const teamsWithAf = teamsDb.filter(t => t.afTeamId != null) as Array<{ id: number; afTeamId: number; name: string }>;
    if (teamsWithAf.length === 0) {
      this.log.warn(`Aucune équipe avec afTeamId pour seasonId=${seasonId}`);
      return {
        league: leagueCode,
        season: labelSpan,
        seasonId,
        span: this.SPAN,
        playersTouched: 0,
        impactsUpserted: 0,
      };
    }
  
    let playersTouched = 0;
    let impactsUpserted = 0;
  
    for (const team of teamsWithAf) {
      // 2) Squad -> Player + TeamPlayerSeason
      const squadRes = await this.af.playersSquad({ team: team.afTeamId });
      const players = (squadRes?.response?.[0]?.players || []) as any[];
  
      for (const p of players) {
        const player = await this.prisma.player.upsert({
          where: { afPlayerId: p.id },
          update: {
            name: p.name,
            position: p.position ?? undefined,
            nationality: p.nationality ?? undefined,
          },
          create: {
            afPlayerId: p.id,
            name: p.name,
            position: p.position ?? undefined,
            nationality: p.nationality ?? undefined,
          },
        });
        playersTouched++;
  
        await this.prisma.teamPlayerSeason.upsert({
          where: { teamId_playerId_seasonId: { teamId: team.id, playerId: player.id, seasonId } },
          update: {},
          create: { teamId: team.id, playerId: player.id, seasonId },
        });
      }
  
      // 3) Stats players (minutes, starts, goal involvement = goals+assists)
      let page = 1;
      const totMin = new Map<number, number>(); // afPlayerId -> minutes
      const totSta = new Map<number, number>(); // afPlayerId -> starts
      const totGI  = new Map<number, number>(); // afPlayerId -> goals+assists
  
      while (true) {
        const statsRes = await this.af.players(team.afTeamId, leagueId, seasonYear, page);
        const items = statsRes?.response ?? [];
        for (const it of items) {
          const afPid = it?.player?.id;
          if (!afPid) continue;
          const minute  = Number(it?.statistics?.[0]?.games?.minutes ?? 0) || 0;
          const starts  = Number(it?.statistics?.[0]?.games?.lineups ?? 0) || 0;
          const goals   = Number(it?.statistics?.[0]?.goals?.total ?? 0) || 0;
          const assists = Number(it?.statistics?.[0]?.goals?.assists ?? 0) || 0;
          const gi = goals + assists;
  
          totMin.set(afPid, (totMin.get(afPid) ?? 0) + minute);
          totSta.set(afPid, (totSta.get(afPid) ?? 0) + starts);
          totGI.set(afPid,  (totGI.get(afPid)  ?? 0) + gi);
        }
        const cur = statsRes?.paging?.current ?? 1;
        const total = statsRes?.paging?.total ?? 1;
        if (cur >= total) break;
        page++;
        if (page > 50) break; // garde-fou
      }
  
      // map afPlayerId -> Player.id
      const afIds = Array.from(new Set([...totMin.keys(), ...totSta.keys(), ...totGI.keys()])) as number[];
      if (afIds.length === 0) continue;
      const playersDb = await this.prisma.player.findMany({ where: { afPlayerId: { in: afIds } } });
      const pidMap = new Map<number, number>(); // afPid -> playerId
      for (const pl of playersDb) if (pl.afPlayerId != null) pidMap.set(pl.afPlayerId, pl.id);
  
      // Normalisation
      const spanN = Number(this.SPAN);
      const MAX_MIN = 90 * spanN;
      const MAX_STA = spanN;
  
      let maxGI = 0;
      for (const v of totGI.values()) maxGI = Math.max(maxGI, v || 0);
      const GI_DEN = Math.max(1, maxGI || 1);
  
      for (const [afPid, minutes] of totMin.entries()) {
        const starts = totSta.get(afPid) ?? 0;
        const gi = totGI.get(afPid) ?? 0;
  
        const nMin = Math.min(1, (minutes || 0) / MAX_MIN);
        const nSta = Math.min(1, (starts  || 0) / MAX_STA);
        const nGI  = Math.min(1, (gi      || 0) / GI_DEN);
  
        const impact = Math.max(0, Math.min(1, this.W_MIN * nMin + this.W_STA * nSta + this.W_GI * nGI));
  
        const playerId = pidMap.get(afPid);
        if (!playerId) continue;
  
        await this.prisma.playerImpact.upsert({
          where: { teamId_seasonId_playerId_span: { teamId: team.id, seasonId, playerId, span: this.SPAN } },
          update: { minutes: minutes || 0, starts: starts || 0, goalInv: gi || 0, impact },
          create: { teamId: team.id, seasonId, playerId, span: this.SPAN, minutes: minutes || 0, starts: starts || 0, goalInv: gi || 0, impact },
        });
        impactsUpserted++;
      }
    }
  
    return {
      league: leagueCode,
      season: `${seasonYear}-${seasonYear + 1}`,
      seasonId,
      span: this.SPAN,
      playersTouched,
      impactsUpserted,
    };
  }
  
}
