// Item substat pools for the Essence reference tab.
// Source: mechanics/Modifiers.png (Jul 2026).
// Values are MAXIMUMS. Minimums are pending and will be added as `min` once confirmed.

export interface EssenceOption {
  label: string;
  /** Maximum value rolled (positive for bonuses, negative for reductions). */
  max: number;
  /** Minimum value rolled — pending, to be filled in later. */
  min?: number;
}

export interface EssenceRow {
  /** Multiple options on one row are mutually exclusive — the item rolls exactly one. */
  options: EssenceOption[];
}

export type SlotKey =
  | "meleeWeapon"
  | "rangedWeapon"
  | "magicWeapon"
  | "chest"
  | "feet"
  | "legs"
  | "artifact"
  | "accessory"
  | "headgear";

export interface EssencePool {
  key: SlotKey;
  label: string;
  icon: string;
  /** Total number of substats this item type can carry (including the shared base-attribute row). */
  substats: number;
  /** The modifier rows specific to this slot. Excludes the shared base-attribute row. */
  rows: EssenceRow[];
}

// ── Shared first row (every slot) ──────────────────────────────────────────
// The first substat on every item is always one of the six base attributes.
export const BASE_STAT_ROW: EssenceRow = {
  options: [
    { label: "STR", max: 3, min: 2 },
    { label: "AGI", max: 3, min: 2 },
    { label: "VIT", max: 3, min: 2 },
    { label: "INT", max: 3, min: 2 },
    { label: "DEX", max: 3, min: 2 },
    { label: "LUK", max: 3, min: 2 },
  ],
};

