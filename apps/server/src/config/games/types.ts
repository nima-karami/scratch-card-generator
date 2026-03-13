/**
 * Server-side game config types. Loaded from config/games/*.json.
 */

export interface PrizePoolEntry {
  value: string;
  valueCents: number;
  weight: number;
}

export interface PrizeGridConfig {
  cols: number;
  rows: number;
  prizePool: PrizePoolEntry[];
  minPrizeCents: number;
  maxPrizeCents: number;
}

export interface MatchABunchConfig {
  matchCount: number;
  symbols: { symbol: string; weight: number }[];
  prizePool: PrizePoolEntry[];
  minPrizeCents: number;
  maxPrizeCents: number;
}

export interface BonusSpotConfig {
  winWeight: number;
  missWeight: number;
  prizePool: PrizePoolEntry[];
  minPrizeCents: number;
  maxPrizeCents: number;
}

export interface LuckyNumbersConfig {
  winningCount: number;
  numberRange: { min: number; max: number };
  prizePool: PrizePoolEntry[];
  minPrizeCents: number;
  maxPrizeCents: number;
}

export interface YourNumbersConfig {
  cols: number;
  rows: number;
  numberRange: { min: number; max: number };
  minMatches: number;
  maxMatches: number;
}

export interface GameConfigs {
  prizeGrid: PrizeGridConfig;
  matchABunch: MatchABunchConfig;
  bonusSpot: BonusSpotConfig;
  luckyNumbers: LuckyNumbersConfig;
  yourNumbers: YourNumbersConfig;
}
