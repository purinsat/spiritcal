// LocalStorage preset persistence + URL share encoding for builds.

import type { Build, DamageConfig, DamageMultiplier, GearMods, LoadoutSet, SkillEntry } from "@/lib/types";
import { makeDefaultBuild, DEFAULT_DAMAGE, DEFAULT_GEAR, DEFAULT_SKILL } from "@/data/gameData";
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
  return {
    ...base,
    ...b,
    id: b.id ?? base.id,
    attrs: { ...base.attrs, ...b.attrs },
    gear: normalizeGear(b.gear as LegacyGearMods | undefined),
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
 * Accepts the wrapper payload OR a bare array for hand-edited files.
 * Throws if the content cannot be parsed as a valid loadout list.
 */
export function parseLoadoutsFile(text: string): LoadoutSet[] {
  const parsed: unknown = JSON.parse(text);

  let rawSets: unknown[];
  if (Array.isArray(parsed)) {
    rawSets = parsed;
  } else if (
    parsed !== null &&
    typeof parsed === "object" &&
    "kind" in parsed &&
    (parsed as Record<string, unknown>).kind === "loadouts" &&
    Array.isArray((parsed as Record<string, unknown>).sets)
  ) {
    rawSets = (parsed as LoadoutsFilePayload).sets;
  } else {
    throw new Error("Not a SpiritCal loadout file");
  }

  if (rawSets.length === 0) throw new Error("File contains no sets");

  // Normalize every set (fills missing slots + fields for forward compat).
  return rawSets.map((s) => normalizeLoadoutSet(s as LoadoutSet));
}
