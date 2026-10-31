import { getAchievement } from "./achievements";
import type { Equipped, SaveData } from "./types";

export type CosmeticSlot = keyof Equipped;

export interface CosmeticItem {
  id: string;
  slot: CosmeticSlot;
  name: string;
  /** Achievement that unlocks it, or null if available from the start. */
  unlockedBy: string | null;
}

export const COSMETICS: CosmeticItem[] = [
  { id: "none", slot: "hat", name: "No hat", unlockedBy: null },
  { id: "bow", slot: "hat", name: "Pink bow", unlockedBy: "first_victory" },
  { id: "crown", slot: "hat", name: "Champion crown", unlockedBy: "boss_slayer" },

  { id: "none", slot: "eyewear", name: "No glasses", unlockedBy: null },
  { id: "sunnies", slot: "eyewear", name: "Cool sunnies", unlockedBy: "maze_master" },
  { id: "heartshades", slot: "eyewear", name: "Heart shades", unlockedBy: "secret_hunter" },

  { id: "drops", slot: "earrings", name: "Classic drops", unlockedBy: null },
  { id: "stars", slot: "earrings", name: "Star earrings", unlockedBy: "heart_collector" },
  { id: "hearts", slot: "earrings", name: "Heart earrings", unlockedBy: "snack_champion" },

  { id: "none", slot: "cape", name: "No cape", unlockedBy: null },
  { id: "cape", slot: "cape", name: "Hero cape", unlockedBy: "perfect_run" },
  { id: "royal", slot: "cape", name: "Royal cape", unlockedBy: "gold_rush" },
];

export const COSMETIC_SLOTS: CosmeticSlot[] = ["hat", "eyewear", "earrings", "cape"];

export function cosmeticKey(slot: CosmeticSlot, id: string): string {
  return `${slot}:${id}`;
}

export function itemsForSlot(slot: CosmeticSlot): CosmeticItem[] {
  return COSMETICS.filter((c) => c.slot === slot);
}

export function isValidCosmetic(slot: CosmeticSlot, id: string): boolean {
  return COSMETICS.some((c) => c.slot === slot && c.id === id);
}

/** Cosmetics (as "slot:id" keys) available given the unlocked achievements. */
export function unlockedCosmeticKeys(achievements: readonly string[]): string[] {
  return COSMETICS.filter((c) => c.unlockedBy === null || achievements.includes(c.unlockedBy)).map((c) =>
    cosmeticKey(c.slot, c.id),
  );
}

/** Returns a copy of the save with cosmetics synced to achievements and invalid equips repaired. */
export function syncCosmetics(save: SaveData): SaveData {
  const unlocked = Array.from(new Set([...save.cosmeticsUnlocked, ...unlockedCosmeticKeys(save.achievements)]));
  const equipped = { ...save.equipped };
  for (const slot of COSMETIC_SLOTS) {
    if (!unlocked.includes(cosmeticKey(slot, equipped[slot]))) {
      equipped[slot] = itemsForSlot(slot)[0].id;
    }
  }
  return { ...save, cosmeticsUnlocked: unlocked, equipped };
}

/** Human readable name of the achievement that unlocks an item. */
export function getCosmeticUnlockName(item: CosmeticItem): string {
  if (!item.unlockedBy) return "Available";
  return getAchievement(item.unlockedBy)?.name ?? item.unlockedBy;
}
