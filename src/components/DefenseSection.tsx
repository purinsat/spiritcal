"use client";

import * as React from "react";
import { computeDefense } from "@/lib/formulas";
import type { Attributes, Build, GearMods } from "@/lib/types";
import { NumberInput, SharedStatBadge, cn, FormulaDetails } from "@/components/ui";
import { type AccentKey, SECTION_ACCENTS } from "@/lib/sectionAccents";

// ---- Tile -------------------------------------------------------------------

function DefenseTile({
  label,
  value,
  sub,
  isPrimary,
  badge,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  isPrimary?: boolean;
  badge?: React.ReactNode;
  accent?: AccentKey;
}) {
  const ac = accent ? SECTION_ACCENTS[accent] : null;
  return (
    <div
      className={cn(
        "flex flex-col rounded-xl border p-4 transition-all",
        isPrimary
          ? cn(ac?.tileBorder ?? "border-primary/40", ac?.tileBg ?? "bg-primary/8", "shadow-sm")
          : "border-border bg-surface-2/60",
      )}
    >
      <span
        className={cn(
          "mb-1 text-xs font-semibold uppercase tracking-wide",
          isPrimary ? (ac?.tileLabelText ?? "text-primary") : "text-muted",
        )}
      >
        {label}
      </span>
      <div className="flex items-baseline gap-2">
        <span
          className={cn(
            "font-display text-3xl font-extrabold",
            isPrimary ? (ac?.tileText ?? "text-primary") : "text-foreground",
          )}
        >
          {value}
        </span>
        {badge}
      </div>
      {sub ? <span className="mt-1 text-xs text-muted">{sub}</span> : null}
    </div>
  );
}

// ---- Detail row -------------------------------------------------------------

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2 py-1 text-sm">
      <span className="text-muted">{label}</span>
      <span className="font-mono font-semibold text-foreground">{value}</span>
    </div>
  );
}

// ---- Inputs -----------------------------------------------------------------

type AttrField = { key: keyof Attributes; label: string; hint: string; shared?: boolean };
const ATTR_FIELDS: AttrField[] = [
  { key: "VIT", label: "VIT", hint: "Raises DEF", shared: true },
  { key: "INT", label: "INT", hint: "Raises MDEF", shared: true },
  { key: "LUK", label: "LUK", hint: "Raises Flee, Perfect Dodge, and Crit DEF", shared: true },
  { key: "AGI", label: "AGI", hint: "Raises Flee", shared: true },
];

type GearField = { key: keyof GearMods; label: string; hint: string; suffix?: string };
const GEAR_FIELDS: GearField[] = [
  { key: "DEF", label: "Flat DEF", hint: "Physical DEF from gear" },
  { key: "MDEF", label: "Flat MDEF", hint: "Magic DEF from gear" },
  { key: "DEFpct", label: "Def%", hint: "% bonus to DEF from gear", suffix: "%" },
  { key: "MDEFpct", label: "Mdef%", hint: "% bonus to MDEF from gear", suffix: "%" },
  { key: "FLEE", label: "Flat Flee", hint: "Flat flee rating from gear / passives" },
  { key: "Fleepct", label: "Flee%", hint: "% bonus to flee from gear", suffix: "%" },
  { key: "PerfectDodge", label: "Perf. Dodge", hint: "Flat perfect dodge chance from gear" },
  { key: "CritDef", label: "Crit DEF", hint: "Flat crit defense from gear" },
  { key: "Reflectpct", label: "Reflect%", hint: "% of Reflect Damage's base value dealt back", suffix: "%" },
];

// ---- Main component ---------------------------------------------------------

