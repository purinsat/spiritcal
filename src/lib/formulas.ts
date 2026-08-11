// SpiritVale stat engine. Ported 1:1 from mechanics/formulas.md.
//
// Conventions:
//  - Percent gear values are whole numbers (10 => 10%); we divide by 100 here.
//  - FLOOR/ROUND match the spreadsheet functions used in the source.
//  - Every function returns a numeric value; computeStats() wraps them with
//    labels + the original formula text for the UI breakdown.
//
// SOURCE OF TRUTH for the math is mechanics/formulas.md. Keep this in sync.

import { ARCHETYPES, WEAPONS, elementMultiplier, getStance, DEFAULT_DAMAGE } from "@/data/gameData";
import type { AttackType, Build, DamageMultiplier, StatResult } from "@/lib/types";

const FLOOR = Math.floor;
const ROUND = Math.round;

/** Base Attack Delay for the build, accounting for dual wield.
 *  Only applies the dual-wield formula when the off-hand is an actual weapon
 *  (not "none" and not "shield"). */
export function baseAttackDelay(build: Build): number {
  const main = WEAPONS[build.weapon].bad;
  if (build.offhand !== "none" && build.offhand !== "shield") {
    const off = WEAPONS[build.offhand].bad;
    return (main + off) * 0.8; // Dual Wield: (BAD1 + BAD2) * 0.8
  }
  return main;
}

export interface Computed {
  meleeAtk: number;
  rangedAtk: number;
  matk: number;
  /** The effective attack used in damage formulas.
   *  Single-weapon builds: the primary attack type.
   *  Dual wield: sum of main-hand total + off-hand total (each using its own weapon's type). */
  attackByType: number;
  /** Main-hand attack total (always populated). */
  mainAtk: number;
  /** Off-hand attack total (0 for non-dual-wield builds). */
  offAtk: number;
  /** Per-type attack for skills and autocast: one full formula run per equipped weapon
   *  whose own type matches, then summed — the same rule autoattacks use.
   *  When no equipped weapon has that type, a single run off non-weapon flat stats.
   *  For single-weapon builds these equal meleeAtk/rangedAtk/matk. */
  skillAtkByType: Record<import("@/lib/types").AttackType, number>;
  /** How many weapons contributed a run to each entry of skillAtkByType (1 when none matched). */
  skillWeaponRunsByType: Record<import("@/lib/types").AttackType, number>;
  stanceMult: number;
  def: number;
  mdef: number;
  hit: number;
  flee: number;
  critRate: number;
  critDamage: number;
  hp: number;
  mp: number;
}

/** Helper: run the full attack formula for one weapon's contribution.
 *  `flatAtk` = non-weapon ATK + this weapon's own ATK (used for melee/ranged).
 *  `flatMatk` = non-weapon MATK + this weapon's own MATK (used for magic).
 *  Mastery is always shared. */
function attackForWeapon(
  type: import("@/lib/types").AttackType,
  flatAtk: number,
  flatMatk: number,
  attrs: Build["attrs"],
  mastery: number,
  atkPct: number,
  matkPct: number,
  stanceMult: number,
): number {
  const { LV, STR, DEX, INT, LUK } = attrs;
  if (type === "magic") {
    return (
      (LV / 4 + INT * 1.5 + DEX / 5 + mastery + flatMatk * (1 + INT / 200)) *
      (1 + FLOOR(INT / 10) / 100) *
      (1 + matkPct) *
      stanceMult
    );
  }
  if (type === "ranged") {
    return (
      (LV / 4 + DEX + STR / 5 + LUK / 5 + mastery + flatAtk * (1 + DEX / 200)) *
      (1 + FLOOR(DEX / 10) / 100) *
      (1 + atkPct) *
      stanceMult
    );
  }
  // melee
  return (
    (LV / 4 + STR * 1.5 + DEX / 5 + LUK / 5 + mastery + flatAtk * (1 + STR / 200)) *
    (1 + FLOOR(STR / 10) / 100) *
    (1 + atkPct) *
    stanceMult
  );
}

/** Core numbers reused by several stats. */
export function computeCore(build: Build): Computed {
  const { LV, STR, AGI, VIT, INT, DEX, LUK } = build.attrs;
  const g = build.gear;

  const atkPct = g.ATKpct / 100;
  const matkPct = g.MATKpct / 100;

  // Stance is a final multiplier on all attack outputs (applied at the end,
  // per formulas.md: "Unique multipliers are applied at the end").
  const stanceMult = getStance(build).mult;

  // Flat ATK/MATK pools for single-weapon and per-weapon use.
  const flatAtkMain = g.ATK + g.WeaponATK;
  const flatMatkMain = g.MATK + g.WeaponMATK;

  // Single-weapon totals (single run each type using main-hand weapon's own ATK).
  const meleeAtk = attackForWeapon("melee", flatAtkMain, flatMatkMain, build.attrs, g.MASTERY, atkPct, matkPct, stanceMult);
  const rangedAtk = attackForWeapon("ranged", flatAtkMain, flatMatkMain, build.attrs, g.MASTERY, atkPct, matkPct, stanceMult);
  const matk = attackForWeapon("magic", flatAtkMain, flatMatkMain, build.attrs, g.MASTERY, atkPct, matkPct, stanceMult);

  const isDual = build.offhand !== "none" && build.offhand !== "shield";
  const mainType = WEAPONS[build.weapon].type;
  const offType = isDual
    ? WEAPONS[build.offhand as import("@/lib/types").WeaponKey].type
    : null;

  // Main-hand total always uses the main weapon's type.
  const mainAtk = attackForWeapon(mainType, flatAtkMain, flatMatkMain, build.attrs, g.MASTERY, atkPct, matkPct, stanceMult);

  // Off-hand total uses its own weapon type and its own weapon ATK/MATK.
  const flatAtkOff = g.ATK + g.OffhandATK;
  const flatMatkOff = g.MATK + g.OffhandMATK;
  const offAtk = offType
    ? attackForWeapon(offType, flatAtkOff, flatMatkOff, build.attrs, g.MASTERY, atkPct, matkPct, stanceMult)
    : 0;

  // Dual wield effective ATK = sum of both weapon totals (for autoattacks).
  const attackByType = isDual ? mainAtk + offAtk : mainAtk;

  // Skill / autocast ATK: one full formula run per equipped weapon of the matching type,
  // then summed — the same rule autoattacks use. Dev-confirmed Aug 2026: dual wielding
  // magic weapons shows two MATK values in the stat window, just as physical shows two ATK.
  const equipped: { type: AttackType; atk: number; matk: number }[] = [
    { type: mainType, atk: g.WeaponATK, matk: g.WeaponMATK },
    ...(offType ? [{ type: offType, atk: g.OffhandATK, matk: g.OffhandMATK }] : []),
  ];

  const run = (t: AttackType, atk: number, matk: number) =>
    attackForWeapon(t, g.ATK + atk, g.MATK + matk, build.attrs, g.MASTERY, atkPct, matkPct, stanceMult);

  const skillAtkFor = (t: AttackType): { total: number; runs: number } => {
    const matching = equipped.filter((w) => w.type === t);
    if (matching.length > 0) {
      return {
        total: matching.reduce((sum, w) => sum + run(t, w.atk, w.matk), 0),
        runs: matching.length,
      };
    }
    // No equipped weapon of this type — a single run off non-weapon flat stats.
    // Stray weapon flats are carried, but the off-type branch ignores them
    // (magic reads only MATK, melee/ranged only ATK), so a pistol adds nothing to magic.
    return {
      total: run(
        t,
        equipped.reduce((s, w) => s + w.atk, 0),
        equipped.reduce((s, w) => s + w.matk, 0),
      ),
      runs: 1,
    };
  };

  const skillMelee = skillAtkFor("melee");
  const skillRanged = skillAtkFor("ranged");
  const skillMagic = skillAtkFor("magic");
  const skillAtkByType: Record<AttackType, number> = {
    melee: skillMelee.total,
    ranged: skillRanged.total,
    magic: skillMagic.total,
  };
  const skillWeaponRunsByType: Record<AttackType, number> = {
    melee: skillMelee.runs,
    ranged: skillRanged.runs,
    magic: skillMagic.runs,
  };

  const def = g.DEF * (1 + VIT / 1000 + g.DEFpct / 100);
  const mdef = g.MDEF * (1 + INT / 1000 + g.MDEFpct / 100);

  const hit = (LV + DEX * 2 + g.HIT + 25) * (1 + g.Hitpct / 100);
  const flee =
    (LV + AGI + LUK / 5 + 3 * FLOOR(AGI / 10) + g.FLEE) * (1 + g.Fleepct / 100);

  const critRate = (LUK / 3 + FLOOR(LUK / 10) + g.CRIT) * (1 + g.Critpct / 100);
  const critDamage = 120 + FLOOR(LUK / 10) * 2 + g.CritDamagepct;

  // LSUM bonus HP stops scaling at LV130.
  const lsumLv = Math.min(LV, 130);
  const lsum = (lsumLv * (lsumLv + 1)) / 2;
  const archPct = ARCHETYPES[build.archetype].hpPct / 100;
  const hp =
    ((90 + LV * 10 + lsum * archPct) * (1 + VIT / 100) + g.HP) * (1 + g.Hppct / 100);
  const mp = ((45 + LV * 5) * (1 + INT / 100) + g.MP) * (1 + g.Mppct / 100);

  return {
    meleeAtk,
    rangedAtk,
    matk,
    attackByType,
    mainAtk,
    offAtk,
    skillAtkByType,
    skillWeaponRunsByType,
    stanceMult,
    def,
    mdef,
    hit,
    flee,
    critRate,
    critDamage,
    hp,
    mp,
  };
}

