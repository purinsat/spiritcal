"use client";

import * as React from "react";
import { computeCrit } from "@/lib/formulas";
import type { Attributes, Build, GearMods } from "@/lib/types";
import { NumberInput, SharedStatBadge, cn } from "@/components/ui";
import { type AccentKey, SECTION_ACCENTS } from "@/lib/sectionAccents";

// ---- Tile -------------------------------------------------------------------

function CritTile({
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
          ? cn(ac?.tileBorder ?? "border-accent/40", ac?.tileBg ?? "bg-accent/8", "shadow-sm")
          : "border-border bg-surface-2/60",
      )}
    >
      <span
        className={cn(
          "mb-1 text-xs font-semibold uppercase tracking-wide",
          isPrimary ? (ac?.tileLabelText ?? "text-accent") : "text-muted",
        )}
      >
        {label}
      </span>
      <div className="flex items-baseline gap-2">
        <span
          className={cn(
            "font-display text-3xl font-extrabold",
            isPrimary ? (ac?.tileText ?? "text-accent") : "text-foreground",
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

type GearField = { key: keyof GearMods; label: string; hint: string; suffix?: string };
const GEAR_FIELDS: GearField[] = [
  { key: "CRIT", label: "Flat CRIT", hint: "Flat crit rating from gear / passives" },
  { key: "Critpct", label: "Crit%", hint: "% bonus to crit rate from gear", suffix: "%" },
  { key: "CritDamagepct", label: "CritDmg%", hint: "Bonus crit damage % from gear (base is 120%)", suffix: "%" },
];

// ---- Main component ---------------------------------------------------------

export function CriticalSection({
  build,
  onChange,
  accent,
}: {
  build: Build;
  onChange: (b: Build) => void;
  accent?: AccentKey;
}) {
  const cr = React.useMemo(() => computeCrit(build), [build]);
  const ac = accent ? SECTION_ACCENTS[accent] : null;

  const setAttr = (key: keyof Attributes, v: number) =>
    onChange({ ...build, attrs: { ...build.attrs, [key]: v } });

  const setGear = (key: keyof GearMods, v: number) =>
    onChange({ ...build, gear: { ...build.gear, [key]: v } });

  const fmt = (n: number, d = 2) =>
    isFinite(n)
      ? n.toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d })
      : "—";

  // Plain-language explainer
  const explainer = (() => {
    const chance = fmt(cr.critChance, 1);
    const damageX = fmt(cr.critDamagePct / 100, 2);
    const multiplierX = fmt(cr.critMultiplier, 3);
    if (cr.critChance <= 0) return "No crits. Add LUK or CRIT gear to start dealing critical hits.";
    if (cr.critChance >= 100) return `Every hit crits for ${damageX}× — your average multiplier is ${multiplierX}×.`;
    return `${chance}% of hits deal ${damageX}×, so your average hit is ${multiplierX}×.`;
  })();

  return (
    <div>
      {/* --- Three tiles --- */}
      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <CritTile
          label="Crit Chance"
          value={`${fmt(cr.critChance, 1)}%`}
          sub={cr.isOvercapped ? `raw ${fmt(cr.critRateRaw, 1)}% — overcapped` : `raw ${fmt(cr.critRateRaw, 1)}%`}
          badge={
            cr.isOvercapped ? (
              <span className="text-xs font-semibold text-bad">cap</span>
            ) : undefined
          }
          accent={accent}
        />
        <CritTile
          label="Crit Damage"
          value={`${fmt(cr.critDamagePct / 100, 2)}×`}
          sub={`${cr.critDamagePct}% — base is 120% (1.20×)`}
          accent={accent}
        />
        <CritTile
          label="Effective Multiplier"
          value={`${fmt(cr.critMultiplier, 3)}×`}
          sub="Avg damage per hit (including non-crits)"
          isPrimary
          accent={accent}
        />
      </div>

      {/* --- Explainer --- */}
      <div
        className={cn(
          "mb-5 rounded-xl border p-4",
          ac ? cn(ac.tileBorder, "border-opacity-30", ac.tileBg) : "border-border bg-surface-2/40",
        )}
      >
        <p className="text-sm text-foreground">{explainer}</p>
      </div>

      {/* --- Overcap warning --- */}
      {cr.isOvercapped && (
        <div className="mb-5 rounded-xl border border-bad/30 bg-bad/6 p-4">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-bad">
            Crit overcap — {fmt(cr.overcapBy, 1)} pts wasted
          </p>
          <p className="text-sm text-foreground">
            Your raw crit rate ({fmt(cr.critRateRaw, 1)}%) exceeds 100. The extra{" "}
            {fmt(cr.overcapBy, 1)} points give no benefit — move that investment to Crit
            Damage% or other stats.
          </p>
        </div>
      )}

      {/* --- Details --- */}
      <div className="mb-5 rounded-xl border border-border bg-surface-2/40 p-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Formula</p>
        <DetailRow
          label="CritRate (raw)"
          value={`(LUK/3 + ⌊LUK/10⌋ + CRIT) × (1 + Crit%) = ${fmt(cr.critRateRaw, 1)}%`}
        />
        <DetailRow
          label="CritDamage"
          value={`120 + ⌊LUK/10⌋×2 + CritDmg% = ${cr.critDamagePct}%`}
        />
        <DetailRow
          label="Avg multiplier"
          value={`(1 − p) + p × (CritDmg/100) = ${fmt(cr.critMultiplier, 4)}×`}
        />
      </div>

      {/* --- Inputs --- */}
      <div className="space-y-4">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
            Character stat
          </p>
          <div className="grid grid-cols-3 gap-3 sm:max-w-xs">
            <NumberInput
              label="LUK"
              value={build.attrs.LUK}
              min={0}
              onChange={(v) => setAttr("LUK", v)}
              hint="Feeds Crit Rate and Crit Damage. Also boosts Melee & Ranged Attack."
              badge={<SharedStatBadge title="LUK also feeds Melee and Ranged attack in the Total Attack section" />}
            />
          </div>
        </div>
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
            Crit from gear
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
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
export function critSectionSummary(build: Build): string {
  const cr = computeCrit(build);
  const fmt = (n: number, d = 1) =>
    n.toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d });
  return `${fmt(cr.critChance)}% crit · ${fmt(cr.critMultiplier, 3)}× avg`;
}
