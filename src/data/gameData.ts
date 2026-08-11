// SpiritVale game data, encoded from mechanics/formulas.md and
// mechanics/SpiritVale_Elements.png (element art by Brilett).
//
// SOURCE OF TRUTH: to change game data, edit THIS file (and formulas.ts for math).

import type {
  ArchetypeKey,
  AttackType,
  Attributes,
  Build,
  DamageConfig,
  ElementKey,
  GearMods,
  SkillEntry,
  StanceKey,
  Target,
  WeaponKey,
} from "@/lib/types";

export const ELEMENTS: ElementKey[] = [
  "neutral",
  "poison",
  "ghost",
  "undead",
  "fire",
  "earth",
  "wind",
  "water",
  "holy",
  "shadow",
];

export const ELEMENT_LABEL: Record<ElementKey, string> = {
  neutral: "Neutral",
  poison: "Poison",
  ghost: "Ghost",
  undead: "Undead",
  fire: "Fire",
  earth: "Earth",
  wind: "Wind",
  water: "Water",
  holy: "Holy",
  shadow: "Shadow",
};

// CSS variable name for each element accent color (see globals.css).
export const ELEMENT_COLOR_VAR: Record<ElementKey, string> = {
  neutral: "--el-neutral",
  poison: "--el-poison",
  ghost: "--el-ghost",
  undead: "--el-undead",
  fire: "--el-fire",
  earth: "--el-earth",
  wind: "--el-wind",
  water: "--el-water",
  holy: "--el-holy",
  shadow: "--el-shadow",
};

// Element effectiveness: EFFECTIVENESS[attacker][defender] = percent (100 = normal).
// Encoded directly from the in-game element chart. Blank cells default to 100.
const OVERRIDES: Partial<Record<ElementKey, Partial<Record<ElementKey, number>>>> = {
  neutral: { poison: 75, ghost: 75 },
  poison: { neutral: 125, poison: 75, ghost: 75, undead: 75 },
  ghost: { neutral: 125, ghost: 75, undead: 125, shadow: 75 },
  undead: { poison: 125, ghost: 125, undead: 75, holy: 75 },
  fire: { undead: 125, fire: 75, earth: 125, water: 75 },
  earth: { poison: 125, fire: 75, earth: 75, wind: 125 },
  wind: { earth: 75, wind: 75, water: 125 },
  water: { fire: 125, wind: 75, water: 75 },
  holy: { poison: 75, ghost: 125, holy: 75, shadow: 125 },
  shadow: { ghost: 125, undead: 75, holy: 125, shadow: 75 },
};

export const EFFECTIVENESS: Record<ElementKey, Record<ElementKey, number>> =
  Object.fromEntries(
    ELEMENTS.map((atk) => [
      atk,
      Object.fromEntries(
        ELEMENTS.map((def) => [def, OVERRIDES[atk]?.[def] ?? 100]),
      ) as Record<ElementKey, number>,
    ]),
  ) as Record<ElementKey, Record<ElementKey, number>>;

export function elementMultiplier(attacker: ElementKey, defender: ElementKey): number {
  return EFFECTIVENESS[attacker][defender];
}

// Base Attack Delay (BAD) per weapon + attack type category.
export interface WeaponInfo {
  label: string;
  bad: number;
  type: AttackType;
}

export const WEAPONS: Record<WeaponKey, WeaponInfo> = {
  unarmed: { label: "Unarmed", bad: 0.9, type: "melee" },
  dagger: { label: "Dagger", bad: 1.0, type: "melee" },
  twinblade: { label: "Twinblade", bad: 1.0, type: "melee" },
  sword: { label: "Sword", bad: 1.1, type: "melee" },
  book: { label: "Book", bad: 1.1, type: "magic" },
  mace: { label: "Mace", bad: 1.15, type: "melee" },
  instrument: { label: "Instrument", bad: 1.15, type: "magic" },
  spear: { label: "Spear", bad: 1.2, type: "melee" },
  wand: { label: "Wand", bad: 1.2, type: "magic" },
  scythe: { label: "Scythe", bad: 1.2, type: "melee" },
  axe: { label: "Axe", bad: 1.3, type: "melee" },
  bow: { label: "Bow", bad: 1.4, type: "ranged" },
  pistol: { label: "Pistol", bad: 1.2, type: "ranged" },
  gatlingGun: { label: "Gatling Gun", bad: 1.4, type: "ranged" },
  rifle: { label: "Rifle", bad: 1.5, type: "ranged" },
  shotgun: { label: "Shotgun", bad: 2.0, type: "ranged" },
  launcher: { label: "Launcher", bad: 2.0, type: "ranged" },
};

