// Shared catalog of every attribute / gear stat that the UI exposes.
// Used by BuildForm, SetCompare, and any future tab that needs to list or pick stats.
// LV is intentionally excluded — gear swaps never change level.

import type { Attributes, GearMods } from "@/lib/types";

export type StatFieldGroup = "Attributes" | "Flat" | "Percent";

export interface StatField {
  key: keyof Attributes | keyof GearMods;
  label: string;
  /** Whether to apply "build.attrs[key]" (attr) or "build.gear[key]" (gear). */
  target: "attr" | "gear";
  /** True when the numeric value is already a whole-number percent (10 = 10%). */
  pct: boolean;
  group: StatFieldGroup;
}

export const STAT_FIELDS: StatField[] = [
  // ── Attributes (exclude LV) ───────────────────────────────────────────────
  { key: "STR",       label: "STR",           target: "attr", pct: false, group: "Attributes" },
  { key: "AGI",       label: "AGI",           target: "attr", pct: false, group: "Attributes" },
  { key: "VIT",       label: "VIT",           target: "attr", pct: false, group: "Attributes" },
  { key: "INT",       label: "INT",           target: "attr", pct: false, group: "Attributes" },
  { key: "DEX",       label: "DEX",           target: "attr", pct: false, group: "Attributes" },
  { key: "LUK",       label: "LUK",           target: "attr", pct: false, group: "Attributes" },

  // ── Gear — flat ───────────────────────────────────────────────────────────
  { key: "ATK",         label: "ATK (non-weapon)", target: "gear", pct: false, group: "Flat" },
  { key: "WeaponATK",   label: "Main Weapon ATK",  target: "gear", pct: false, group: "Flat" },
  { key: "OffhandATK",  label: "Offhand ATK",      target: "gear", pct: false, group: "Flat" },
  { key: "MASTERY",     label: "Mastery",          target: "gear", pct: false, group: "Flat" },
  { key: "DEF",         label: "Flat DEF",    target: "gear", pct: false, group: "Flat" },
  { key: "MDEF",        label: "Flat MDEF",   target: "gear", pct: false, group: "Flat" },
  { key: "HIT",         label: "Hit",         target: "gear", pct: false, group: "Flat" },
  { key: "FLEE",        label: "Flee",        target: "gear", pct: false, group: "Flat" },
  { key: "CRIT",        label: "Crit",        target: "gear", pct: false, group: "Flat" },
  { key: "PerfectDodge",label: "Perf. Dodge", target: "gear", pct: false, group: "Flat" },
  { key: "CritDef",     label: "Crit DEF",    target: "gear", pct: false, group: "Flat" },
  { key: "HP",          label: "Flat HP",     target: "gear", pct: false, group: "Flat" },
  { key: "MP",          label: "Flat MP",     target: "gear", pct: false, group: "Flat" },
  { key: "FlatRegen",   label: "Flat Regen",  target: "gear", pct: false, group: "Flat" },
  { key: "SiphonHp",    label: "Siphon HP",   target: "gear", pct: false, group: "Flat" },
  { key: "SiphonMp",    label: "Siphon MP",   target: "gear", pct: false, group: "Flat" },
  { key: "AspdLimit",   label: "ASPD Limit",  target: "gear", pct: false, group: "Flat" },

  // ── Gear — percent ────────────────────────────────────────────────────────
  { key: "ATKpct",          label: "ATK%",          target: "gear", pct: true, group: "Percent" },
  { key: "MATKpct",         label: "MATK%",         target: "gear", pct: true, group: "Percent" },
  { key: "DEFpct",          label: "Def%",           target: "gear", pct: true, group: "Percent" },
  { key: "MDEFpct",         label: "Mdef%",          target: "gear", pct: true, group: "Percent" },
  { key: "Critpct",         label: "Crit%",          target: "gear", pct: true, group: "Percent" },
  { key: "CritDamagepct",   label: "CritDmg%",       target: "gear", pct: true, group: "Percent" },
  { key: "Hitpct",          label: "Hit%",           target: "gear", pct: true, group: "Percent" },
  { key: "Fleepct",         label: "Flee%",          target: "gear", pct: true, group: "Percent" },
  { key: "AtkSpdpct",       label: "AtkSpd%",        target: "gear", pct: true, group: "Percent" },
  { key: "CastSpdpct",      label: "CastSpd%",       target: "gear", pct: true, group: "Percent" },
  { key: "Hppct",           label: "HP%",            target: "gear", pct: true, group: "Percent" },
  { key: "Mppct",           label: "MP%",            target: "gear", pct: true, group: "Percent" },
  { key: "Regenpct",        label: "Regen%",         target: "gear", pct: true, group: "Percent" },
  { key: "MaxHPRegenpct",   label: "MaxHPRegen%",    target: "gear", pct: true, group: "Percent" },
  { key: "MaxMPRegenpct",   label: "MaxMPRegen%",    target: "gear", pct: true, group: "Percent" },
  { key: "Reflectpct",      label: "Reflect%",       target: "gear", pct: true, group: "Percent" },
  { key: "Healingpct",      label: "Healing%",       target: "gear", pct: true, group: "Percent" },
  { key: "StatusDamagepct", label: "StatusDmg%",     target: "gear", pct: true, group: "Percent" },
  { key: "LeechHppct",      label: "HP Leech%",      target: "gear", pct: true, group: "Percent" },
  { key: "LeechMppct",      label: "MP Leech%",      target: "gear", pct: true, group: "Percent" },
  { key: "Multistrikepct",  label: "Multistrike%",   target: "gear", pct: true, group: "Percent" },
];

/** Fast label lookup by key. */
export const STAT_FIELD_MAP = new Map<string, StatField>(
  STAT_FIELDS.map((f) => [f.key as string, f]),
);