export function DefenseSection({
  build,
  onChange,
  accent,
}: {
  build: Build;
  onChange: (b: Build) => void;
  accent?: AccentKey;
}) {
  // Local what-if input — not persisted with the build. Defaults to the player's own LV.
  const [monsterLevel, setMonsterLevel] = React.useState(build.attrs.LV);
  const df = React.useMemo(() => computeDefense(build, monsterLevel), [build, monsterLevel]);
  const ac = accent ? SECTION_ACCENTS[accent] : null;

  const setAttr = (key: keyof Attributes, v: number) =>
    onChange({ ...build, attrs: { ...build.attrs, [key]: v } });

  const setGear = (key: keyof GearMods, v: number) =>
    onChange({ ...build, gear: { ...build.gear, [key]: v } });

  const fmt = (n: number, d = 1) =>
    isFinite(n)
      ? n.toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d })
      : "—";

  return (
    <div>
      {/* --- Reduction tiles --- */}
      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <DefenseTile
          label="Physical reduction"
          value={`${fmt(df.physReductionPct)}%`}
          sub={`takes ${fmt(df.physTaken * 100)}% damage · ${fmt(df.ehpPhysical, 0)} effective HP`}
          isPrimary
          accent={accent}
        />
        <DefenseTile
          label="Magic reduction"
          value={`${fmt(df.magicReductionPct)}%`}
          sub={`takes ${fmt(df.magicTaken * 100)}% damage · ${fmt(df.ehpMagic, 0)} effective HP`}
          isPrimary
          accent={accent}
        />
      </div>

      {/* --- Diminishing returns --- */}
      <div
        className={cn(
          "mb-5 rounded-xl border p-4",
          ac ? cn(ac.tileBorder, "border-opacity-30", ac.tileBg) : "border-border bg-surface-2/40",
        )}
      >
        <p className="text-sm text-foreground">
          DEF has diminishing returns — your next <span className="font-semibold">+50 DEF</span>{" "}
          adds <span className="font-semibold">+{fmt(df.nextPhys50)}%</span> reduction (currently{" "}
          {fmt(df.physReductionPct)}%).
        </p>
      </div>

      {/* --- Dodge tile + monster-level what-if --- */}
      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <DefenseTile
          label="Flee"
          value={fmt(df.flee)}
          sub={`dodges ${fmt(df.dodgePct)}% of hits from a level ${monsterLevel} monster`}
          accent={accent}
        />
        <div className="flex flex-col justify-center rounded-xl border border-border bg-surface-2/60 p-4">
          <NumberInput
            label="What-if monster level"
            value={monsterLevel}
            min={1}
            max={999}
            onChange={setMonsterLevel}
            hint={`Average monster hit = LV × 2 = ${df.monsterHit}. Not saved with the build.`}
          />
        </div>
      </div>

      {/* --- Secondary rows --- */}
      <div className="mb-5 rounded-xl border border-border bg-surface-2/40 p-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
          Secondary defense
        </p>
        <DetailRow label="Perfect Dodge" value={`${fmt(df.perfectDodge)}%`} />
        <DetailRow label="Crit DEF" value={fmt(df.critDef)} />
        <DetailRow label="Reflect Damage" value={fmt(df.reflect, 0)} />
      </div>

      {/* --- Details --- */}
      <FormulaDetails title="Formula">
        <DetailRow label="DEF" value={`DEF × (1 + VIT/1000 + Def%) = ${fmt(df.def)}`} />
        <DetailRow label="MDEF" value={`MDEF × (1 + INT/1000 + Mdef%) = ${fmt(df.mdef)}`} />
        <DetailRow
          label="Damage taken"
          value={`100 / (DEF + 100) = ${fmt(df.physTaken * 100)}%`}
        />
        <DetailRow
          label="Reflect"
          value={`(LV + totalDEF/2 + flatDEF/2 + computedATK/2) × 4 × Reflect% = ${fmt(df.reflect, 0)}`}
        />
      </FormulaDetails>

      {/* --- Inputs --- */}
      <div className="space-y-4">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
            Character stat
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {ATTR_FIELDS.map((f) => (
              <NumberInput
                key={f.key}
                label={f.label}
                value={build.attrs[f.key]}
                min={0}
                onChange={(v) => setAttr(f.key, v)}
                hint={f.hint}
                badge={f.shared ? <SharedStatBadge /> : undefined}
              />
            ))}
          </div>
        </div>
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
            Defense from gear
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {GEAR_FIELDS.map((f) => (
              <NumberInput
                key={f.key}
                label={f.label}
                value={build.gear[f.key] as number}
                min={0}
                suffix={f.suffix}
                onChange={(v) => setGear(f.key, v)}
                hint={f.hint}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Collapsed summary for the SectionCard header. */
export function defenseSectionSummary(build: Build): string {
  const df = computeDefense(build);
  const fmt = (n: number, d = 0) =>
    n.toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d });
  return `${fmt(df.physReductionPct)}% phys · ${fmt(df.magicReductionPct)}% magic reduction`;
}
