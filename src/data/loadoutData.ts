// Loadout tab data: slot definitions, pool mapping, groupings, and helpers.
// Source: user-confirmed equipment list and Essence pool data (Jul 2026).

import type { SlotKey } from "@/data/essenceData";
import { ESSENCE_POOLS, BASE_STAT_ROW } from "@/data/essenceData";

// ── Slot IDs ─────────────────────────────────────────────────────────────────

export type GearSlotId =
  | "head"
  | "back"
  | "mainHand"
  | "legs"
  | "accessoryL"
  | "eyewear"
  | "chest"
  | "offHand"
  | "feet"
  | "accessoryR"
  | "artifact1"
  | "artifact2"
  | "artifact3"
  | "artifact4";

// ── Slot definitions ─────────────────────────────────────────────────────────

export interface GearSlotDef {
  id: GearSlotId;
  label: string;
  icon: string;
  /**
   * Fixed pool key, or null when the player picks the pool at runtime.
   * null slots supply `choices` for the UI to render a dropdown.
   */
  pool: SlotKey | null;
  choices?: SlotKey[];
  side: "left" | "right" | "artifact";
}

export const GEAR_SLOTS: GearSlotDef[] = [
  // --- Left column ---
  { id: "head",       label: "Head",        icon: "⛑",  pool: "headgear",  side: "left" },
  { id: "back",       label: "Back",        icon: "🎒", pool: "headgear",  side: "left" },
  {
    id: "mainHand", label: "Main Hand", icon: "🗡",
    pool: null,
    choices: ["meleeWeapon", "rangedWeapon", "magicWeapon"],
    side: "left",
  },
  { id: "legs",       label: "Legs",        icon: "🩲", pool: "legs",      side: "left" },
  { id: "accessoryL", label: "Accessory",   icon: "💍", pool: "accessory", side: "left" },

  // --- Right column ---
  { id: "eyewear",    label: "Eyewear",     icon: "🕶", pool: "headgear",  side: "right" },
  { id: "chest",      label: "Chest",       icon: "🛡", pool: "chest",     side: "right" },
  {
    id: "offHand", label: "Off Hand", icon: "🛡",
    pool: null,
    choices: ["meleeWeapon", "rangedWeapon", "magicWeapon", "chest"],
    side: "right",
  },
  { id: "feet",       label: "Feet",        icon: "👟", pool: "feet",      side: "right" },
  { id: "accessoryR", label: "Accessory",   icon: "💍", pool: "accessory", side: "right" },

  // --- Artifacts ---
  { id: "artifact1",  label: "Artifact 1",  icon: "💎", pool: "artifact",  side: "artifact" },
  { id: "artifact2",  label: "Artifact 2",  icon: "💎", pool: "artifact",  side: "artifact" },
  { id: "artifact3",  label: "Artifact 3",  icon: "💎", pool: "artifact",  side: "artifact" },
  { id: "artifact4",  label: "Artifact 4",  icon: "💎", pool: "artifact",  side: "artifact" },
];

// ── Substat count rules ───────────────────────────────────────────────────────

/** Items start at 3 substats. The user can add more up to this cap. */
export const DEFAULT_SUBSTATS = 3;

/**
 * Maximum number of substats a slot of the given pool can hold.
 * Weapons expand to 6, armor/accessories expand to 5, artifacts stay at 3.
 */
export function maxSubstatsFor(pool: SlotKey): number {
  if (pool === "artifact") return 3;
  if (pool.endsWith("Weapon")) return 6;
  return 5;
}

/**
 * How many non-base-attribute rows this pool has. When the substat count
 * exceeds this +1 (for the base row), the final expansion repeats a row.
 */
export function poolRowCount(pool: SlotKey): number {
  const p = ESSENCE_POOLS.find((ep) => ep.key === pool);
  return p?.rows.length ?? 0;
}

// ── Default slot factory ─────────────────────────────────────────────────────

/** Build a default LoadoutSlot for a given slot definition. Exported for migration. */
export function makeDefaultSlot(slotDef: GearSlotDef): import("@/lib/types").LoadoutSlot {
  const pool = (slotDef.pool ?? slotDef.choices?.[0] ?? "headgear") as SlotKey;
  return {
    pool,
    name: "",
    substats: [
      { id: crypto.randomUUID(), label: BASE_STAT_ROW.options[0].label, value: 3 },
      { id: crypto.randomUUID(), label: "", value: 0 },
      { id: crypto.randomUUID(), label: "", value: 0 },
    ],
  };
}

// ── Base attribute options (row 1 of every item) ──────────────────────────────

export const BASE_ATTR_OPTIONS = BASE_STAT_ROW.options.map((o) => o.label);

// ── Pool option list (rows 2+) ────────────────────────────────────────────────

/** Flat list of all options for a given pool, for use in a select dropdown. */
export interface PoolOption {
  label: string;
  max: number;
  rowIndex: number; // which row the option comes from (0-based)
}

export function getPoolOptions(pool: SlotKey): PoolOption[] {
  const p = ESSENCE_POOLS.find((ep) => ep.key === pool);
  if (!p) return [];
  const out: PoolOption[] = [];
  p.rows.forEach((row, ri) => {
    row.options.forEach((opt) => out.push({ label: opt.label, max: opt.max, rowIndex: ri }));
  });
  return out;
}

// ── Display groupings ─────────────────────────────────────────────────────────

export interface StatGroup {
  label: string;
  statLabels: string[];
}

/**
 * Ordered groups for the totals panel. Any substat label not covered by a
 * group automatically falls into a trailing "Other" group.
 */
export const STAT_GROUPS: StatGroup[] = [
  {
    label: "Attributes",
    statLabels: ["STR", "AGI", "VIT", "INT", "DEX", "LUK"],
  },
  {
    label: "Offense",
    statLabels: [
      "ATK%", "MATK%", "Flat ATK", "Flat MATK",
      "Melee Damage", "Ranged Damage", "Magic Damage",
      "Crit", "Crit Damage",
      "Attack Speed", "ASPD Limit",
      "Cast Speed", "Cooldown Recovery", "Cast Range",
      "Hit", "Chain", "Range", "Multistrike", "Leech",
    ],
  },
  {
    label: "Defense",
    statLabels: [
      "Flat DEF", "Flat MDEF", "DEF%", "MDEF%",
      "Damage From Melee", "Damage From Magic",
      "Perfect Dodge", "Flee",
      "HP Leech", "MP Leech",
    ],
  },
  {
    label: "Speed",
    statLabels: ["Move Speed", "MP Cost", "MP Cost Reduction"],
  },
  {
    label: "Resources",
    statLabels: ["HP%", "MP%", "HP Regen%", "MP Regen%", "Healing Received", "Healing"],
  },
];

// ── Lower-is-better labels ─────────────────────────────────────────────────────
// These are beneficial as negative numbers; comparison arrows must invert.

export const LOWER_IS_BETTER = new Set([
  "MP Cost",
  "MP Cost Reduction",
  "Damage From Melee",
  "Damage From Magic",
]);