export const WEAPON_KEYS = Object.keys(WEAPONS) as WeaponKey[];

// HealthMax archetype% (applied to the LSUM term).
export const ARCHETYPES: Record<ArchetypeKey, { label: string; hpPct: number }> = {
  warrior: { label: "Warrior", hpPct: 130 },
  knight: { label: "Knight", hpPct: 100 },
  rogue: { label: "Rogue", hpPct: 85 },
  scout: { label: "Scout", hpPct: 75 },
  acolyte: { label: "Acolyte", hpPct: 75 },
  summoner: { label: "Summoner", hpPct: 70 },
  mage: { label: "Mage", hpPct: 50 },
  weaver: { label: "Weaver", hpPct: 50 },
};

export const ARCHETYPE_KEYS = Object.keys(ARCHETYPES) as ArchetypeKey[];

// ---- Stances ----
// Stance is derived from the off-hand slot, not from weapon type.
// Source: mechanics/stances.md
export interface StanceInfo {
  label: string;
  requirement: string;
  mult: number; // applied to meleeAtk, rangedAtk, and matk as a final multiplier
  color: string; // Tailwind text-color class for badge
}

export const STANCES: Record<StanceKey, StanceInfo> = {
  twoHanded: {
    label: "Two-Handed",
    requirement: "Main weapon only (no off-hand)",
    mult: 1.25,
    color: "text-primary",
  },
  oneHanded: {
    label: "One-Handed",
    requirement: "Main weapon + Shield",
    mult: 1.0,
    color: "text-muted",
  },
  dualWield: {
    label: "Dual Wield",
    requirement: "Main weapon + Off-hand weapon",
    mult: 1.0,
    color: "text-muted",
  },
};

/** Derive the active stance from the build's off-hand slot. */
export function getStance(build: Pick<Build, "offhand">): StanceInfo & { key: StanceKey } {
  const key: StanceKey =
    build.offhand === "none"
      ? "twoHanded"
      : build.offhand === "shield"
        ? "oneHanded"
        : "dualWield";
  return { key, ...STANCES[key] };
}

// Status resist: 0.66% resist per point of the given attribute.
export const STATUS_RESIST: { attr: keyof Attributes; effects: string }[] = [
  { attr: "STR", effects: "Bleed / Stagger" },
  { attr: "AGI", effects: "Slow / Freeze" },
  { attr: "VIT", effects: "Stun / Decay" },
  { attr: "INT", effects: "Silence / Burn" },
  { attr: "DEX", effects: "Poison / Blind" },
  { attr: "LUK", effects: "Curse / Weaken" },
];

export const STATUS_RESIST_PER_POINT = 0.66;

// Status effect glossary (debuffs then buffs), from formulas.md.
export const STATUS_EFFECTS: { name: string; kind: "debuff" | "buff"; desc: string }[] = [
  { name: "Stagger", kind: "debuff", desc: "Disable Block, -25% DEF" },
  { name: "Curse", kind: "debuff", desc: "Reverse Healing, -25% MDEF" },
  { name: "Burning", kind: "debuff", desc: "Stacking dmg, 3% HP dmg per second" },
  { name: "Bleeding", kind: "debuff", desc: "Stacking dmg, disable health recovery" },
  { name: "Poison", kind: "debuff", desc: "Stacking dmg, disable mana recovery" },
  { name: "Decay", kind: "debuff", desc: "Stacking dmg, -1% healing received per stack" },
  { name: "Slow", kind: "debuff", desc: "-50% Cast / Attack / Move speed" },
  { name: "Blind", kind: "debuff", desc: "-25% Hit / Flee / Crit" },
  { name: "Weaken", kind: "debuff", desc: "-25% Final Damage" },
  { name: "Vulnerability", kind: "debuff", desc: "+1% Physical damage taken (max 25 stacks)" },
  { name: "Magic Exposure", kind: "debuff", desc: "+1% Magical damage taken (max 25 stacks)" },
  { name: "Might", kind: "buff", desc: "+1% Melee/Magic/Ranged damage (max 25 stacks)" },
  { name: "Frenzy", kind: "buff", desc: "+25% Attack speed, +1 Attack speed limit" },
  { name: "Focus", kind: "buff", desc: "+25% Cast speed" },
  { name: "Haste", kind: "buff", desc: "+25% Move speed, +10 AGI" },
  { name: "Fury", kind: "buff", desc: "+20% Crit" },
  { name: "Vitality", kind: "buff", desc: "+20% Health, +10 VIT" },
  { name: "Regeneration", kind: "buff", desc: "Stacking recovery, +1% healing received (max 25 stacks)" },
  { name: "Protection", kind: "buff", desc: "+25% Block" },
  { name: "Defiance", kind: "buff", desc: "+10% Final Damage Reduction" },
  { name: "Stability", kind: "buff", desc: "No Flinch, No Knockback" },
  { name: "Blood Lust", kind: "buff", desc: "+25 HP Siphon" },
  { name: "Grace", kind: "buff", desc: "+100% HP/MP recovery rate" },
  { name: "Benediction", kind: "buff", desc: "+10 STR/INT/DEX/LUK, +20 Hit" },
  { name: "Zeal", kind: "buff", desc: "+15 Atk/Matk" },
  { name: "Guardian Spirit", kind: "buff", desc: "Immune to ranged damage" },
  { name: "Aegis", kind: "buff", desc: "Immune to all damage" },
];

