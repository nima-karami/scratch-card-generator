import { GameId } from "@repo/shared";

export type VariantId = "variant-1" | "variant-2" | "variant-3";

export const DEFAULT_VARIANT_ID: VariantId = "variant-2";

export const VARIANT_NAMES: Record<VariantId, string> = {
  "variant-1": "Variant 1",
  "variant-2": "Variant 2",
  "variant-3": "Variant 3",
};

const ACTIVE_GAME_IDS_BY_VARIANT: Record<VariantId, GameId[]> = {
  "variant-1": ["prize-grid"],
  "variant-2": ["lucky-numbers", "your-numbers"],
  "variant-3": ["bonus-spot", "match-a-bunch", "lucky-numbers", "your-numbers"],
};

export function getActiveGameIdsForVariant(variantId: VariantId): GameId[] {
  return [...ACTIVE_GAME_IDS_BY_VARIANT[variantId]!];
}
