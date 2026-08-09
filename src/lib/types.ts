// Shared types for SpiritCal.
// Game math is defined in src/lib/formulas.ts and src/data/gameData.ts.

export type ElementKey =
  | "neutral"
  | "poison"
  | "ghost"
  | "undead"
  | "fire"
  | "earth"
  | "wind"
  | "water"
  | "holy"
  | "shadow";

export type WeaponKey =
  | "unarmed"
  | "dagger"
  | "twinblade"
  | "sword"
  | "book"
  | "mace"
  | "instrument"
  | "spear"
  | "wand"
  | "scythe"
  | "axe"
  | "bow"
  | "pistol"
  | "gatlingGun"
  | "rifle"
  | "shotgun"
  | "launcher";

export type AttackType = "melee" | "ranged" | "magic";

export type StanceKey = "twoHanded" | "oneHanded" | "dualWield";

export type ArchetypeKey =
  | "warrior"
  | "knight"
  | "rogue"
  | "scout"
  | "acolyte"
  | "summoner"
  | "mage"
  | "weaver";

export interface Attributes {
  LV: number;
  STR: number;
  AGI: number;
  VIT: number;
  INT: number;
  DEX: number;
  LUK: number;
}

// Flat + percent modifiers coming from gear, buffs, etc.
// Percent values are stored as whole numbers (10 = 10%).
export interface GearMods {
  // flat
  ATK: number;
  MASTERY: number;
  DEF: number;
  MDEF: number;
  HIT: number;
  FLEE: number;
  CRIT: number;
  PerfectDodge: number;
  CritDef: number;
  HP: number;
  MP: number;
  FlatRegen: number;
  /** Flat per-hit HP recovered on autoattacks (see mechanics/formulas.md "Leech & Siphon"). */
  SiphonHp: number;
  /** Flat per-hit MP recovered on autoattacks. */
  SiphonMp: number;
  // percent
  ATKpct: number;
  MATKpct: number;
  DEFpct: number;
  MDEFpct: number;
  Critpct: number;
  CritDamagepct: number;
  Fleepct: number;
  Hitpct: number;
  CastSpdpct: number;
  AtkSpdpct: number;
  Hppct: number;
  Mppct: number;
  Regenpct: number;
  MaxHPRegenpct: number;
  MaxMPRegenpct: number;
  Reflectpct: number;
  Healingpct: number;
  StatusDamagepct: number;
  LeechHppct: number;
  LeechMppct: number;
  Multistrikepct: number;
  AspdLimit: number;
}

export interface Target {
  enabled: boolean;
  DEF: number;
  MDEF: number;
  FLEE: number;
  element: ElementKey;
}

export interface Build {
  id: string;
  name: string;
  attrs: Attributes;
  gear: GearMods;
  weapon: WeaponKey;
  offhand: WeaponKey | "none" | "shield";
  archetype: ArchetypeKey;
  element: ElementKey;
  target: Target;
  /** Base cast time (in seconds) of the skill being tested. Persisted with presets. */
  skillCastTime: number;
  /** Duration (seconds) used for the Damage Output total calculation. Default 10. */
  durationSec: number;
  /** Damage Output tab configuration. */
  damage: DamageConfig;
  /** Manual "damage dealt per second" used to estimate Leech recovery. */
  leechDamageBasis: number;
}

export type StatGroup =
  | "offense"
  | "speed"
  | "defense"
  | "crit"
  | "damage"
  | "accuracy"
  | "resources"
  | "utility"
  | "vsTarget";

export interface StatResult {
  key: string;
  label: string;
  value: number;
  display: string;
  formula: string;
  group: StatGroup;
  hint?: string;
}

/** A single named damage multiplier added by the user (e.g. "vs Fire enemy +30%"). */
export interface DamageMultiplier {
  id: string;
  name: string;
  pct: number;
  enabled: boolean;
}

/** One skill in the rotation. Cast time is pre-CTR; the reduction is applied at compute time. */
export interface SkillEntry {
  id: string;
  name: string;
  damagePct: number;
  hits: number;
  critApplies: boolean;
  /** Listed cast time in seconds, before Cast Time Reduction. */
  baseCastTime: number;
  /** Cooldown in seconds, counted from when the cast completes. */
  cooldownSec: number;
  enabled: boolean;
  multipliers: DamageMultiplier[];
}

/** Per-damage-type configuration stored in the build.
 *  Every group carries `enabled` so builds that lack a source (e.g. classes with
 *  no autocast) can switch it off entirely. */
export interface DamageConfig {
  aa: {
    enabled: boolean;
    multipliers: DamageMultiplier[];
  };
  skills: {
    enabled: boolean;
    entries: SkillEntry[];
  };
  status: {
    enabled: boolean;
    stacks: number;
    critApplies: boolean;
    multipliers: DamageMultiplier[];
  };
  autocast: {
    enabled: boolean;
    name: string;
    damagePct: number;
    chancePct: number;
    critApplies: boolean;
    multipliers: DamageMultiplier[];
  };
}

// ── Set Compare types ─────────────────────────────────────────────────────────

/** One stat change row in the Set Compare editor. */
export interface StatDelta {
  id: string;
  /** key from STAT_FIELDS (keyof Attributes | keyof GearMods) */
  key: string;
  value: number;
}

/** One gear swap card in the Set Compare tab. */
export interface GearSwapCard {
  id: string;
  /** Free text label, e.g. "Helmet: Iron → Dragon". */
  name: string;
  /** When false, this card is excluded from the combined result. */
  enabled: boolean;
  removing: StatDelta[];
  adding: StatDelta[];
}

/** State for the Set Compare tab — session only, not persisted. */
export interface SetCompareState {
  cards: GearSwapCard[];
}

// ── Loadout types ─────────────────────────────────────────────────────────────

/** One substat entry on a piece of gear. */
export interface LoadoutSubstat {
  id: string;
  label: string;
  value: number;
}

/** One equipment slot in a loadout set. */
export interface LoadoutSlot {
  /** The pool this slot draws options from. */
  pool: import("@/data/essenceData").SlotKey;
  /** Optional custom label for the specific piece, e.g. "Dragon Helm +7". */
  name: string;
  substats: LoadoutSubstat[];
}

/** A full named gear set. */
export interface LoadoutSet {
  id: string;
  name: string;
  slots: Record<import("@/data/loadoutData").GearSlotId, LoadoutSlot>;
}
