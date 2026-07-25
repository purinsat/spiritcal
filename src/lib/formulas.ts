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
  attackByType: number;
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

/** Core numbers reused by several stats. */
export function computeCore(build: Build): Computed {
  const { LV, STR, AGI, VIT, INT, DEX, LUK } = build.attrs;
  const g = build.gear;

  const atkPct = g.ATKpct / 100;
  const matkPct = g.MATKpct / 100;

  // Stance is a final multiplier on all attack outputs (applied at the end,
  // per formulas.md: "Unique multipliers are applied at the end").
  const stanceMult = getStance(build).mult;

  const meleeAtk =
    (LV / 4 + STR * 1.5 + DEX / 5 + LUK / 5 + g.MASTERY + g.ATK * (1 + DEX / 200)) *
    (1 + FLOOR(STR / 10) / 100) *
    (1 + atkPct) *
    stanceMult;

  const rangedAtk =
    (LV / 4 + DEX + STR / 5 + LUK / 5 + g.MASTERY + g.ATK * (1 + DEX / 200)) *
    (1 + FLOOR(DEX / 10) / 100) *
    (1 + atkPct) *
    stanceMult;

  const matk =
    (LV / 4 + INT * 1.5 + DEX / 5 + g.MASTERY + g.ATK * (1 + INT / 200)) *
    (1 + FLOOR(INT / 10) / 100) *
    (1 + matkPct) *
    stanceMult;

  const type = WEAPONS[build.weapon].type;
  const attackByType =
    type === "magic" ? matk : type === "ranged" ? rangedAtk : meleeAtk;

  const def = g.DEF * (1 + VIT / 1000 + g.DEFpct / 100);
  const mdef = g.MDEF * (1 + VIT / 1000 + g.MDEFpct / 100);

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
  type: AttackType;
  label: string;
  driver: string;    // main scaling attribute displayed in the UI
  base: number;      // value before stance multiplier
  stanceMult: number;
  total: number;
  isPrimary: boolean; // true when this attack type matches the equipped weapon
}

