import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { impliedFromOdds, devig } from "../common/odds.util";

function normalize(p: { p1: number; pX: number; p2: number }) {
  const s = p.p1 + p.pX + p.p2;
  return { p1: p.p1 / s, pX: p.pX / s, p2: p.p2 / s };
}

function tiltByElo(p: { p1: number; pX: number; p2: number }, eloHome: number, eloAway: number, alpha = 0.3, homeAdv = 70) {
  const delta = (eloHome + homeAdv) - eloAway; // + => avantage home
  const k = alpha * (delta / 400);
  let p1 = p.p1 * (1 + k);
  let p2 = p.p2 * (1 - k);
  return normalize({ p1, pX: p.pX, p2 });
}

function tiltByXg(p: { p1: number; pX: number; p2: number }, netHome: number, netAway: number, alpha = 0.2) {
  const delta = netHome - netAway;
  const k = alpha * (delta / 2); // échelle empirique
  let p1 = p.p1 * (1 + k);
  let p2 = p.p2 * (1 - k);
  return normalize({ p1, pX: p.pX, p2 });
}

function clamp(n: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, n)); }

function tiltByInjuries(p: { p1: number; pX: number; p2: number }, outHome: number, outAway: number, alpha = 0.15) {
  const diff = outAway - outHome; // + => avantage home
  const k = alpha * clamp(diff / 5, -0.3, 0.3);
  let p1 = p.p1 * (1 + k);
  let p2 = p.p2 * (1 - k);
  return normalize({ p1, pX: p.pX, p2 });
}

@Injectable()
export class DecisionService {
  constructor(private prisma: PrismaService) {}

  private async latestOdds(matchId: number) {
    const row = await this.prisma.odds.findFirst({ where: { matchId }, orderBy: { sampledAt: "desc" } });
    return row && { o1: row.o1, oX: row.oX, o2: row.o2, src: "latest" as const };
  }

  private async bestOdds(matchId: number) {
    const rows = await this.prisma.odds.findMany({ where: { matchId } });
    if (!rows.length) return null;
    return {
      o1: Math.max(...rows.map(r => r.o1)),
      oX: Math.max(...rows.map(r => r.oX)),
      o2: Math.max(...rows.map(r => r.o2)),
      src: "best" as const,
    };
  }

