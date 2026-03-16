import { readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import type {
  GameConfigs,
  PrizeGridConfig,
  MatchABunchConfig,
  BonusSpotConfig,
  LuckyNumbersConfig,
  YourNumbersConfig,
} from "./types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Resolve data dir next to this loader (src/config/games/data or dist/config/games/data). */
function getConfigDir(): string {
  return path.join(__dirname, "data");
}

function loadJson<T>(filename: string): T {
  const dir = getConfigDir();
  const filePath = path.join(dir, filename);
  const raw = readFileSync(filePath, "utf-8");
  return JSON.parse(raw) as T;
}

let cached: GameConfigs | null = null;

/**
 * Load all game configs from repo config files. Cached after first load.
 */
export function getGameConfigs(): GameConfigs {
  if (cached) return cached;
  cached = {
    prizeGrid: loadJson<PrizeGridConfig>("prize-grid.json"),
    matchABunch: loadJson<MatchABunchConfig>("match-a-bunch.json"),
    bonusSpot: loadJson<BonusSpotConfig>("bonus-spot.json"),
    luckyNumbers: loadJson<LuckyNumbersConfig>("lucky-numbers.json"),
    yourNumbers: loadJson<YourNumbersConfig>("your-numbers.json"),
  };
  return cached;
}