// ---- Defaults ----

export const DEFAULT_ATTRS: Attributes = {
  LV: 100,
  STR: 1,
  AGI: 1,
  VIT: 1,
  INT: 1,
  DEX: 1,
  LUK: 1,
};

export const DEFAULT_GEAR: GearMods = {
  ATK: 0,
  WeaponATK: 0,
  OffhandATK: 0,
  MATK: 0,
  WeaponMATK: 0,
  OffhandMATK: 0,
  MASTERY: 0,
  DEF: 0,
  MDEF: 0,
  HIT: 0,
  FLEE: 0,
  CRIT: 0,
  PerfectDodge: 0,
  CritDef: 0,
  HP: 0,
  MP: 0,
  FlatRegen: 0,
  SiphonHp: 0,
  SiphonMp: 0,
  ATKpct: 0,
  MATKpct: 0,
  DEFpct: 0,
  MDEFpct: 0,
  Critpct: 0,
  CritDamagepct: 0,
  Fleepct: 0,
  Hitpct: 0,
  CastSpdpct: 0,
  AtkSpdpct: 0,
  Hppct: 0,
  Mppct: 0,
  Regenpct: 0,
  MaxHPRegenpct: 0,
  MaxMPRegenpct: 0,
  Reflectpct: 0,
  Healingpct: 0,
  StatusDamagepct: 0,
  LeechHppct: 0,
  LeechMppct: 0,
  Multistrikepct: 0,
  AspdLimit: 193,
};

export const BASE_ASPD_LIMIT = 193;

export const DEFAULT_TARGET: Target = {
  enabled: false,
  DEF: 100,
  MDEF: 100,
  FLEE: 200,
  element: "neutral",
};

/** Shape of a fresh skill row. `id` is assigned by the caller. */
export const DEFAULT_SKILL: Omit<SkillEntry, "id"> = {
  name: "My Skill",
  damagePct: 500,
  hits: 1,
  critApplies: true,
  multistrikeApplies: false,
  attackType: "weapon",
  baseCastTime: 2,
  cooldownSec: 0,
  enabled: true,
  multipliers: [],
};

export const DEFAULT_DAMAGE: DamageConfig = {
  aa: { enabled: true, multipliers: [] },
  skills: { enabled: true, entries: [] },
  status: {
    enabled: true,
    stacks: 1,
    critApplies: false,
    multipliers: [],
  },
  autocast: {
    enabled: true,
    name: "Autocast Skill",
    damagePct: 300,
    chancePct: 20,
    critApplies: true,
    attackType: "weapon",
    multipliers: [],
  },
};

export function makeDefaultBuild(name = "New Build"): Build {
  return {
    id: crypto.randomUUID(),
    name,
    attrs: { ...DEFAULT_ATTRS },
    gear: { ...DEFAULT_GEAR },
    weapon: "sword",
    offhand: "none",
    archetype: "knight",
    element: "neutral",
    target: { ...DEFAULT_TARGET },
    skillCastTime: 2,
    skillDelaySec: 0.3,
    durationSec: 10,
    leechDamageBasis: 0,
    damage: {
      aa: { enabled: true, multipliers: [] },
      skills: {
        enabled: true,
        entries: [{ ...DEFAULT_SKILL, id: crypto.randomUUID(), multipliers: [] }],
      },
      status: { ...DEFAULT_DAMAGE.status, multipliers: [] },
      autocast: { ...DEFAULT_DAMAGE.autocast, multipliers: [] },
    },
  };
}
