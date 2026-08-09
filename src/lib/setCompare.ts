// Set Compare helpers: delta computation and build patching.
// These are UI-model utilities, not game math — they live here so both
// SetCompare.tsx and DamageTab (via App.tsx) can import them without
// pulling in the full formulas.ts module or coupling through a component.

import type { Build, GearSwapCard } from "@/lib/types";
import { STAT_FIELD_MAP } from "@/data/statFields";

/** Net stat delta for one card (adding - removing). */
export function cardNetDelta(card: GearSwapCard): Map<string, number> {
  const net = new Map<string, number>();
  for (const d of card.adding) {
    net.set(d.key, (net.get(d.key) ?? 0) + d.value);
  }
  for (const d of card.removing) {
    net.set(d.key, (net.get(d.key) ?? 0) - d.value);
  }
  return net;
}

/** Combined net delta across all *enabled* cards. */
export function aggregateNetDelta(cards: GearSwapCard[]): Map<string, number> {
  const net = new Map<string, number>();
  for (const card of cards) {
    if (!card.enabled) continue;
    cardNetDelta(card).forEach((v, k) => net.set(k, (net.get(k) ?? 0) + v));
  }
  return net;
}

/**
 * Apply a net stat delta map to a deep-cloned copy of `base`.
 * Each key is looked up in STAT_FIELD_MAP to decide whether it targets
 * `attrs` or `gear`. Unknown keys are silently ignored.
 * Does NOT mutate `base`.
 */
export function applyDeltas(base: Build, net: Map<string, number>): Build {
  const b = structuredClone(base) as Build;
  net.forEach((delta, key) => {
    const field = STAT_FIELD_MAP.get(key);
    if (!field) return;
    if (field.target === "attr") {
      (b.attrs as unknown as Record<string, number>)[key] =
        ((b.attrs as unknown as Record<string, number>)[key] ?? 0) + delta;
    } else {
      (b.gear as unknown as Record<string, number>)[key] =
        ((b.gear as unknown as Record<string, number>)[key] ?? 0) + delta;
    }
  });
  return b;
}
