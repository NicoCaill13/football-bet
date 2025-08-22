export type ImpliedProbs = { p1: number; pX: number; p2: number };

export function impliedFromOdds(
  o1: number,
  oX: number,
  o2: number,
): ImpliedProbs {
  if ([o1, oX, o2].some((o) => !o || o <= 1)) {
    throw new Error('Invalid odds; must be > 1.00');
  }
  const p1 = 1 / o1;
  const pX = 1 / oX;
  const p2 = 1 / o2;
  return { p1, pX, p2 };
}

export function devig({ p1, pX, p2 }: ImpliedProbs): ImpliedProbs {
  const s = p1 + pX + p2;
  return { p1: p1 / s, pX: pX / s, p2: p2 / s };
}

export function fairFromProb(p: number) {
  return 1 / p;
}
