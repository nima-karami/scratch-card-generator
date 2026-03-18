import type { Request, Response } from "express";
import { readFile } from "fs/promises";
import { join } from "path";
import type { CardData, GameId } from "@repo/shared";
import { generateVariantGames } from "../lib/game-outcomes.js";
import { getGameConfigs } from "../config/games/index.js";
import { PIPELINE_CONFIG } from "../config/creative-director/pipeline-config.js";
import { getJobOutputsDir, getJobResult } from "../queue/worker.js";

type VariantId = "variant-1" | "variant-2" | "variant-3";

function isVariantId(value: unknown): value is VariantId {
  return value === "variant-1" || value === "variant-2" || value === "variant-3";
}

async function loadCardFromDisk(jobId: string): Promise<CardData | null> {
  const path = join(process.cwd(), getJobOutputsDir(), jobId, "card-data.json");
  try {
    const raw = await readFile(path, "utf-8");
    return JSON.parse(raw) as CardData;
  } catch {
    return null;
  }
}

function extractCoverSpriteSheetSrcByGameId(card: CardData): {
  coverSpriteSheetSrcByGameId: Partial<Record<GameId, string>>;
  fallbackCoverSpriteSheetSrc?: string;
} {
  const games = card.variant?.games ?? [];

  const coverSpriteSheetSrcByGameId: Partial<Record<GameId, string>> = {};
  let fallbackCoverSpriteSheetSrc: string | undefined;

  for (const game of games) {
    const gameId = game.id as GameId;
    // Most games store the spritesheet src on their revealable items.
    const anyGame = game as unknown as { items?: { coverSpriteSheetSrc?: string }[]; item?: { coverSpriteSheetSrc?: string } };

    const src =
      anyGame.items?.[0]?.coverSpriteSheetSrc ??
      anyGame.item?.coverSpriteSheetSrc ??
      undefined;

    if (!src) continue;
    coverSpriteSheetSrcByGameId[gameId] = src;
    if (!fallbackCoverSpriteSheetSrc) fallbackCoverSpriteSheetSrc = src;
  }

  return { coverSpriteSheetSrcByGameId, fallbackCoverSpriteSheetSrc };
}

export async function postNextGame(req: Request, res: Response): Promise<void> {
  const jobId = Array.isArray(req.params.jobId) ? req.params.jobId[0] : req.params.jobId;
  if (!jobId) {
    res.status(400).json({ error: "Missing jobId" });
    return;
  }

  const cardFromMemory = getJobResult(jobId);
  const card = cardFromMemory ?? (await loadCardFromDisk(jobId));
  if (!card || !card.variant) {
    res.status(404).json({ error: "Card not found", jobId });
    return;
  }

  const variantId = card.variant.id;
  if (!isVariantId(variantId)) {
    res.status(400).json({ error: "Unsupported variant", variantId });
    return;
  }

  const { coverSpriteSheetSrcByGameId, fallbackCoverSpriteSheetSrc } = extractCoverSpriteSheetSrcByGameId(card);

  const nextSeed = crypto.randomUUID();

  const games = generateVariantGames(variantId, getGameConfigs(), {
    jobId: nextSeed,
    coverSpriteSheet: { cols: PIPELINE_CONFIG.spritesheet.cols, rows: PIPELINE_CONFIG.spritesheet.rows },
    coverSpriteSheetSrc: fallbackCoverSpriteSheetSrc,
    coverSpriteSheetSrcByGameId,
  });

  const nextCard: CardData = {
    ...card,
    variant: {
      ...card.variant,
      games,
    },
  };

  res.json(nextCard);
}

