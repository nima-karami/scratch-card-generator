/**
 * Simple seeded RNG for deterministic game outcomes per card (jobId).
 * Mulberry32.
 */
export function createSeededRng(seed: string): () => number {
  let h = hashString(seed);
  return function next() {
    h = (h + 0x6d2b79f5) | 0; // mulberry32
    let t = Math.imul(h ^ (h >>> 15), 1 | h);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    h = (h << 5) - h + c;
    h = h & h;
  }
  return h >>> 0;
}

/** Pick one index from 0..items.length-1 using weights. Weights are in items[].weight. */
export function weightedPick<T extends { weight: number }>(
  items: T[],
  rng: () => number
): T {
  const total = items.reduce((s, i) => s + i.weight, 0);
  let r = rng() * total;
  for (const item of items) {
    r -= item.weight;
    if (r <= 0) return item;
  }
  return items[items.length - 1];
}

/** Pick random integer in [min, max] inclusive. */
export function randomInt(rng: () => number, min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}
