// LocalStorage preset persistence + URL share encoding for builds.

import type { Build, DamageConfig, DamageMultiplier, GearMods, LoadoutSet, SkillEntry } from "@/lib/types";
import { makeDefaultBuild, DEFAULT_DAMAGE, DEFAULT_GEAR, DEFAULT_SKILL, WEAPONS } from "@/data/gameData";
import { GEAR_SLOTS, makeDefaultSlot } from "@/data/loadoutData";

const PRESETS_KEY = "spiritcal.presets.v1";
const THEME_KEY = "spiritcal.theme";

export function loadPresets(): Build[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(PRESETS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Build[];
    return Array.isArray(parsed) ? parsed.map(normalizeBuild) : [];
  } catch {
    return [];
  }
}

export function savePresets(presets: Build[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PRESETS_KEY, JSON.stringify(presets));
}

export function getStoredTheme(): "light" | "dark" | null {
  if (typeof window === "undefined") return null;
  const v = window.localStorage.getItem(THEME_KEY);
  return v === "light" || v === "dark" ? v : null;
}

export function storeTheme(theme: "light" | "dark"): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(THEME_KEY, theme);
}

/** Legacy gear shape — fields that have been removed or renamed over time. */
interface LegacyGearMods extends Partial<GearMods> {
  /** Pre-split siphon stat (renamed to SiphonHp / SiphonMp). */
  Siphon?: number;
  /** Removed reflect-only stat — value is unused; DEF now covers both roles. */
  FlatDEF?: number;
  /** Pre-split leech stat (renamed to LeechHppct; MP leech not in game yet). */
  Leechpct?: number;
}

/** Builds a clean GearMods from a possibly-legacy saved object.
 *  Reads only DEFAULT_GEAR's own keys so stale fields are consumed during migration
 *  and then silently dropped rather than re-persisted. */
function normalizeGear(g: LegacyGearMods | undefined): GearMods {
  // Start from defaults, then copy only known keys from the saved object.
  const result = { ...DEFAULT_GEAR };
  if (g) {
    for (const key of Object.keys(DEFAULT_GEAR) as (keyof GearMods)[]) {
      if (key in g && typeof g[key] === "number") {
        (result as Record<string, number>)[key] = g[key] as number;
      }
    }
  }
  // Legacy Siphon → SiphonHp + SiphonMp (only backfill when new fields were absent in the save).
  if (g?.Siphon !== undefined) {
    if (g.SiphonHp === undefined) result.SiphonHp = g.Siphon;
    if (g.SiphonMp === undefined) result.SiphonMp = g.Siphon;
  }
  // Legacy Leechpct → LeechHppct only (MP leech didn't exist; don't copy value to MP).
  if (g?.Leechpct !== undefined && g.LeechHppct === undefined) {
    result.LeechHppct = g.Leechpct;
  }
  return result;
}

/** Pre-rotation shape: a single `skill` object instead of a `skills` list. */
interface LegacyDamageConfig extends Partial<DamageConfig> {
  skill?: {
    name?: string;
    damagePct?: number;
    hits?: number;
    critApplies?: boolean;
    multipliers?: DamageMultiplier[];
  };
}

/** Deep-merges a possibly-partial DamageConfig, ensuring multiplier arrays always exist
 *  and migrating the pre-rotation single-skill shape into the skills list.
 *  `enabled` defaults to true everywhere so old saves keep all sources active. */
function normalizeDamage(d: LegacyDamageConfig | undefined, skillCastTime: number): DamageConfig {
  const base = DEFAULT_DAMAGE;

  let entries: SkillEntry[];
  if (d?.skills?.entries) {
    entries = d.skills.entries.map((s) => ({
      ...DEFAULT_SKILL,
      ...s,
      id: s.id ?? crypto.randomUUID(),
      enabled: s.enabled ?? true,
      multipliers: s.multipliers ?? [],
    }));
  } else if (d?.skill) {
    // Legacy single skill: keep its values and inherit the cast time the user had set.
    entries = [
      {
        ...DEFAULT_SKILL,
        ...d.skill,
        id: crypto.randomUUID(),
        baseCastTime: skillCastTime,
        cooldownSec: 0,
        enabled: true,
        multipliers: d.skill.multipliers ?? [],
      },
    ];
  } else {
    entries = [{ ...DEFAULT_SKILL, id: crypto.randomUUID(), multipliers: [] }];
  }

  return {
    aa: {
      ...base.aa,
      ...d?.aa,
      enabled: d?.aa?.enabled ?? true,
      multipliers: d?.aa?.multipliers ?? [],
    },
    skills: { enabled: d?.skills?.enabled ?? true, entries },
    status: {
      ...base.status,
      ...d?.status,
      enabled: d?.status?.enabled ?? true,
      multipliers: d?.status?.multipliers ?? [],
    },
    autocast: {
      ...base.autocast,
      ...d?.autocast,
      enabled: d?.autocast?.enabled ?? true,
      multipliers: d?.autocast?.multipliers ?? [],
    },
  };
}