/** Returns the three attack breakdowns (melee, ranged, magic) for the UI. */
export function computeAttacks(build: Build): AttackBreakdown[] {
  const c = computeCore(build);
  const weaponType = WEAPONS[build.weapon].type;
  return [
    {
      type: "melee",
      label: "Melee Attack",
      driver: "STR",
      base: c.meleeAtk / c.stanceMult,
      stanceMult: c.stanceMult,
      total: c.meleeAtk,
      isPrimary: weaponType === "melee",
    },
    {
      type: "ranged",
      label: "Ranged Attack",
      driver: "DEX",
      base: c.rangedAtk / c.stanceMult,
      stanceMult: c.stanceMult,
      total: c.rangedAtk,
      isPrimary: weaponType === "ranged",
    },
    {
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
  // (200 - CastSpeed) / 50 is read two ways at once, and both are correct:
  //   • as a multiplier on a skill's listed cast time  → drives CTR
  //   • as the game's "Skill delay" in seconds         → time between skill casts
  // Clamp to 0 so CastSpeed > 200 doesn't produce negative times.
  const castTime = Math.max(0, (200 - castSpeed) / 50);
  const skillDelaySec = castTime;
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

/** Multiplicative product of all enabled multipliers. */
function multProduct(multipliers: DamageMultiplier[]): number {
  return multipliers.filter((m) => m.enabled).reduce((a, m) => a * (1 + m.pct / 100), 1);
}

/** One skill's rotation contribution. */
export interface SkillResult {
  id: string;
  name: string;
  enabled: boolean;
  mult: number;
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
  const castTimeMult = sp.castTime;
  const durationSec = build.durationSec ?? 10;

  // Source switches. Autocast is coupled to AA because only autoattacks proc it.
  const aaOn = d.aa.enabled;
  const skillsOn = d.skills.enabled;
  const statusOn = d.status.enabled;
  const autocastOn = d.autocast.enabled && aaOn;
  const autocastSuppressedByAa = d.autocast.enabled && !aaOn;

  // Target chain (needed early so per-skill vs-target values can be built inline)
  const targetEnabled = build.target.enabled;
  let elMult = 1;
  let defMult = 1;
  let hitChance = 1;

  if (targetEnabled) {
    const t = build.target;
    const type = WEAPONS[build.weapon].type;
    const defStat = type === "magic" ? t.MDEF : t.DEF;
    defMult = 100 / (defStat + 100);
    elMult = elementMultiplier(build.element, t.element) / 100;
    hitChance = Math.min(1, Math.max(0, (100 + c.hit - t.FLEE) / 100));
  }
  const tgt = elMult * defMult;

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
  const acPerCast = atk * (d.autocast.damagePct / 100) * acCrit * acMult;
  const acProcsPerSec = baseHitsPerSec * (d.autocast.chancePct / 100);
  const acDps = acPerCast * acProcsPerSec;
  const acTotal = acDps * durationSec;
  const acDpsVsTarget = acPerCast * tgt * acProcsPerSec;

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
    const perCast = atk * (s.damagePct / 100) * s.hits * skillCrit * mult;
    const actual = Math.max(0, s.baseCastTime * castTimeMult);
    // A skill cannot repeat faster than the global delay either, so the delay floors its cycle.
    // This is also what keeps an instant, no-cooldown skill finite instead of dividing by zero.
    const cycleSec = Math.max(actual + Math.max(0, s.cooldownSec), skillDelaySec);
    const contributes = skillsOn && s.enabled;
    const castFraction = cycleSec > 0 ? actual / cycleSec : 0;
    const desiredCastsPerSec = contributes && cycleSec > 0 ? 1 / cycleSec : 0;
    return { s, mult, perCast, actual, cycleSec, contributes, castFraction, desiredCastsPerSec };
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
      actualCastTime: p.actual,
      cycleSec: p.cycleSec,
      perCast: p.perCast,
      perCastVsTarget: p.perCast * tgt,
      castFraction: p.castFraction,
      castsPerSec,
      castsInWindow: castsPerSec * durationSec,
      dps,
      dpsVsTarget: p.perCast * tgt * castsPerSec,
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

  return {
    atk, critMultiplier, baseHitsPerSec, effHitsPerSec, castTimeMult, ctr: sp.ctr, durationSec,
    aaOn, skillsOn, statusOn, autocastOn, autocastSuppressedByAa,
    aaMult, aaPerHit, aaDps, aaTotal,
    skills, totalCastFraction, aaUptime, isCastBound, skillDps, skillTotal,
    skillDelaySec, maxCastsPerSec, desiredCastsPerSec, totalCastsPerSec, isDelayBound,
    statusBase, statusMult, statusPerTick, statusDps, statusTotal,
    acMult, acPerCast, acProcsPerSec, acDps, acTotal,
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
  push("meleeAtk", "Melee Attack", c.meleeAtk, "offense",
    `(LV/4 + STR*1.5 + DEX/5 + LUK/5 + MASTERY + ATK*(1+DEX/200)) * (1+FLOOR(STR/10)/100) * (1+ATK%) ${stanceNote}`);
  push("rangedAtk", "Ranged Attack", c.rangedAtk, "offense",
    `(LV/4 + DEX + STR/5 + LUK/5 + MASTERY + ATK*(1+DEX/200)) * (1+FLOOR(DEX/10)/100) * (1+ATK%) ${stanceNote}`);
  push("matk", "Magic Attack", c.matk, "offense",
    `(LV/4 + INT*1.5 + DEX/5 + MASTERY + ATK*(1+INT/200)) * (1+FLOOR(INT/10)/100) * (1+MATK%) ${stanceNote}`);

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
    "(200 - CastSpeed) / 50", `${fmt(sp.skillDelaySec, 3)}s`,
    "Time between skill casts — the cast-speed twin of Attack Delay");
  push("maxCastsPerSec", "Max casts / sec", sp.maxCastsPerSec, "speed",
    "1 / SkillDelay", `${fmt(sp.maxCastsPerSec, 2)}/s`,
    "Shared ceiling across every skill in the rotation");
  push("castTime", "Cast Time multiplier", sp.castTime, "speed",
    "(200 - CastSpeed) / 50", `${fmt(sp.castTime, 3)}`,
    "Same number as Skill Delay — CastSpeed has no per-skill base term, so its reference skill is 1s");
  push("ctr", "Cast Time Reduction", sp.ctr, "speed",
    "ROUND((1 - (200-CastSpeed)/50) × 100)", `${fmt(sp.ctr, 0)}%`);
  push("actualCastTime", "Actual cast time", sp.actualCastTime, "speed",
    "skillCastTime × castTime multiplier", `${fmt(sp.actualCastTime, 3)}s`,
    `${fmt(sp.skillCastTime, 1)}s skill — saves ${fmt(sp.secondsSaved, 3)}s`);

  // --- Defense ---
  const damageReduction = 100 / (c.def + 100);
  const critDef = LUK / 5 + g.CritDef;
  push("def", "Physical DEF", c.def, "defense", "DEF * (1 + VIT/1000 + Def%)", fmt(c.def, 1));
  push("mdef", "Magic DEF", c.mdef, "defense", "MDEF * (1 + VIT/1000 + Mdef%)", fmt(c.mdef, 1));
  push("dmgReduction", "Damage Taken", damageReduction, "defense",
    "100 / (DEF + 100)", `${fmt(damageReduction * 100, 1)}%`,
    "Fraction of incoming physical damage taken");
  push("critDef", "Crit DEF", critDef, "defense", "LUK/5 + CritDef", fmt(critDef, 1));

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
  const perfectDodge = LUK / 10 + g.PerfectDodge;
  push("hit", "Hit", c.hit, "accuracy", "(LV + DEX*2 + HIT + 25) * (1 + Hit%)");
  push("flee", "Flee", c.flee, "accuracy", "(LV + AGI + LUK/5 + 3*FLOOR(AGI/10) + FLEE) * (1 + Flee%)");
  push("perfectDodge", "Perfect Dodge", perfectDodge, "accuracy", "LUK/10 + PerfectDodge", `${fmt(perfectDodge, 1)}%`);

  // --- Resources ---
  const healthRegen =
    (c.hp / 100 + VIT / 5 + g.FlatRegen) * (1 + VIT / 100 + g.Regenpct / 100) +
    c.hp * (g.MaxHPRegenpct / 100);
  const manaRegen =
    (c.mp / 100 + INT / 5 + g.FlatRegen) * (1 + INT / 100 + g.Regenpct / 100) +
    c.mp * (g.MaxMPRegenpct / 100);
  push("hp", "Max HP", c.hp, "resources",
    "[(90 + LV*10 + LSUM*Archetype%)*(1+VIT/100) + HP] * (1+Hp%)", fmt(c.hp, 0),
    "LSUM = LV*(LV+1)/2, capped at LV130");
  push("mp", "Max MP", c.mp, "resources", "[(45 + LV*5)*(1+INT/100) + MP] * (1+Mp%)", fmt(c.mp, 0));
  push("hpRegen", "HP Regen", healthRegen, "resources",
    "(MaxHP/100 + VIT/5 + FlatRegen)*(1+VIT/100+Regen%) + MaxHP*MaxHPRegen%", `${fmt(healthRegen, 1)}/s`);
  push("mpRegen", "MP Regen", manaRegen, "resources",
    "(MaxMP/100 + INT/5 + FlatRegen)*(1+INT/100+Regen%) + MaxMP*MaxMPRegen%", `${fmt(manaRegen, 1)}/s`);

  // --- Utility ---
  const reflect =
    (LV + c.def / 2 + g.FlatDEF / 2 + g.ATK / 2) * 4 * (g.Reflectpct / 100);
  const healing = (LV + INT + VIT) * 2.5 * (g.Healingpct / 100);
  const statusDamage = ((LV + STR + AGI + INT) / 10) * 1 * (g.StatusDamagepct / 100);
  const siphonHp = (g.Siphon * (LV + STR)) / 50;
  const siphonMp = (g.Siphon * (LV + INT)) / 50;
  push("reflect", "Reflect Damage", reflect, "utility",
    "(LV + DEF/2 + FlatDEF/2 + ATK/2) * 4 * Reflect%", fmt(reflect, 0));
  push("healing", "Healing", healing, "utility",
    "(LV + INT + VIT) * 2.5 * Healing%", fmt(healing, 0));
  push("statusDamage", "Status Damage", statusDamage, "utility",
    "(LV + STR + AGI + INT)/10 * Stacks * StatusDamage%", fmt(statusDamage, 1), "Per stack");
  push("siphonHp", "Siphon HP", siphonHp, "utility", "Siphon * (LV + STR) / 50", fmt(siphonHp, 1));
  push("siphonMp", "Siphon MP", siphonMp, "utility", "Siphon * (LV + INT) / 50", fmt(siphonMp, 1));

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
