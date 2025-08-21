export type OddsMode = 'best' | 'latest';

function num(envName: string, def: number): number {
  const v = process.env[envName];
  if (v == null || v === '') return def;
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
}

function bool(envName: string, def: boolean): boolean {
  const v = process.env[envName];
  if (v == null || v === '') return def;
  return ['1', 'true', 'yes', 'y', 'on'].includes(String(v).toLowerCase());
}

/** parse "5m" -> "5", "5" -> "5" (clé attendue par xgTeamRolling.span) */
function parseXgSpanKey(v: string | undefined, defKey: string): string {
  if (!v) return defKey;
  const m = String(v).match(/^(\d+)/);
  return m ? m[1] : defKey;
}

export interface DecisionConfig {
  useBestOdds: boolean;     // default odds mode
  alphaElo: number;         // poids ΔElo (par 100 pts)
  eloHomeAdv: number;       // avantage domicile en pts Elo
  alphaXg: number;          // poids ΔxG (clampé)
  xgSpanKey: string;        // "5" pour rolling-5
  alphaInj: number;         // poids diff blessures (outAway - outHome)
  injLookbackDays: number;  // fenêtre blessures
  alphaRest: number;        // poids diff de repos (jours)
  alphaDraw: number;        // bump nul optionnel
  stakeCap: number;         // cap Kelly (utile si tu gardes l’endpoint “pick”)
}

export function getDecisionConfig(): DecisionConfig {
  return {
    useBestOdds: bool('DECISION_USE_BEST_ODDS', true),
    alphaElo:    num('DECISION_ALPHA_ELO', 0.30),
    eloHomeAdv:  num('ELO_HOME_ADV', 70),
    alphaXg:     num('DECISION_ALPHA_XG', 0.20),
    xgSpanKey:   parseXgSpanKey(process.env.XG_SPAN, '5'),
    alphaInj:    num('DECISION_ALPHA_INJ', 0.15),
    injLookbackDays: num('INJ_LOOKBACK_DAYS', 14),
    alphaRest:   num('DECISION_ALPHA_REST', 0.05),    // optionnel, par défaut 0.05
    alphaDraw:   num('DECISION_ALPHA_DRAW', 0.05),    // optionnel, par défaut 0.05
    stakeCap:    num('STAKE_BANKROLL_CAP', 0.02),
  };
}