/** Merge a possibly-partial stored build onto fresh defaults so new fields don't break old saves. */
export function normalizeBuild(b: Partial<Build>): Build {
  const base = makeDefaultBuild(b.name ?? "Build");
  const gear = normalizeGear(b.gear as LegacyGearMods | undefined);

  // Migration: old magic-weapon builds stored the weapon's magic attack in WeaponATK.
  // If there is no WeaponMATK in the save, move WeaponATK → WeaponMATK for magic weapons.
  const legacyGear = b.gear as (Partial<GearMods> & Record<string, unknown>) | undefined;
  if (b.weapon) {
    if (WEAPONS[b.weapon as import("@/lib/types").WeaponKey]?.type === "magic" &&
        legacyGear?.WeaponMATK === undefined && gear.WeaponATK > 0) {
      gear.WeaponMATK = gear.WeaponATK;
      gear.WeaponATK = 0;
    }
    // Off-hand magic weapon migration.
    if (b.offhand && b.offhand !== "none" && b.offhand !== "shield") {
      if (WEAPONS[b.offhand as import("@/lib/types").WeaponKey]?.type === "magic" &&
          legacyGear?.OffhandMATK === undefined && gear.OffhandATK > 0) {
        gear.OffhandMATK = gear.OffhandATK;
        gear.OffhandATK = 0;
      }
    }
  }

  return {
    ...base,
    ...b,
    id: b.id ?? base.id,
    attrs: { ...base.attrs, ...b.attrs },
    gear,
    target: { ...base.target, ...b.target },
    damage: normalizeDamage(
      b.damage as LegacyDamageConfig | undefined,
      b.skillCastTime ?? base.skillCastTime,
    ),
  };
}

