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

/** Resolve config/games dir: from src/config/games or dist/config/games up to server root, then config/games */
function getConfigDir(): string {
  return path.join(__dirname, "..", "..", "..", "config", "games");
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
