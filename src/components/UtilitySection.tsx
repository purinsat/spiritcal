"use client";

import * as React from "react";
import { computeDamageBreakdown, computeUtility } from "@/lib/formulas";
import type { Attributes, Build, GearMods } from "@/lib/types";
import { Button, FormulaDetails, NumberInput, SharedStatBadge, cn } from "@/components/ui";
import { type AccentKey, SECTION_ACCENTS } from "@/lib/sectionAccents";

// ---- Tile -------------------------------------------------------------------

function UtilityTile({
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
  { key: "VIT", label: "VIT", hint: "Raises Max HP, HP Regen, Siphon HP, and Healing", shared: true },
  { key: "INT", label: "INT", hint: "Raises Max MP, MP Regen, Siphon MP, and Healing", shared: true },
];

type GearField = { key: keyof GearMods; label: string; hint: string; suffix?: string };
const RESOURCE_FIELDS: GearField[] = [
  { key: "HP", label: "Flat HP", hint: "Flat HP from gear" },
  { key: "MP", label: "Flat MP", hint: "Flat MP from gear" },
  { key: "Hppct", label: "HP%", hint: "% bonus to max HP from gear", suffix: "%" },
  { key: "Mppct", label: "MP%", hint: "% bonus to max MP from gear", suffix: "%" },
  { key: "FlatRegen", label: "Flat Regen", hint: "Flat regen added to both HP and MP regen" },
  { key: "Regenpct", label: "Regen%", hint: "% bonus to both HP and MP regen", suffix: "%" },
  { key: "MaxHPRegenpct", label: "MaxHPRegen%", hint: "HP regen per second as a % of max HP", suffix: "%" },
  { key: "MaxMPRegenpct", label: "MaxMPRegen%", hint: "MP regen per second as a % of max MP", suffix: "%" },
];

const SIPHON_FIELDS: GearField[] = [
  { key: "SiphonHp", label: "Siphon HP", hint: "Flat HP recovered per hit (gear / passives)" },
  { key: "SiphonMp", label: "Siphon MP", hint: "Flat MP recovered per hit (gear / passives)" },
];

const LEECH_HEAL_FIELDS: GearField[] = [
  { key: "Leechpct", label: "Leech%", hint: "% of damage dealt recovered as HP/MP over time", suffix: "%" },
  { key: "Healingpct", label: "Healing% (skill)", hint: "Each healing skill carries its own %; enter the one you are testing", suffix: "%" },
];

// ---- Main component ---------------------------------------------------------

export function UtilitySection({
  build,
  onChange,
  accent,
}: {
  build: Build;
  onChange: (b: Build) => void;
  accent?: AccentKey;
}) {
  const ut = React.useMemo(() => computeUtility(build), [build]);
  const ac = accent ? SECTION_ACCENTS[accent] : null;

  const setAttr = (key: keyof Attributes, v: number) =>
    onChange({ ...build, attrs: { ...build.attrs, [key]: v } });

  const setGear = (key: keyof GearMods, v: number) =>
    onChange({ ...build, gear: { ...build.gear, [key]: v } });

  const fmt = (n: number, d = 1) =>
    isFinite(n)
      ? n.toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d })
      : "—";

  const useRotationDps = () => {
    const dm = computeDamageBreakdown(build);
    onChange({ ...build, leechDamageBasis: dm.totalRotationDps });
  };

  return (
    <div>
      {/* --- HP / MP tiles --- */}
      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <UtilityTile
          label="Max HP"
          value={fmt(ut.hp, 0)}
          sub={`regen ${fmt(ut.hpRegen)}/s`}
          isPrimary
          accent={accent}
        />
        <UtilityTile
          label="Max MP"
          value={fmt(ut.mp, 0)}
          sub={`regen ${fmt(ut.mpRegen)}/s`}
          isPrimary
          accent={accent}
        />
      </div>

      {/* --- Siphon block --- */}
      <div className="mb-5 rounded-xl border border-border bg-surface-2/40 p-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
          Siphon — flat recovery, per hit
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <UtilityTile
            label="Siphon HP"
            value={`${fmt(ut.siphonHpPerHit)}/hit`}
            sub={`× ${fmt(ut.siphonHpPerSec / (ut.siphonHpPerHit || 1), 2)} hits/sec = ${fmt(ut.siphonHpPerSec)}/s`}
            accent={accent}
          />
          <UtilityTile
            label="Siphon MP"
            value={`${fmt(ut.siphonMpPerHit)}/hit`}
            sub={`× ${fmt(ut.siphonMpPerSec / (ut.siphonMpPerHit || 1), 2)} hits/sec = ${fmt(ut.siphonMpPerSec)}/s`}
            accent={accent}
          />
        </div>
        <p className="mt-3 text-[11px] leading-relaxed text-muted">
          Siphon pays out a flat amount on every hit, including multistrike extra hits — each one
          siphons. That is why raising Multistrike raises siphon per second while the per-hit
          amount above never changes. Only autoattacks trigger it; the recovery is modelled here,
          not the extra damage the source notes it also deals.
        </p>
      </div>

      {/* --- Leech block --- */}
      <div className="mb-5 rounded-xl border border-border bg-surface-2/40 p-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
          Leech — % of damage dealt, over time
        </p>
        <p className="mb-3 text-[11px] leading-relaxed text-muted">
          Unlike Siphon, Leech does not care how many hits land — it recovers a share of your
          damage output per second, capped at 20% of your max HP/MP.
        </p>
        <div className="mb-3 flex flex-wrap items-end gap-3">
          <NumberInput
            label="Damage dealt / sec"
            value={build.leechDamageBasis ?? 0}
            min={0}
            onChange={(v) => onChange({ ...build, leechDamageBasis: v })}
            hint="Manual input — how much damage you deal per second"
          />
          <Button variant="outline" size="sm" onClick={useRotationDps}>
            Use rotation DPS
          </Button>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <UtilityTile
            label="Leech HP"
            value={`${fmt(ut.leechHp)}/s`}
            sub={ut.isHpCapped ? `capped — raw ${fmt(ut.leechRaw)}/s` : `raw ${fmt(ut.leechRaw)}/s`}
            accent={accent}
          />
          <UtilityTile
            label="Leech MP"
            value={`${fmt(ut.leechMp)}/s`}
            sub={ut.isMpCapped ? `capped — raw ${fmt(ut.leechRaw)}/s` : `raw ${fmt(ut.leechRaw)}/s`}
            accent={accent}
          />
        </div>
        {(ut.isHpCapped || ut.isMpCapped) && (
          <div className="mt-3 rounded-lg border border-bad/30 bg-bad/6 p-3">
            <p className="text-sm text-foreground">
              {ut.isHpCapped && ut.isMpCapped
                ? "Both HP and MP leech are capped at 20% of their max."
                : ut.isHpCapped
                  ? "HP leech is capped at 20% of max HP."
                  : "MP leech is capped at 20% of max MP."}{" "}
              Raw leech would be {fmt(ut.leechRaw)}/s — more Leech% here gives no extra recovery
              until max HP/MP grows.
            </p>
          </div>
        )}
      </div>

      {/* --- Healing --- */}
      <div className="mb-5 rounded-xl border border-border bg-surface-2/40 p-4">
        <DetailRow label="Healing" value={fmt(ut.healing, 0)} />
        <p className="mt-1 text-[11px] text-muted">
          (LV + INT + VIT) × 2.5 × Healing% — bonus applied to healing skills/items
        </p>
      </div>

      {/* --- Details --- */}
      <FormulaDetails title="Formula">
        <DetailRow label="Max HP" value={fmt(ut.hp, 0)} />
        <DetailRow label="Max MP" value={fmt(ut.mp, 0)} />
        <DetailRow
          label="Siphon HP"
          value={`SiphonHp × (LV + STR) / 50 = ${fmt(ut.siphonHpPerHit)}`}
        />
        <DetailRow
          label="Siphon MP"
          value={`SiphonMp × (LV + INT) / 50 = ${fmt(ut.siphonMpPerHit)}`}
        />
        <DetailRow
          label="Leech"
          value={`min(Leech% × dmg / 3, 20% of max) = ${fmt(ut.leechRaw)} raw`}
        />
      </FormulaDetails>

      {/* --- Inputs --- */}
      <div className="space-y-4">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
            Character stat
          </p>
          <div className="grid grid-cols-2 gap-3 sm:max-w-xs">
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
            HP / MP from gear
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {RESOURCE_FIELDS.map((f) => (
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
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
            Siphon from gear
          </p>
          <div className="grid grid-cols-2 gap-3 sm:max-w-xs">
            {SIPHON_FIELDS.map((f) => (
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
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
            Leech &amp; Healing from gear
          </p>
          <div className="grid grid-cols-2 gap-3 sm:max-w-xs">
            {LEECH_HEAL_FIELDS.map((f) => (
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
export function utilitySectionSummary(build: Build): string {
  const ut = computeUtility(build);
  const fmt = (n: number, d = 0) =>
    n.toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d });
  return `${fmt(ut.hp)} HP · ${fmt(ut.mp)} MP`;
}