function fmt(n: number, digits = 0): string {
  if (!isFinite(n)) return "-";
  return n.toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export interface AttackBreakdown {
  /** Stable unique key for rendering. Single weapon: "melee" | "ranged" | "magic".
   *  Dual wield: "main" | "off" | "combined". Never derived from type. */
  id: string;
  type: AttackType;
  label: string;
  driver: string;    // main scaling attribute displayed in the UI
  base: number;      // value before stance multiplier
  stanceMult: number;
  total: number;
  isPrimary: boolean; // true when this attack type matches the equipped weapon
  /** Badge text shown on the tile. Defaults to "Primary" when isPrimary is true. */
  badgeLabel?: string;
  /** Short type chip shown on dual wield tiles, e.g. "Melee" or "Ranged + Magic". */
  typeLabel?: string;
  /** True when this entry is the combined (summed) dual wield total row. */
  isCombined?: boolean;
}

const TYPE_DRIVER: Record<AttackType, string> = { melee: "STR", ranged: "DEX", magic: "INT" };

/** Returns attack breakdowns for the UI.
 *  - Single weapon: three tiles (melee, ranged, magic) as before.
 *  - Dual wield: main-hand tile + off-hand tile + combined total tile. */
export function computeAttacks(build: Build): AttackBreakdown[] {
  const c = computeCore(build);
  const isDual = build.offhand !== "none" && build.offhand !== "shield";

  if (isDual) {
    const mainType = WEAPONS[build.weapon].type;
    const offType = WEAPONS[build.offhand as import("@/lib/types").WeaponKey].type;
    const TYPE_CHIP: Record<AttackType, string> = { melee: "Melee", ranged: "Ranged", magic: "Magic" };
    const combinedTypeLabel = mainType === offType
      ? TYPE_CHIP[mainType]
      : `${TYPE_CHIP[mainType]} + ${TYPE_CHIP[offType]}`;
    return [
      {
        id: "main",
        type: mainType,
        label: `Main Hand (${WEAPONS[build.weapon].label})`,
        driver: TYPE_DRIVER[mainType],
        base: c.mainAtk / c.stanceMult,
        stanceMult: c.stanceMult,
        total: c.mainAtk,
        isPrimary: true,
        badgeLabel: "Main",
        typeLabel: TYPE_CHIP[mainType],
      },
      {
        id: "off",
        type: offType,
        label: `Off Hand (${WEAPONS[build.offhand as import("@/lib/types").WeaponKey].label})`,
        driver: TYPE_DRIVER[offType],
        base: c.offAtk / c.stanceMult,
        stanceMult: c.stanceMult,
        total: c.offAtk,
        isPrimary: true,
        badgeLabel: "Off",
        typeLabel: TYPE_CHIP[offType],
      },
      {
        id: "combined",
        type: mainType,
        label: "Combined ATK",
        driver: "Both",
        base: (c.mainAtk + c.offAtk) / c.stanceMult,
        stanceMult: c.stanceMult,
        total: c.mainAtk + c.offAtk,
        isPrimary: true,
        badgeLabel: "Total",
        typeLabel: combinedTypeLabel,
        isCombined: true,
      },
    ];
  }

  const weaponType = WEAPONS[build.weapon].type;
  return [
    {
      id: "melee",
      type: "melee",
      label: "Melee Attack",
      driver: "STR",
      base: c.meleeAtk / c.stanceMult,
      stanceMult: c.stanceMult,
      total: c.meleeAtk,
      isPrimary: weaponType === "melee",
    },
    {
      id: "ranged",
      type: "ranged",
      label: "Ranged Attack",
      driver: "DEX",
      base: c.rangedAtk / c.stanceMult,
      stanceMult: c.stanceMult,
      total: c.rangedAtk,
      isPrimary: weaponType === "ranged",
    },
    {
      id: "magic",
      type: "magic",
      label: "Magic Attack",
      driver: "INT",
      base: c.matk / c.stanceMult,
      stanceMult: c.stanceMult,
      total: c.matk,
      isPrimary: weaponType === "magic",
    },
  ];
}

export interface SpeedResult {
  bad: number;
  aspdRaw: number;
  aspdLimit: number;
  aspd: number;
  isCapped: boolean;
  attackDelay: number;
  hitsPerSec: number;
  multistrikePct: number;
  guaranteedExtra: number;
  extraChance: number;
  avgHitsPerAttack: number;
  effectiveHitsPerSec: number;
  castSpeed: number;
  /** castTime is a multiplier on a skill's base cast time.
   *  E.g. castTime 0.525 means skills take 52.5% of their listed cast time. */
  castTime: number;
  /** Skill delay in SECONDS — the game's "time between skill casts", the cast-speed twin of
   *  attackDelay. Numerically identical to castTime because the CastSpeed formula has no
   *  per-skill base term where ASPD has BAD, so its baseline reference skill is exactly 1s.
   *  Kept as a separate named field so callers never have to read a multiplier as a duration. */
  skillDelaySec: number;
  /** Ceiling on how many skills can be cast per second, across all skills: 1 / skillDelaySec. */
  maxCastsPerSec: number;
  /** Exact (unrounded) cast time reduction percentage, used for the tile display. */
  ctrExact: number;
  /** Rounded integer CTR as per the dev formula, used in the stat sheet. */
  ctr: number;
  /** The skill base cast time the player entered (seconds). */
  skillCastTime: number;
  /** Actual cast time after reduction: skillCastTime × castTime (seconds). */
  actualCastTime: number;
  /** Seconds saved vs the listed skill cast time. */
  secondsSaved: number;
}

/** Computes all speed-related stats for the SpeedSection UI. */
export function computeSpeed(build: Build): SpeedResult {
  const { AGI, DEX, INT } = build.attrs;
  const g = build.gear;

  const bad = baseAttackDelay(build);

  const aspdRaw =
    200 -
    (50 * bad * (1 - (AGI / 250 + DEX / 1000))) / (1 + g.AtkSpdpct / 100) +
    0.5 * FLOOR(AGI / 10);

  // Clamp limit below 199 so attackDelay stays positive.
  const aspdLimit = Math.min(g.AspdLimit ?? 193, 199);
  const aspd = Math.min(aspdRaw, aspdLimit);
  const isCapped = aspdRaw > aspdLimit;

  const attackDelay = (200 - aspd) / 50;
  const hitsPerSec = 1 / attackDelay;

  const multistrikePct = g.Multistrikepct ?? 0;
  const guaranteedExtra = FLOOR(multistrikePct / 100);
  const extraChance = (multistrikePct % 100) / 100;
  const avgHitsPerAttack = 1 + multistrikePct / 100;
  const effectiveHitsPerSec = hitsPerSec * avgHitsPerAttack;

  const castSpeed =
    200 -
    (50 * (1 - (DEX + INT / 2) / 400)) / (1 + g.CastSpdpct / 100) +
    0.5 * FLOOR(DEX / 10);
  // (200 - CastSpeed) / 50 drives the cast time multiplier and CTR.
  // Clamp to 0 so CastSpeed > 200 doesn't produce a negative multiplier.
  const castTime = Math.max(0, (200 - castSpeed) / 50);
  // Skill delay is a manual input (read from the in-game stat window) because the dev has
  // not published the formula and it depends on ASPD, not Cast Speed.
  const skillDelaySec = build.skillDelaySec ?? 0.3;
  const maxCastsPerSec = skillDelaySec > 0 ? 1 / skillDelaySec : Infinity;
  // ctrExact for the tile (reconciles with seconds shown); ctr is the dev-rounded value.
  const ctrExact = Math.min(100, (1 - castTime) * 100);
  const ctr = ROUND(ctrExact);

  const skillCastTime = build.skillCastTime ?? 2;
  const actualCastTime = skillCastTime * castTime;
  const secondsSaved = skillCastTime - actualCastTime;

  return {
    bad,
    aspdRaw,
    aspdLimit,
    aspd,
    isCapped,
    attackDelay,
    hitsPerSec,
    multistrikePct,
    guaranteedExtra,
    extraChance,
    avgHitsPerAttack,
    effectiveHitsPerSec,
    castSpeed,
    castTime,
    skillDelaySec,
    maxCastsPerSec,
    ctrExact,
    ctr,
    skillCastTime,
    actualCastTime,
    secondsSaved,
  };
}

export interface CritResult {
  critRateRaw: number;
  critChance: number;       // clamped 0-100
  isOvercapped: boolean;
  overcapBy: number;        // how many points are wasted (0 if not overcapped)
  critDamagePct: number;    // e.g. 150 means 1.50x
  critMultiplier: number;   // average damage multiplier, e.g. 1.20
}

/** Computes all crit-related stats for the CriticalSection UI. */
export function computeCrit(build: Build): CritResult {
  const { LUK } = build.attrs;
  const g = build.gear;

  const critRateRaw = (LUK / 3 + FLOOR(LUK / 10) + g.CRIT) * (1 + g.Critpct / 100);
  const critChance = Math.min(100, Math.max(0, critRateRaw));
  const isOvercapped = critRateRaw > 100;
  const overcapBy = isOvercapped ? critRateRaw - 100 : 0;

  // CritDamage is a percentage: 120 = 1.20x (base), higher with gear.
  const critDamagePct = 120 + FLOOR(LUK / 10) * 2 + g.CritDamagepct;

  const p = critChance / 100;
  // Average multiplier: non-crit fraction × 1 + crit fraction × (critDamagePct/100).
  const critMultiplier = (1 - p) + p * (critDamagePct / 100);

  return { critRateRaw, critChance, isOvercapped, overcapBy, critDamagePct, critMultiplier };
}

export interface DefenseResult {
  def: number;
  mdef: number;
  physTaken: number; // 100 / (DEF + 100) — fraction of incoming physical damage taken
  magicTaken: number; // same curve, on MDEF
  physReductionPct: number;
  magicReductionPct: number;
  ehpPhysical: number; // maxHP / physTaken
  ehpMagic: number; // maxHP / magicTaken
  /** Extra reduction% a further +50 DEF would add — illustrates the diminishing curve. */
  nextPhys50: number;
  flee: number;
  monsterHit: number;
  dodgePct: number;
  perfectDodge: number;
  critDef: number;
  reflect: number;
}

/** Computes all defense-related stats for the DefenseSection UI.
 *  `monsterLevel` is a local what-if input (not persisted); defaults to the player's own LV. */
export function computeDefense(build: Build, monsterLevel?: number): DefenseResult {
  const { LV, LUK } = build.attrs;
  const g = build.gear;
  const c = computeCore(build);

  // DamageReduction: 100 / (DEF + 100) returns the fraction of damage still TAKEN, not the
  // reduction — the dev formula is phrased that way. Reduction% is derived from it.
  const physTaken = 100 / (c.def + 100);
  const magicTaken = 100 / (c.mdef + 100);
  const physReductionPct = (1 - physTaken) * 100;
  const magicReductionPct = (1 - magicTaken) * 100;
  const ehpPhysical = physTaken > 0 ? c.hp / physTaken : Infinity;
  const ehpMagic = magicTaken > 0 ? c.hp / magicTaken : Infinity;

  // Diminishing returns: reduction% gained from the next +50 effective DEF.
  const nextPhysTaken = 100 / (c.def + 50 + 100);
  const nextPhys50 = (physTaken - nextPhysTaken) * 100;

  // Chance to hit: 100 + Attacker Hit - Defender Flee, with Average Monster Hit = LV*2.
  // Dodge is the inverse: your Flee minus the monster's hit stat.
  const monsterHit = (monsterLevel ?? LV) * 2;
  const dodgePct = Math.min(100, Math.max(0, c.flee - monsterHit));

  const perfectDodge = LUK / 10 + g.PerfectDodge;
  const critDef = LUK / 5 + g.CritDef;
  // DEF appears twice: once as total DEF (c.def, scaled by VIT/Def%) and once as the raw flat
  // DEF input (g.DEF, unscaled). ATK is the full computed attack for the equipped weapon type.
  const reflect = (LV + c.def / 2 + g.DEF / 2 + c.attackByType / 2) * 4 * (g.Reflectpct / 100);

  return {
    def: c.def,
    mdef: c.mdef,
    physTaken,
    magicTaken,
    physReductionPct,
    magicReductionPct,
    ehpPhysical,
    ehpMagic,
    nextPhys50,
    flee: c.flee,
    monsterHit,
    dodgePct,
    perfectDodge,
    critDef,
    reflect,
  };
}

export interface UtilityResult {
  hp: number;
  mp: number;
  hpRegen: number;
  mpRegen: number;
  siphonHpPerHit: number;
  siphonMpPerHit: number;
  siphonHpPerSec: number;
  siphonMpPerSec: number;
  leechHpRaw: number; // HP Leech% × damage / 3, before cap
  leechMpRaw: number; // MP Leech% × damage / 3, before cap
  leechHp: number;
  leechMp: number;
  hpCap: number; // 20% of max HP
  mpCap: number; // 20% of max MP
  isHpCapped: boolean;
  isMpCapped: boolean;
  healing: number;
}

/** Computes all utility-related stats (HP/MP, regen, siphon, leech, healing). */
export function computeUtility(build: Build): UtilityResult {
  const { LV, STR, VIT, INT } = build.attrs;
  const g = build.gear;
  const c = computeCore(build);
  const sp = computeSpeed(build);

  const hpRegen =
    (c.hp / 100 + VIT / 5 + g.FlatRegen) * (1 + VIT / 100 + g.Regenpct / 100) +
    c.hp * (g.MaxHPRegenpct / 100);
  const mpRegen =
    (c.mp / 100 + INT / 5 + g.FlatRegen) * (1 + INT / 100 + g.Regenpct / 100) +
    c.mp * (g.MaxMPRegenpct / 100);

  const siphonHpPerHit = (g.SiphonHp * (LV + STR)) / 50;
  const siphonMpPerHit = (g.SiphonMp * (LV + INT)) / 50;
  // Siphon pays out on EVERY hit, including multistrike extras — the opposite of the
  // autocast rule (where multihits count as one hit). Do not "fix" this into consistency.
  const siphonHpPerSec = siphonHpPerHit * sp.effectiveHitsPerSec;
  const siphonMpPerSec = siphonMpPerHit * sp.effectiveHitsPerSec;

  const damageBasis = build.leechDamageBasis ?? 0;
  const hpCap = 0.2 * c.hp;
  const mpCap = 0.2 * c.mp;
  const leechHpRaw = ((g.LeechHppct / 100) * damageBasis) / 3;
  const leechMpRaw = ((g.LeechMppct / 100) * damageBasis) / 3;
  const leechHp = Math.min(leechHpRaw, hpCap);
  const leechMp = Math.min(leechMpRaw, mpCap);
  const isHpCapped = leechHpRaw > hpCap;
  const isMpCapped = leechMpRaw > mpCap;

  const healing = (LV + INT + VIT) * 2.5 * (g.Healingpct / 100);

  return {
    hp: c.hp,
    mp: c.mp,
    hpRegen,
    mpRegen,
    siphonHpPerHit,
    siphonMpPerHit,
    siphonHpPerSec,
    siphonMpPerSec,
    leechHpRaw,
    leechMpRaw,
    leechHp,
    leechMp,
    hpCap,
    mpCap,
    isHpCapped,
    isMpCapped,
    healing,
  };
}

/** Multiplicative product of all enabled multipliers.
 *  Each entry's factor is floored at zero so values below -100% cannot
 *  produce negative damage. */
function multProduct(multipliers: DamageMultiplier[]): number {
  return multipliers
    .filter((m) => m.enabled)
    .reduce((a, m) => a * Math.max(0, 1 + m.pct / 100), 1);
}

/** One skill's rotation contribution. */
export interface SkillResult {
  id: string;
  name: string;
  enabled: boolean;
  mult: number;
  /** Multistrike factor applied to this skill's hits (1 when multistrikeApplies is false). */
  multistrikeMult: number;
  /** Resolved attack type used (never "weapon" — always the concrete type). */
  attackType: import("@/lib/types").AttackType;
  /** The ATK value fed into this skill's damage formula. */
  atkUsed: number;
  /** How many equipped weapons contributed a formula run to atkUsed. */
  weaponRuns: number;
  /** Listed cast time after Cast Time Reduction. */
  actualCastTime: number;
  /** Cast + cooldown; cooldown is assumed to start when the cast completes. */
  cycleSec: number;
  perCast: number;
  perCastVsTarget: number;
  /** Share of the timeline spent casting this skill, before over-subscription scaling. */
  castFraction: number;
  /** Casts per second after scaling. */
  castsPerSec: number;
  castsInWindow: number;
  dps: number;
  dpsVsTarget: number;
  total: number;
}

export interface DamageBreakdownResult {
  // shared context
  atk: number;
  critMultiplier: number;
  baseHitsPerSec: number;
  effHitsPerSec: number;
  /** Average hits per autoattack swing (1 + Multistrike/100). Skills use this when multistrikeApplies. */
  avgHitsPerAttack: number;
  /** Multiplier applied to every skill's listed cast time. */
  castTimeMult: number;
  ctr: number;
  durationSec: number;

  // which sources are contributing
  aaOn: boolean;
  skillsOn: boolean;
  statusOn: boolean;
  autocastOn: boolean;
  /** Autocast is switched on but cannot proc because Auto Attack is off. */
  autocastSuppressedByAa: boolean;

  // Auto Attack (full rate, i.e. while actually autoattacking)
  aaMult: number;
  aaPerHit: number;
  aaDps: number;
  aaTotal: number;

  // Skills
  skills: SkillResult[];
  totalCastFraction: number;
  /** Fraction of the timeline left over for autoattacking. */
  aaUptime: number;
  /** Skills demand more cast time than the timeline has, so casts are scaled down. */
  isCastBound: boolean;
  /** Game's "time between skill casts" — (200 - CastSpeed) / 50. */
  skillDelaySec: number;
  /** Shared ceiling on casts per second across every skill: 1 / skillDelaySec. */
  maxCastsPerSec: number;
  /** What the cooldowns alone would allow, before the delay ceiling is applied. */
  desiredCastsPerSec: number;
  /** Casts per second actually achieved after both limits. */
  totalCastsPerSec: number;
  /** Cooldowns would allow more casts per second than skill delay permits. */
  isDelayBound: boolean;
  skillDps: number;
  skillTotal: number;

  // Status (treated as 1 tick/sec)
  statusBase: number;        // base per-tick before multipliers
  statusMult: number;
  statusPerTick: number;
  statusDps: number;
  statusTotal: number;

  // Autocast (full rate)
  acMult: number;
  /** Resolved attack type used for autocast damage. */
  acAttackType: import("@/lib/types").AttackType;
  /** The ATK value fed into the autocast damage formula. */
  acAtkUsed: number;
  /** How many equipped weapons contributed a formula run to acAtkUsed. */
  acWeaponRuns: number;
  acPerCast: number;
  acProcsPerSec: number;
  acDps: number;
  acTotal: number;

  // Rotation contributions: AA and autocast are scaled by uptime, status always ticks
  aaDpsInRotation: number;
  acDpsInRotation: number;
  statusDpsInRotation: number;
  totalRotationDps: number;
  totalRotationDamage: number;

  // Target chain
  targetEnabled: boolean;
  elMult: number;
  defMult: number;
  hitChance: number;

  // Target-aware
  aaPerHitVsTarget: number;
  aaDpsVsTarget: number;
  statusPerTickVsTarget: number;
  statusDpsVsTarget: number;
  acDpsVsTarget: number;
  skillDpsVsTarget: number;
  aaDpsInRotationVsTarget: number;
  acDpsInRotationVsTarget: number;
  statusDpsInRotationVsTarget: number;
  totalRotationDpsVsTarget: number;
  totalRotationDamageVsTarget: number;
}

/** Computes all four damage types plus rotation totals and optional target chain.
 *  NOTE: No official damage formula exists in mechanics/formulas.md.
 *  This is an app-level estimate composing the dev's attack, crit, and speed stats. */
export function computeDamageBreakdown(build: Build): DamageBreakdownResult {
  const c = computeCore(build);
  const cr = computeCrit(build);
  const sp = computeSpeed(build);
  const { LV, STR, AGI, INT } = build.attrs;
  const g = build.gear;
  const d = build.damage ?? DEFAULT_DAMAGE;

  const atk = c.attackByType;
  const critMultiplier = cr.critMultiplier;
  const baseHitsPerSec = sp.hitsPerSec;
  const effHitsPerSec = sp.effectiveHitsPerSec;
  const avgHitsPerAttack = sp.avgHitsPerAttack;
  const castTimeMult = sp.castTime;
  const durationSec = build.durationSec ?? 10;

  // Source switches. Autocast is coupled to AA because only autoattacks proc it.
  const aaOn = d.aa.enabled;
  const skillsOn = d.skills.enabled;
  const statusOn = d.status.enabled;
  const autocastOn = d.autocast.enabled && aaOn;
  const autocastSuppressedByAa = d.autocast.enabled && !aaOn;

  // Attack type helpers for per-source resolution.
  const weaponType = WEAPONS[build.weapon].type;
  const resolveType = (t: import("@/lib/types").SourceAttackType): import("@/lib/types").AttackType =>
    t === "weapon" ? weaponType : t;
  const atkFor = (t: import("@/lib/types").SourceAttackType): number =>
    c.skillAtkByType[resolveType(t)];

  // Target chain.
  const targetEnabled = build.target.enabled;
  let elMult = 1;
  let hitChance = 1;

  if (targetEnabled) {
    elMult = elementMultiplier(build.element, build.target.element) / 100;
    hitChance = Math.min(1, Math.max(0, (100 + c.hit - build.target.FLEE) / 100));
  }

  // Per-type target defense multiplier — magic uses MDEF, everything else uses DEF.
  const defMultFor = (t: import("@/lib/types").AttackType): number =>
    targetEnabled ? 100 / ((t === "magic" ? build.target.MDEF : build.target.DEF) + 100) : 1;
  const tgtFor = (t: import("@/lib/types").AttackType): number => elMult * defMultFor(t);

  // Weapon-type target multiplier (used by AA and Status which don't have their own type picker).
  const tgt = tgtFor(weaponType);

  // --- Auto Attack (full rate, i.e. per second of actual autoattacking) ---
  const aaMult = multProduct(d.aa.multipliers);
  const aaPerHit = atk * critMultiplier * aaMult;
  const aaDps = aaPerHit * effHitsPerSec;
  const aaTotal = aaDps * durationSec;
  const aaPerHitVsTarget = aaPerHit * tgt;
  const aaDpsVsTarget = aaPerHitVsTarget * effHitsPerSec * hitChance;

  // --- Status (1 tick/sec assumed; ticks whether or not you are autoattacking) ---
  const statusBase = ((LV + STR + AGI + INT) / 10) * d.status.stacks * (g.StatusDamagepct / 100);
  const statusMult = multProduct(d.status.multipliers);
  const statusCrit = d.status.critApplies ? critMultiplier : 1;
  const statusPerTick = statusBase * statusCrit * statusMult;
  const statusDps = statusPerTick;
  const statusTotal = statusDps * durationSec;
  const statusPerTickVsTarget = statusPerTick * tgt;
  const statusDpsVsTarget = statusPerTickVsTarget;

  // --- Autocast (full rate). Multistrike hits count as one hit, so base attacks/sec. ---
  const acMult = multProduct(d.autocast.multipliers);
  const acCrit = d.autocast.critApplies ? critMultiplier : 1;
  const acAttackType = resolveType(d.autocast.attackType ?? "weapon");
  const acAtkUsed = atkFor(d.autocast.attackType ?? "weapon");
  const acWeaponRuns = c.skillWeaponRunsByType[acAttackType];
  const acTgt = tgtFor(acAttackType);
  const acPerCast = acAtkUsed * (d.autocast.damagePct / 100) * acCrit * acMult;
  const acProcsPerSec = baseHitsPerSec * (d.autocast.chancePct / 100);
  const acDps = acPerCast * acProcsPerSec;
  const acTotal = acDps * durationSec;
  const acDpsVsTarget = acPerCast * acTgt * acProcsPerSec;

  // --- Skills: build cycles, then resolve how much of the timeline they claim ---
  // Two separate limits apply and the tighter one wins:
  //   1. the timeline — you cannot spend more than 100% of your time casting
  //   2. skill delay  — the game gates skill casts to 1 / skillDelay per second, in total
  const skillDelaySec = sp.skillDelaySec;
  const maxCastsPerSec = sp.maxCastsPerSec;

  const entries = d.skills.entries ?? [];
  const prepared = entries.map((s) => {
    const mult = multProduct(s.multipliers);
    const skillCrit = s.critApplies ? critMultiplier : 1;
    const msMult = s.multistrikeApplies ? avgHitsPerAttack : 1;
    const sType = resolveType(s.attackType ?? "weapon");
    const sAtk = atkFor(s.attackType ?? "weapon");
    const sRuns = c.skillWeaponRunsByType[sType];
    const perCast = sAtk * (s.damagePct / 100) * s.hits * msMult * skillCrit * mult;
    const actual = Math.max(0, s.baseCastTime * castTimeMult);
    // Cycle = cast time + skill delay + cooldown (all three stack).
    const cycleSec = actual + skillDelaySec + Math.max(0, s.cooldownSec);
    const contributes = skillsOn && s.enabled;
    const castFraction = cycleSec > 0 ? actual / cycleSec : 0;
    const desiredCastsPerSec = contributes && cycleSec > 0 ? 1 / cycleSec : 0;
    const sTgt = tgtFor(sType);
    return { s, mult, msMult, sType, sAtk, sRuns, sTgt, perCast, actual, cycleSec, contributes, castFraction, desiredCastsPerSec };
  });

  const contributing = prepared.filter((p) => p.contributes);
  const totalCastFraction = contributing.reduce((a, p) => a + p.castFraction, 0);
  const desiredCastsPerSec = contributing.reduce((a, p) => a + p.desiredCastsPerSec, 0);

  const isCastBound = totalCastFraction > 1;
  const isDelayBound = desiredCastsPerSec > maxCastsPerSec;

  const castScale = isCastBound ? 1 / totalCastFraction : 1;
  const delayScale = isDelayBound ? maxCastsPerSec / desiredCastsPerSec : 1;
  const scale = Math.min(castScale, delayScale);

  const skills: SkillResult[] = prepared.map((p) => {
    const castsPerSec = p.desiredCastsPerSec * scale;
    const dps = p.perCast * castsPerSec;
    return {
      id: p.s.id,
      name: p.s.name,
      enabled: p.s.enabled,
      mult: p.mult,
      multistrikeMult: p.msMult,
      attackType: p.sType,
      atkUsed: p.sAtk,
      weaponRuns: p.sRuns,
      actualCastTime: p.actual,
      cycleSec: p.cycleSec,
      perCast: p.perCast,
      perCastVsTarget: p.perCast * p.sTgt,
      castFraction: p.castFraction,
      castsPerSec,
      castsInWindow: castsPerSec * durationSec,
      dps,
      dpsVsTarget: p.perCast * p.sTgt * castsPerSec,
      total: dps * durationSec,
    };
  });

  // Uptime comes from the resolved cast rates, so whichever limit bound above is respected here.
  const totalCastsPerSec = skills.reduce((a, s) => a + s.castsPerSec, 0);
  const timeSpentCasting = skills.reduce((a, s) => a + s.castsPerSec * s.actualCastTime, 0);
  const aaUptime = Math.min(1, Math.max(0, 1 - timeSpentCasting));

  const skillDps = skills.reduce((a, s) => a + s.dps, 0);
  const skillTotal = skillDps * durationSec;
  const skillDpsVsTarget = skills.reduce((a, s) => a + s.dpsVsTarget, 0);

  // --- Rotation: AA and autocast only run during leftover time; status always ticks ---
  const aaDpsInRotation = aaOn ? aaDps * aaUptime : 0;
  const acDpsInRotation = autocastOn ? acDps * aaUptime : 0;
  const statusDpsInRotation = statusOn ? statusDps : 0;
  const totalRotationDps = skillDps + aaDpsInRotation + acDpsInRotation + statusDpsInRotation;
  const totalRotationDamage = totalRotationDps * durationSec;

  const aaDpsInRotationVsTarget = aaOn ? aaDpsVsTarget * aaUptime : 0;
  const acDpsInRotationVsTarget = autocastOn ? acDpsVsTarget * aaUptime : 0;
  const statusDpsInRotationVsTarget = statusOn ? statusDpsVsTarget : 0;
  const totalRotationDpsVsTarget =
    skillDpsVsTarget + aaDpsInRotationVsTarget + acDpsInRotationVsTarget + statusDpsInRotationVsTarget;
  const totalRotationDamageVsTarget = totalRotationDpsVsTarget * durationSec;

  // Expose the weapon-type defMult for the shared target readout tile in the UI.
  const defMult = defMultFor(weaponType);

  return {
    atk, critMultiplier, baseHitsPerSec, effHitsPerSec, avgHitsPerAttack, castTimeMult, ctr: sp.ctr, durationSec,
    aaOn, skillsOn, statusOn, autocastOn, autocastSuppressedByAa,
    aaMult, aaPerHit, aaDps, aaTotal,
    skills, totalCastFraction, aaUptime, isCastBound, skillDps, skillTotal,
    skillDelaySec, maxCastsPerSec, desiredCastsPerSec, totalCastsPerSec, isDelayBound,
    statusBase, statusMult, statusPerTick, statusDps, statusTotal,
    acMult, acAttackType, acAtkUsed, acWeaponRuns, acPerCast, acProcsPerSec, acDps, acTotal,
    aaDpsInRotation, acDpsInRotation, statusDpsInRotation,
    totalRotationDps, totalRotationDamage,
    targetEnabled, elMult, defMult, hitChance,
    aaPerHitVsTarget, aaDpsVsTarget,
    statusPerTickVsTarget, statusDpsVsTarget,
    acDpsVsTarget, skillDpsVsTarget,
    aaDpsInRotationVsTarget, acDpsInRotationVsTarget, statusDpsInRotationVsTarget,
    totalRotationDpsVsTarget, totalRotationDamageVsTarget,
  };
}

/** Full derived stat sheet for the UI. */
export function computeStats(build: Build): StatResult[] {
  const { LV, STR, AGI, VIT, INT, DEX, LUK } = build.attrs;
  const g = build.gear;
  const c = computeCore(build);
  const out: StatResult[] = [];

  const push = (
    key: string,
    label: string,
    value: number,
    group: StatResult["group"],
    formula: string,
    display?: string,
    hint?: string,
  ) => out.push({ key, label, value, group, formula, display: display ?? fmt(value), hint });

  // --- Offense ---
  const stance = getStance(build);
  const stanceNote = `× ${stance.mult} (${stance.label} stance)`;
  const isDualWield = build.offhand !== "none" && build.offhand !== "shield";
  if (isDualWield) {
    push("mainAtk", `Main Hand (${WEAPONS[build.weapon].label})`, c.mainAtk, "offense",
      `(LV/4 + primary*1.5 + ... + (ATK+WeaponATK)*(1+primary/200)) * decile * (1+ATK%) ${stanceNote}`);
    push("offAtk", `Off Hand (${WEAPONS[build.offhand as import("@/lib/types").WeaponKey].label})`, c.offAtk, "offense",
      `(LV/4 + primary*1.5 + ... + (ATK+OffhandATK)*(1+primary/200)) * decile * (1+ATK%) ${stanceNote}`);
    push("attackByType", "Combined ATK", c.attackByType, "offense", "Main Hand + Off Hand");
  } else {
    push("meleeAtk", "Melee Attack", c.meleeAtk, "offense",
      `(LV/4 + STR*1.5 + DEX/5 + LUK/5 + MASTERY + (ATK+WeaponATK)*(1+STR/200)) * (1+FLOOR(STR/10)/100) * (1+ATK%) ${stanceNote}`);
    push("rangedAtk", "Ranged Attack", c.rangedAtk, "offense",
      `(LV/4 + DEX + STR/5 + LUK/5 + MASTERY + (ATK+WeaponATK)*(1+DEX/200)) * (1+FLOOR(DEX/10)/100) * (1+ATK%) ${stanceNote}`);
    push("matk", "Magic Attack", c.matk, "offense",
      `(LV/4 + INT*1.5 + DEX/5 + MASTERY + (MATK+WeaponMATK)*(1+INT/200)) * (1+FLOOR(INT/10)/100) * (1+MATK%) ${stanceNote}`);
  }

  // --- Speed ---
  const sp = computeSpeed(build);

  push("aspd", "ASPD", sp.aspd, "speed",
    "200 - 50*BAD*(1-(AGI/250+DEX/1000))/(1+AtkSpd%) + 0.5*FLOOR(AGI/10)",
    sp.isCapped ? `${fmt(sp.aspd, 1)} (capped)` : fmt(sp.aspd, 1),
    `BAD ${sp.bad.toFixed(2)}; raw ${fmt(sp.aspdRaw, 1)}`);
  push("attackDelay", "Attack Delay", sp.attackDelay, "speed",
    "(200 - ASPD) / 50", `${fmt(sp.attackDelay, 3)}s`);
  push("hitsPerSec", "Hits / sec", sp.hitsPerSec, "speed",
    "1 / AttackDelay", `${fmt(sp.hitsPerSec, 2)}/s`);
  push("multistrike", "Multistrike", sp.multistrikePct, "speed",
    "gear stat — floor(MS/100) guaranteed extra + MS%100 chance",
    `${fmt(sp.multistrikePct, 0)}%`,
    `${fmt(sp.avgHitsPerAttack, 2)} avg hits/attack`);
  push("effectiveHitsPerSec", "Effective hits / sec", sp.effectiveHitsPerSec, "speed",
    "Hits/sec × (1 + Multistrike/100)", `${fmt(sp.effectiveHitsPerSec, 2)}/s`);
  push("castSpeed", "Cast Speed", sp.castSpeed, "speed",
    "200 - 50*(1-(DEX+INT/2)/400)/(1+CastSpd%) + 0.5*FLOOR(DEX/10)", fmt(sp.castSpeed, 1));
  push("skillDelay", "Skill Delay", sp.skillDelaySec, "speed",
    "manual input (tracks ASPD; formula not published)", `${fmt(sp.skillDelaySec, 3)}s`,
    "Time between skill casts — read from the in-game stat window");
  push("maxCastsPerSec", "Max casts / sec", sp.maxCastsPerSec, "speed",
    "1 / SkillDelay", `${fmt(sp.maxCastsPerSec, 2)}/s`,
    "Shared ceiling across every skill in the rotation");
  push("castTime", "Cast Time multiplier", sp.castTime, "speed",
    "(200 - CastSpeed) / 50", `${fmt(sp.castTime, 3)}`,
    "Fraction of a skill's listed cast time you pay (drives CTR; separate from Skill Delay)");
  push("ctr", "Cast Time Reduction", sp.ctr, "speed",
    "ROUND((1 - (200-CastSpeed)/50) × 100)", `${fmt(sp.ctr, 0)}%`);
  push("actualCastTime", "Actual cast time", sp.actualCastTime, "speed",
    "skillCastTime × castTime multiplier", `${fmt(sp.actualCastTime, 3)}s`,
    `${fmt(sp.skillCastTime, 1)}s skill — saves ${fmt(sp.secondsSaved, 3)}s`);

  // --- Defense ---
  const df = computeDefense(build);
  push("def", "Physical DEF", df.def, "defense", "DEF * (1 + VIT/1000 + Def%)", fmt(df.def, 1));
  push("mdef", "Magic DEF", df.mdef, "defense", "MDEF * (1 + INT/1000 + Mdef%)", fmt(df.mdef, 1));
  push("dmgReduction", "Damage Taken", df.physTaken, "defense",
    "100 / (DEF + 100)", `${fmt(df.physTaken * 100, 1)}%`,
    "Fraction of incoming physical damage taken");
  push("mdmgReduction", "Magic Damage Taken", df.magicTaken, "defense",
    "100 / (MDEF + 100)", `${fmt(df.magicTaken * 100, 1)}%`,
    "Fraction of incoming magic damage taken");
  push("critDef", "Crit DEF", df.critDef, "defense", "LUK/5 + CritDef", fmt(df.critDef, 1));
  push("reflect", "Reflect Damage", df.reflect, "defense",
    "(LV + totalDEF/2 + flatDEF/2 + computedATK/2) * 4 * Reflect%", fmt(df.reflect, 0));

  // --- Crit ---
  const cr = computeCrit(build);
  push("critRate", "Crit Rate", c.critRate, "crit",
    "(LUK/3 + FLOOR(LUK/10) + CRIT) * (1 + Crit%)", `${fmt(c.critRate, 1)}%`,
    cr.isOvercapped ? `${fmt(cr.overcapBy, 1)} pts overcapped` : undefined);
  push("critDamage", "Crit Damage", c.critDamage, "crit",
    "120 + FLOOR(LUK/10)*2 + CritDamage%", `${fmt(c.critDamage, 0)}%`);
  push("critMultiplier", "Avg crit multiplier", cr.critMultiplier, "crit",
    "(1 - p) + p × (CritDamage/100) where p = min(CritRate,100)/100",
    `${fmt(cr.critMultiplier, 3)}×`,
    "Effective average damage multiplier from crits");

  // --- Damage Output (app estimate — no dev formula exists) ---
  const dm = computeDamageBreakdown(build);
  push("aaPerHit", "AA per hit (raw)", dm.aaPerHit, "damage",
    "ATK × critMult × multipliers", fmt(dm.aaPerHit, 0),
    "Estimate — no official damage formula");
  push("aaDps", "AA DPS (full rate)", dm.aaDps, "damage",
    "AAPerHit × effectiveHits/sec", fmt(dm.aaDps, 1),
    dm.aaOn ? undefined : "Auto Attack switched off");
  push("aaUptime", "Autoattack uptime", dm.aaUptime * 100, "damage",
    "1 - sum(castsPerSec × castTime) per skill", `${fmt(dm.aaUptime * 100, 1)}%`,
    dm.isCastBound
      ? "Cast-bound — skill casts scaled down"
      : dm.isDelayBound
        ? "Delay-bound — capped by skill delay"
        : undefined);
  push("castsPerSec", "Skill casts / sec", dm.totalCastsPerSec, "damage",
    "min(cooldowns, 1 / SkillDelay)", `${fmt(dm.totalCastsPerSec, 2)}/s`,
    dm.isDelayBound
      ? `Cooldowns allow ${fmt(dm.desiredCastsPerSec, 2)}/s but skill delay caps you at ${fmt(dm.maxCastsPerSec, 2)}/s`
      : undefined);
  push("skillDps", "Skill DPS", dm.skillDps, "damage",
    "sum(perCast × castsPerSec) across skills", fmt(dm.skillDps, 1),
    `${dm.skills.filter((s) => s.enabled).length} skill(s) in rotation`);
  push("statusPerTick", "Status per tick", dm.statusPerTick, "damage",
    "(LV+STR+AGI+INT)/10 × stacks × StatusDmg% × multipliers", fmt(dm.statusPerTick, 1));
  push("acDps", "Autocast DPS (full rate)", dm.acDps, "damage",
    "ATK × autocastDmg% × critMult × multipliers × procs/sec", fmt(dm.acDps, 1),
    dm.autocastSuppressedByAa ? "Suppressed — needs autoattacks" : undefined);
  push("totalRotationDps", "Rotation DPS", dm.totalRotationDps, "damage",
    "skills + (AA + autocast) × uptime + status", fmt(dm.totalRotationDps, 1),
    `Over ${dm.durationSec}s: ${fmt(dm.totalRotationDamage, 0)}`);
  if (dm.targetEnabled) {
    push("aaDpsVsTarget", "AA DPS vs target", dm.aaDpsVsTarget, "damage",
      "AA PerHit × element% × DEF% × hitChance × hitsPerSec", fmt(dm.aaDpsVsTarget, 1));
    push("skillDpsVsTarget", "Skill DPS vs target", dm.skillDpsVsTarget, "damage",
      "sum(perCast × element% × DEF% × castsPerSec)", fmt(dm.skillDpsVsTarget, 1));
    push("rotationVsTarget", "Rotation DPS vs target", dm.totalRotationDpsVsTarget, "damage",
      "All sources vs target", fmt(dm.totalRotationDpsVsTarget, 1),
      `Over ${dm.durationSec}s: ${fmt(dm.totalRotationDamageVsTarget, 0)}`);
  }

  // --- Accuracy ---
  push("hit", "Hit", c.hit, "accuracy", "(LV + DEX*2 + HIT + 25) * (1 + Hit%)");
  push("flee", "Flee", df.flee, "accuracy", "(LV + AGI + LUK/5 + 3*FLOOR(AGI/10) + FLEE) * (1 + Flee%)");
  push("perfectDodge", "Perfect Dodge", df.perfectDodge, "accuracy", "LUK/10 + PerfectDodge", `${fmt(df.perfectDodge, 1)}%`);

  // --- Resources ---
  const ut = computeUtility(build);
  push("hp", "Max HP", ut.hp, "resources",
    "[(90 + LV*10 + LSUM*Archetype%)*(1+VIT/100) + HP] * (1+Hp%)", fmt(ut.hp, 0),
    "LSUM = LV*(LV+1)/2, capped at LV130");
  push("mp", "Max MP", ut.mp, "resources", "[(45 + LV*5)*(1+INT/100) + MP] * (1+Mp%)", fmt(ut.mp, 0));
  push("hpRegen", "HP Regen", ut.hpRegen, "resources",
    "(MaxHP/100 + VIT/5 + FlatRegen)*(1+VIT/100+Regen%) + MaxHP*MaxHPRegen%", `${fmt(ut.hpRegen, 1)}/s`);
  push("mpRegen", "MP Regen", ut.mpRegen, "resources",
    "(MaxMP/100 + INT/5 + FlatRegen)*(1+INT/100+Regen%) + MaxMP*MaxMPRegen%", `${fmt(ut.mpRegen, 1)}/s`);

  // --- Utility ---
  const healing = (LV + INT + VIT) * 2.5 * (g.Healingpct / 100);
  const statusDamage = ((LV + STR + AGI + INT) / 10) * 1 * (g.StatusDamagepct / 100);
  push("healing", "Healing", ut.healing, "utility",
    "(LV + INT + VIT) * 2.5 * Healing%", fmt(ut.healing, 0));
  push("statusDamage", "Status Damage", statusDamage, "utility",
    "(LV + STR + AGI + INT)/10 * Stacks * StatusDamage%", fmt(statusDamage, 1), "Per stack");
  push("siphonHp", "Siphon HP (per hit)", ut.siphonHpPerHit, "utility",
    "SiphonHp * (LV + STR) / 50", fmt(ut.siphonHpPerHit, 1),
    `× ${fmt(sp.effectiveHitsPerSec, 2)} hits/sec = ${fmt(ut.siphonHpPerSec, 1)}/s`);
  push("siphonMp", "Siphon MP (per hit)", ut.siphonMpPerHit, "utility",
    "SiphonMp * (LV + INT) / 50", fmt(ut.siphonMpPerHit, 1),
    `× ${fmt(sp.effectiveHitsPerSec, 2)} hits/sec = ${fmt(ut.siphonMpPerSec, 1)}/s`);
  push("leechHp", "Leech HP", ut.leechHp, "utility",
    "min(HP Leech% * damage / 3, 20% of maxHP)", `${fmt(ut.leechHp, 1)}/s`,
    ut.isHpCapped ? `Capped — raw ${fmt(ut.leechHpRaw, 1)}/s exceeds 20% of max HP` : undefined);
  push("leechMp", "Leech MP", ut.leechMp, "utility",
    "min(MP Leech% * damage / 3, 20% of maxMP)", `${fmt(ut.leechMp, 1)}/s`,
    ut.isMpCapped ? `Capped — raw ${fmt(ut.leechMpRaw, 1)}/s exceeds 20% of max MP` : undefined);

  // --- Vs Target (optional) ---
  if (build.target.enabled) {
    const t = build.target;
    const chanceToHit = 100 + c.hit - t.FLEE;
    const type = WEAPONS[build.weapon].type;
    const defStat = type === "magic" ? t.MDEF : t.DEF;
    const targetReduction = 100 / (defStat + 100);
    const elMult = elementMultiplier(build.element, t.element);
    const effective = c.attackByType * (elMult / 100) * targetReduction;

    push("chanceToHit", "Chance to Hit", chanceToHit, "vsTarget",
      "100 + Hit - Target Flee", `${fmt(Math.max(0, Math.min(100, chanceToHit)), 0)}%`,
      `Raw ${fmt(chanceToHit, 0)}`);
    push("elementMult", "Element Multiplier", elMult, "vsTarget",
      "Attacker element vs defender element (chart)", `${elMult}%`);
    push("effectiveAtk", "Effective Attack", effective, "vsTarget",
      "Attack * Element% * (100 / (TargetDEF + 100))", fmt(effective, 0),
      `${type} attack vs target`);
  }

  return out;
}

export const STAT_GROUP_ORDER: StatResult["group"][] = [
  "offense",
  "vsTarget",
  "crit",
  "damage",
  "speed",
  "defense",
  "accuracy",
  "resources",
  "utility",
];

export const STAT_GROUP_LABEL: Record<StatResult["group"], string> = {
  offense: "Offense",
  vsTarget: "Vs Target",
  crit: "Critical",
  damage: "Damage Output (estimate)",
  speed: "Speed",
  defense: "Defense",
  accuracy: "Accuracy",
  resources: "Resources",
  utility: "Utility",
};

/**
 * Stat keys where a *lower* computed value is the better outcome.
 * Used by Compare and SetCompare to colour direction arrows correctly.
 */
export const LOWER_IS_BETTER_STATS = new Set([
  "attackDelay",
  "dmgReduction",
  "mdmgReduction",
  "castTime",
  "skillDelay",
  "actualCastTime",
]);