  async pickForMatch(matchId: number) {
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
      include: { homeTeam: true, awayTeam: true },
    });
    if (!match) throw new NotFoundException("Match not found");

    // Choix cotes
    const useBest = (process.env.DECISION_USE_BEST_ODDS ?? "true") === "true";
    const odds = useBest ? await this.bestOdds(matchId) : await this.latestOdds(matchId);
    if (!odds) throw new NotFoundException("No odds snapshot for this match");

    // Marché (dé-vig)
    const pMarket = devig(impliedFromOdds(odds.o1, odds.oX, odds.o2));

    // Elo
    const [eloHome, eloAway] = await Promise.all([
      this.prisma.eloRating.findFirst({ where: { teamId: match.homeTeamId }, orderBy: { ratedAt: "desc" } }),
      this.prisma.eloRating.findFirst({ where: { teamId: match.awayTeamId }, orderBy: { ratedAt: "desc" } }),
    ]);
    const alphaE = Number(process.env.DECISION_ALPHA_ELO ?? 0.3);
    const hfa = Number(process.env.ELO_HOME_ADV ?? 70);
    let p = (eloHome && eloAway) ? tiltByElo(pMarket, eloHome.rating, eloAway.rating, alphaE, hfa) : pMarket;

    // xG (rolling)
    const span = process.env.XG_SPAN ?? "5m";
    const [xh, xa] = await Promise.all([
      this.prisma.xgTeamRolling.findUnique({ where: { teamId_span: { teamId: match.homeTeamId, span } } }),
      this.prisma.xgTeamRolling.findUnique({ where: { teamId_span: { teamId: match.awayTeamId, span } } }),
    ]);
    const alphaX = Number(process.env.DECISION_ALPHA_XG ?? 0.2);
    if (xh && xa) p = tiltByXg(p, xh.xgFor - xh.xgAgainst, xa.xgFor - xa.xgAgainst, alphaX);

    // Injuries
    const look = Number(process.env.INJ_LOOKBACK_DAYS ?? 14);
    const since = new Date(Date.now() - look * 86400000);
    const [ih, ia] = await Promise.all([
      this.prisma.injuryReport.count({ where: { teamId: match.homeTeamId, status: "out", reportedAt: { gte: since } } }),
      this.prisma.injuryReport.count({ where: { teamId: match.awayTeamId, status: "out", reportedAt: { gte: since } } }),
    ]);
    const alphaI = Number(process.env.DECISION_ALPHA_INJ ?? 0.15);
    p = tiltByInjuries(p, ih, ia, alphaI);

    // EV
    const ev = {
      "1": Number((p.p1 * odds.o1 - 1).toFixed(4)),
      "X": Number((p.pX * odds.oX - 1).toFixed(4)),
      "2": Number((p.p2 * odds.o2 - 1).toFixed(4)),
    } as const;

    // Choix
    const entries = [
      { key: "1" as const, p: p.p1, odds: odds.o1, ev: ev["1"] },
      { key: "X" as const, p: p.pX, odds: odds.oX, ev: ev["X"] },
      { key: "2" as const, p: p.p2, odds: odds.o2, ev: ev["2"] },
    ];
    const byP = [...entries].sort((a, b) => b.p - a.p);
    const byEV = [...entries].sort((a, b) => b.ev - a.ev);
    const pick = byEV[0].ev > 0 ? byEV[0] : byP[0];

    // Confiance & stake
    const gap = byP[0].p - byP[1].p;
    const confP = Math.max(5, Math.min(100, Math.round(gap * 400)));
    const confEV = byEV[0].ev > 0 ? Math.min(100, Math.round(byEV[0].ev * 100)) : 0;
    const confidence = Math.max(confP, confEV);

    const cap = Number(process.env.STAKE_BANKROLL_CAP ?? 0.02);
    const b = pick.odds - 1;
    const kelly = Math.max(0, (pick.p * pick.odds - 1) / b);
    const suggestedStake = Number((cap * kelly).toFixed(4));

    // DC
    const dcProb = byP[0].p + byP[1].p;
    const dcFair = Number((1 / dcProb).toFixed(3));

    const result = {
      match: { id: match.id, home: match.homeTeam.name, away: match.awayTeam.name, startsAt: match.startsAt },
      usingOdds: { mode: odds.src, o1: odds.o1, oX: odds.oX, o2: odds.o2 },
      probabilities_market: pMarket,
      probabilities_adjusted: p,
      ev,
      pick: pick.key,
      confidence,
      stake: { suggestedFraction: suggestedStake, note: `cap=${cap}, kelly=${kelly.toFixed(4)}` },
      rationale: [
        eloHome && eloAway ? `Elo tilt Δ=${(eloHome.rating + hfa - eloAway.rating)} α=${alphaE}` : "Elo off",
        xh && xa ? `xG tilt Δ=${(xh.xgFor - xh.xgAgainst - (xa.xgFor - xa.xgAgainst)).toFixed(2)} α=${alphaX}` : "xG off",
        `inj tilt outHome=${ih} outAway=${ia} α=${alphaI}`,
        `gapP=${(gap*100).toFixed(1)}pts bestEV=${byEV[0].key}:${byEV[0].ev}`,
      ],
      alternative: { doubleChance: byP[0].key + byP[1].key, fairOdds: dcFair, probability: dcProb },
    };

    // Log
    await this.prisma.decisionLog.create({ data: { matchId: match.id, payload: result as any } });

    return result;
  }
}