/** Compact base64 encoding of a build for shareable URLs. */
export function encodeBuild(build: Build): string {
  const json = JSON.stringify(build);
  const bytes = new TextEncoder().encode(json);
  let binary = "";
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function decodeBuild(encoded: string): Build | null {
  try {
    const b64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
    const binary = atob(b64);
    const bytes = Uint8Array.from(binary, (ch) => ch.charCodeAt(0));
    const json = new TextDecoder().decode(bytes);
    return normalizeBuild(JSON.parse(json));
  } catch {
    return null;
  }
}

export function buildShareUrl(build: Build): string {
  if (typeof window === "undefined") return "";
  const url = new URL(window.location.href);
  url.searchParams.set("b", encodeBuild(build));
  url.hash = "";
  return url.toString();
}

// ── Loadout persistence ───────────────────────────────────────────────────────

const LOADOUTS_KEY = "spiritcal.loadouts.v1";

/** Ensure a saved set has all current slots and all current slot fields. */
function normalizeLoadoutSet(set: LoadoutSet): LoadoutSet {
  const slots = { ...set.slots };
  for (const slotDef of GEAR_SLOTS) {
    if (!slots[slotDef.id]) {
      slots[slotDef.id] = makeDefaultSlot(slotDef);
    } else if (slots[slotDef.id].name === undefined) {
      // Backfill name field for sets saved before it was added.
      slots[slotDef.id] = { ...slots[slotDef.id], name: "" };
    }
  }
  return { ...set, slots };
}

export function loadLoadouts(): LoadoutSet[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(LOADOUTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as LoadoutSet[];
    return Array.isArray(parsed) ? parsed.map(normalizeLoadoutSet) : [];
  } catch {
    return [];
  }
}

export function saveLoadouts(sets: LoadoutSet[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LOADOUTS_KEY, JSON.stringify(sets));
}

// ── JSON file export / import ─────────────────────────────────────────────────

interface LoadoutsFilePayload {
  app: "spiritcal";
  kind: "loadouts";
  version: number;
  exportedAt: string;
  sets: LoadoutSet[];
}

/** Download all sets as a timestamped JSON file. */
export function exportLoadoutsToFile(sets: LoadoutSet[]): void {
  if (typeof window === "undefined") return;
  const payload: LoadoutsFilePayload = {
    app: "spiritcal",
    kind: "loadouts",
    version: 1,
    exportedAt: new Date().toISOString(),
    sets,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const date = new Date().toISOString().slice(0, 10);
  const a = document.createElement("a");
  a.href = url;
  a.download = `spiritcal-loadouts-${date}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Parse a loadout JSON file string into a list of sets.
 * Accepts the wrapper payload, a backup payload (pulls only loadouts), or a bare array.
 * Throws if the content cannot be parsed as a valid loadout list.
 */
export function parseLoadoutsFile(text: string): LoadoutSet[] {
  const parsed: unknown = JSON.parse(text);

  let rawSets: unknown[];
  if (Array.isArray(parsed)) {
    rawSets = parsed;
  } else if (parsed !== null && typeof parsed === "object") {
    const obj = parsed as Record<string, unknown>;
    if (obj.kind === "backup" && Array.isArray(obj.loadouts)) {
      // Accept a full backup file — pull only the loadouts section.
      rawSets = obj.loadouts as unknown[];
    } else if (obj.kind === "loadouts" && Array.isArray(obj.sets)) {
      rawSets = (parsed as LoadoutsFilePayload).sets;
    } else {
      throw new Error("Not a SpiritCal loadout file");
    }
  } else {
    throw new Error("Not a SpiritCal loadout file");
  }

  if (rawSets.length === 0) throw new Error("File contains no sets");

  // Normalize every set (fills missing slots + fields for forward compat).
  return rawSets.map((s) => normalizeLoadoutSet(s as LoadoutSet));
}

// ── Backup file (presets + loadouts in one) ───────────────────────────────────

interface BackupFilePayload {
  app: "spiritcal";
  kind: "backup";
  version: 1;
  exportedAt: string;
  presets: Build[];
  loadouts: LoadoutSet[];
}

/** Download a single JSON file containing all build presets plus all gear loadouts. */
export function exportBackupToFile(presets: Build[]): void {
  if (typeof window === "undefined") return;
  const loadouts = loadLoadouts();
  const payload: BackupFilePayload = {
    app: "spiritcal",
    kind: "backup",
    version: 1,
    exportedAt: new Date().toISOString(),
    presets,
    loadouts,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const date = new Date().toISOString().slice(0, 10);
  const a = document.createElement("a");
  a.href = url;
  a.download = `spiritcal-backup-${date}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Parse any SpiritCal JSON file into { presets, loadouts }.
 * Accepts: backup payload, loadouts payload, bare Build[], bare LoadoutSet[],
 * a single Build object. Always returns both arrays (may be empty).
 * Throws on unrecognizable content.
 */
export function parseBackupFile(text: string): { presets: Build[]; loadouts: LoadoutSet[] } {
  const parsed: unknown = JSON.parse(text);

  // Wrapper payloads
  if (parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)) {
    const obj = parsed as Record<string, unknown>;

    if (obj.kind === "backup") {
      const rawPresets = Array.isArray(obj.presets) ? obj.presets : [];
      const rawLoadouts = Array.isArray(obj.loadouts) ? obj.loadouts : [];
      return {
        presets: rawPresets.map((b) => normalizeBuild(b as Partial<Build>)),
        loadouts: rawLoadouts.map((s) => normalizeLoadoutSet(s as LoadoutSet)),
      };
    }

    if (obj.kind === "loadouts" && Array.isArray(obj.sets)) {
      return {
        presets: [],
        loadouts: (obj.sets as unknown[]).map((s) => normalizeLoadoutSet(s as LoadoutSet)),
      };
    }

    // Single build object
    if ("attrs" in obj) {
      return { presets: [normalizeBuild(obj as Partial<Build>)], loadouts: [] };
    }

    throw new Error("Not a SpiritCal file");
  }

  // Bare array — probe the first element to tell builds from loadouts apart.
  if (Array.isArray(parsed)) {
    if (parsed.length === 0) throw new Error("File is empty");
    const first = parsed[0] as Record<string, unknown>;
    if ("slots" in first) {
      return {
        presets: [],
        loadouts: parsed.map((s) => normalizeLoadoutSet(s as LoadoutSet)),
      };
    }
    if ("attrs" in first) {
      return {
        presets: parsed.map((b) => normalizeBuild(b as Partial<Build>)),
        loadouts: [],
      };
    }
    throw new Error("Not a SpiritCal file");
  }

  throw new Error("Not a SpiritCal file");
}

/** Append imported sets to localStorage gear loadouts (additive — never overwrites). */
export function appendLoadouts(sets: LoadoutSet[]): void {
  const current = loadLoadouts();
  const withNewIds = sets.map((s) => ({ ...structuredClone(s), id: crypto.randomUUID() }));
  saveLoadouts([...current, ...withNewIds]);
}
