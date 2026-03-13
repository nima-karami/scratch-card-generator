import type {
  GameItemData,
  PrizeGridData,
  MatchABunchData,
  BonusSpotData,
  LuckyNumbersData,
  YourNumbersData,
  ScratchCardGame,
  WinningNumberEntry,
  SpriteSheetConfig,
} from "@repo/shared";
import type {
  GameConfigs,
  PrizeGridConfig,
  MatchABunchConfig,
  BonusSpotConfig,
  LuckyNumbersConfig,
  YourNumbersConfig,
} from "../config/games/types.js";
import { createSeededRng, weightedPick, randomInt } from "./seeded-rng.js";

export interface GameOutcomeOptions {
  jobId: string;
  defaultCoverUrl?: string;
  coverSpriteSheet?: SpriteSheetConfig;
  /** Optional spritesheet URL for item covers (e.g. from design step). */
  coverSpriteSheetSrc?: string;
}

function gameItem(
  id: string,
  value: string,
  valueCents?: number,
  coverSpriteSheetSrc?: string
): GameItemData {
  return {
    id,
    value,
    revealed: false,
    ...(valueCents !== undefined && { valueCents }),
    ...(coverSpriteSheetSrc && { coverSpriteSheetSrc }),
  };
}

export function generatePrizeGrid(
  config: PrizeGridConfig,
  options: GameOutcomeOptions
): PrizeGridData {
  const rng = createSeededRng(options.jobId + ":prize-grid");
  const total = config.cols * config.rows;
  const items: GameItemData[] = [];
  for (let i = 0; i < total; i++) {
    const entry = weightedPick(config.prizePool, rng);
    items.push(
      gameItem(
        `p${i + 1}`,
        entry.value,
        entry.valueCents,
        options.coverSpriteSheetSrc
      )
    );
  }
  return {
    id: "prize-grid",
    items,
    cols: config.cols,
    rows: config.rows,
    ...(options.coverSpriteSheet && { coverSpriteSheet: options.coverSpriteSheet }),
  };
}

export function generateMatchABunch(
  config: MatchABunchConfig,
  options: GameOutcomeOptions
): MatchABunchData {
  const rng = createSeededRng(options.jobId + ":match-a-bunch");
  const symbolEntry = weightedPick(config.symbols, rng);
  const prizeEntry = weightedPick(config.prizePool, rng);
  const matchCount = Math.min(
    Math.max(2, config.matchCount),
    5
  );
  const items: GameItemData[] = [];
  for (let i = 0; i < matchCount; i++) {
    items.push(
      gameItem(`m${i + 1}`, symbolEntry.symbol, undefined, options.coverSpriteSheetSrc)
    );
  }
  return {
    id: "match-a-bunch",
    items,
    matchCount,
    prize: prizeEntry.value,
    prizeCents: prizeEntry.valueCents,
  };
}

export function generateBonusSpot(
  config: BonusSpotConfig,
  options: GameOutcomeOptions
): BonusSpotData {
  const rng = createSeededRng(options.jobId + ":bonus-spot");
  const totalWeight = config.winWeight + config.missWeight;
  const win = rng() < config.winWeight / totalWeight;
  const prizeEntry = win ? weightedPick(config.prizePool, rng) : null;
  const item = gameItem(
    "bonus-1",
    prizeEntry ? prizeEntry.value : "$0",
    prizeEntry ? prizeEntry.valueCents : 0,
    options.coverSpriteSheetSrc
  );
  return {
    id: "bonus-spot",
    item,
    prize: prizeEntry ? prizeEntry.value : "$0",
    prizeCents: prizeEntry ? prizeEntry.valueCents : 0,
  };
}

export function generateLuckyNumbers(
  config: LuckyNumbersConfig,
  options: GameOutcomeOptions
): LuckyNumbersData {
  const rng = createSeededRng(options.jobId + ":lucky-numbers");
  const { min, max } = config.numberRange;
  const winningNumbers: WinningNumberEntry[] = [];
  const usedNumbers = new Set<number>();
  for (let i = 0; i < config.winningCount; i++) {
    let n: number;
    do {
      n = randomInt(rng, min, max);
    } while (usedNumbers.has(n));
    usedNumbers.add(n);
    const prizeEntry = weightedPick(config.prizePool, rng);
    winningNumbers.push({
      number: String(n),
      prize: prizeEntry.value,
      prizeCents: prizeEntry.valueCents,
    });
  }
  const items: GameItemData[] = winningNumbers.map((w, idx) =>
    gameItem(`ln-${idx + 1}`, w.number, w.prizeCents, options.coverSpriteSheetSrc)
  );
  return {
    id: "lucky-numbers",
    items,
    count: winningNumbers.length,
    winningNumbers,
  };
}

export function generateYourNumbers(
  config: YourNumbersConfig,
  winningNumbers: WinningNumberEntry[],
  options: GameOutcomeOptions
): YourNumbersData {
  const rng = createSeededRng(options.jobId + ":your-numbers");
  const total = config.cols * config.rows;
  const { min, max } = config.numberRange;
  const numMatches = randomInt(
    rng,
    Math.max(0, config.minMatches),
    Math.min(total, config.maxMatches, Math.max(1, winningNumbers.length))
  );
  const matchIndices = new Set<number>();
  while (matchIndices.size < numMatches) {
    matchIndices.add(Math.floor(rng() * total));
  }
  const winLookup = new Map(winningNumbers.map((w) => [w.number, w.prizeCents ?? 0]));
  const items: GameItemData[] = [];
  let winIdx = 0;
  for (let i = 0; i < total; i++) {
    let value: string;
    let valueCents: number;
    if (matchIndices.has(i)) {
      const winEntry = winningNumbers[winIdx % winningNumbers.length];
      winIdx++;
      value = winEntry.number;
      valueCents = winEntry.prizeCents ?? 0;
    } else {
      const n = randomInt(rng, min, max);
      value = String(n);
      valueCents = winLookup.get(value) ?? 0;
    }
    items.push(
      gameItem(`yn-${i + 1}`, value, valueCents, options.coverSpriteSheetSrc)
    );
  }
  return {
    id: "your-numbers",
    items,
    cols: config.cols,
    rows: config.rows,
  };
}

/** Build the list of games for a variant. variantId determines which games are included. */
export function generateVariantGames(
  variantId: "variant-1" | "variant-2" | "variant-3",
  configs: GameConfigs,
  options: GameOutcomeOptions
): ScratchCardGame[] {
  const games: ScratchCardGame[] = [];
  if (variantId === "variant-1") {
    games.push(generatePrizeGrid(configs.prizeGrid, options));
    return games;
  }
  if (variantId === "variant-2" || variantId === "variant-3") {
    games.push(generateBonusSpot(configs.bonusSpot, options));
    games.push(generateMatchABunch(configs.matchABunch, options));
    games.push(generateLuckyNumbers(configs.luckyNumbers, options));
    const luckyData = games[games.length - 1] as LuckyNumbersData;
    games.push(
      generateYourNumbers(configs.yourNumbers, luckyData.winningNumbers, options)
    );
    return games;
  }
  return games;
}