// ── Nine item pools ────────────────────────────────────────────────────────
export const ESSENCE_POOLS: EssencePool[] = [
  {
    key: "meleeWeapon",
    label: "Melee Weapon",
    icon: "⚔",
    substats: 5,
    rows: [
      { options: [{ label: "ATK%", max: 5 }, { label: "MATK%", max: 5 }] },
      { options: [{ label: "Melee Damage", max: 5 }, { label: "Magic Damage", max: 5 }] },
      {
        options: [
          { label: "Crit", max: 10 },
          { label: "Hit", max: 20 },
          { label: "Attack Speed", max: 10 },
          { label: "Flat ATK", max: 5 },
          { label: "Flat MATK", max: 5 },
        ],
      },
      {
        options: [
          { label: "Crit Damage", max: 10 },
          { label: "Leech", max: 5 },
          { label: "Chain", max: 1 },
          { label: "Multistrike", max: 25 },
        ],
      },
    ],
  },
  {
    key: "rangedWeapon",
    label: "Ranged Weapon",
    icon: "🏹",
    substats: 5,
    rows: [
      { options: [{ label: "ATK%", max: 5 }, { label: "MATK%", max: 5 }] },
      { options: [{ label: "Ranged Damage", max: 5 }, { label: "Magic Damage", max: 5 }] },
      {
        options: [
          { label: "Crit", max: 10 },
          { label: "Hit", max: 20 },
          { label: "Attack Speed", max: 10 },
          { label: "Flat ATK", max: 5 },
          { label: "Flat MATK", max: 5 },
        ],
      },
      {
        options: [
          { label: "Crit Damage", max: 10 },
          { label: "Leech", max: 5 },
          { label: "Range", max: 1 },
          { label: "Multistrike", max: 25 },
        ],
      },
    ],
  },
  {
    key: "magicWeapon",
    label: "Magic Weapon",
    icon: "🪄",
    substats: 5,
    rows: [
      { options: [{ label: "ATK%", max: 5 }, { label: "MATK%", max: 5 }] },
      { options: [{ label: "Melee Damage", max: 5 }, { label: "Magic Damage", max: 5 }] },
      {
        options: [
          { label: "Cast Speed", max: 10 },
          { label: "MP Cost", max: -10 },
          { label: "Attack Speed", max: 10 },
          { label: "Flat ATK", max: 5 },
          { label: "Flat MATK", max: 5 },
        ],
      },
      {
        options: [
          { label: "Cooldown Recovery", max: 10 },
          { label: "Healing", max: 10 },
          { label: "Cast Range", max: 1 },
        ],
      },
    ],
  },
  {
    key: "chest",
    label: "Chest Armor",
    icon: "🛡",
    substats: 4,
    rows: [
      { options: [{ label: "HP%", max: 10 }, { label: "MP%", max: 10 }] },
      { options: [{ label: "Flat DEF", max: 10 }, { label: "Flat MDEF", max: 10 }] },
      { options: [{ label: "DEF%", max: 5 }, { label: "MDEF%", max: 5 }] },
      {
        options: [
          { label: "Damage From Melee", max: -5 },
          { label: "Damage From Magic", max: -5 },
        ],
      },
      { options: [{ label: "Healing Received", max: 10 }, { label: "Perfect Dodge", max: 5 }] },
    ],
  },
  {
    key: "feet",
    label: "Feet",
    icon: "👟",
    substats: 4,
    rows: [
      { options: [{ label: "Attack Speed", max: 10 }] },
      { options: [{ label: "Move Speed", max: 10 }] },
      { options: [{ label: "Cast Speed", max: 10 }] },
      { options: [{ label: "ASPD Limit", max: 1 }] },
    ],
  },
  {
    key: "legs",
    label: "Legs",
    icon: "🩲",
    substats: 4,
    rows: [
      { options: [{ label: "HP Regen%", max: 25 }, { label: "MP Regen%", max: 25 }] },
      { options: [{ label: "Leech", max: 5 }, { label: "Cast Speed", max: 10 }] },
      { options: [{ label: "Flee", max: 15 }, { label: "Perfect Dodge", max: 5 }] },
      { options: [{ label: "MP Cost Reduction", max: -10 }] },
    ],
  },
  {
    key: "artifact",
    label: "Artifact",
    icon: "💎",
    substats: 3,
    rows: [
      { options: [{ label: "HP%", max: 2 }, { label: "MP%", max: 2 }] },
      { options: [{ label: "ATK%", max: 2 }, { label: "MATK%", max: 2 }] },
    ],
  },
  {
    key: "accessory",
    label: "Accessory",
    icon: "💍",
    substats: 4,
    rows: [
      { options: [{ label: "HP%", max: 2 }, { label: "MP%", max: 2 }] },
      { options: [{ label: "ATK%", max: 2 }, { label: "MATK%", max: 2 }] },
      {
        options: [
          { label: "Crit", max: 5 },
          { label: "Hit", max: 10 },
          { label: "Attack Speed", max: 5 },
        ],
      },
    ],
  },
  {
    key: "headgear",
    label: "Headgear",
    icon: "⛑",
    substats: 4,
    rows: [
      { options: [{ label: "HP%", max: 2 }, { label: "MP%", max: 2 }] },
      { options: [{ label: "ATK%", max: 2 }, { label: "MATK%", max: 2 }] },
      { options: [{ label: "Flat ATK", max: 3 }, { label: "Flat MATK", max: 3 }] },
      { options: [{ label: "Flat DEF", max: 5 }, { label: "Flat MDEF", max: 5 }] },
    ],
  },
];

// ── Reverse index ──────────────────────────────────────────────────────────
// For every distinct modifier label, which slots can roll it and what is the
// best (highest absolute) max available? Computed, never hand-written.
export interface ReverseEntry {
  label: string;
  bestMax: number;
  slots: { slotLabel: string; slotKey: SlotKey; max: number }[];
}

export function buildReverseIndex(): ReverseEntry[] {
  const map = new Map<string, ReverseEntry>();

  for (const pool of ESSENCE_POOLS) {
    for (const row of pool.rows) {
      for (const opt of row.options) {
        const existing = map.get(opt.label);
        const entry = existing ?? { label: opt.label, bestMax: 0, slots: [] };
        entry.slots.push({ slotLabel: pool.label, slotKey: pool.key, max: opt.max });
        const abs = Math.abs(opt.max);
        if (abs > Math.abs(entry.bestMax)) entry.bestMax = opt.max;
        map.set(opt.label, entry);
      }
    }
  }

  return [...map.values()].sort((a, b) => a.label.localeCompare(b.label));
}
