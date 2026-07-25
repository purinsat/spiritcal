// LocalStorage preset persistence + URL share encoding for builds.

import type { Build, DamageConfig, DamageMultiplier, SkillEntry } from "@/lib/types";
import { makeDefaultBuild, DEFAULT_DAMAGE, DEFAULT_SKILL } from "@/data/gameData";

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
    gear: { ...base.gear, ...b.gear },
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
