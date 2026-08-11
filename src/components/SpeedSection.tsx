"use client";

import * as React from "react";
import { computeSpeed } from "@/lib/formulas";
import type { Attributes, Build, GearMods } from "@/lib/types";
import { NumberInput, SharedStatBadge, cn, FormulaDetails } from "@/components/ui";
import { type AccentKey, SECTION_ACCENTS } from "@/lib/sectionAccents";

// ---- Tile -------------------------------------------------------------------

function SpeedTile({
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

function DetailRow({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="flex items-center justify-between gap-2 py-1 text-sm">
      <span className="text-muted">{label}</span>
      <span className="font-mono font-semibold text-foreground">
        {value}
        {hint ? <span className="ml-1 font-normal text-muted text-xs">({hint})</span> : null}
      </span>
    </div>
  );
}

// ---- Multistrike explainer --------------------------------------------------

function multistrikeText(pct: number): string {
  if (pct <= 0) return "No extra hits.";
  const guaranteed = Math.floor(pct / 100);
  const chance = pct % 100;
  if (guaranteed === 0) return `${chance}% chance for 1 extra hit`;
  if (chance === 0) return `${guaranteed} guaranteed extra hit${guaranteed > 1 ? "s" : ""}`;
  return `${guaranteed} guaranteed extra hit${guaranteed > 1 ? "s" : ""} + ${chance}% chance for another`;
}

// ---- Inputs -----------------------------------------------------------------

type AttrField = { key: keyof Attributes; label: string; hint: string; shared?: boolean };
const ATTR_FIELDS: AttrField[] = [
  { key: "AGI", label: "AGI", hint: "Raises ASPD" },
  { key: "DEX", label: "DEX", hint: "Raises ASPD and Cast Speed", shared: true },
  { key: "INT", label: "INT", hint: "Raises Cast Speed", shared: true },
];

type GearField = { key: keyof GearMods; label: string; hint: string; suffix?: string };
const GEAR_FIELDS: GearField[] = [
  { key: "AtkSpdpct", label: "AtkSpd%", hint: "Attack speed % bonus on gear", suffix: "%" },
  { key: "CastSpdpct", label: "CastSpd%", hint: "Cast speed % bonus on gear", suffix: "%" },
  { key: "Multistrikepct", label: "Multistrike%", hint: "Extra hits on attack (gear/enchant)", suffix: "%" },
  { key: "AspdLimit", label: "ASPD Limit", hint: "Max ASPD (193 base, raisable by shoes enchant / Frenzy)" },
];

// ---- Main component ---------------------------------------------------------

export function SpeedSection({
  build,
  onChange,
  accent,
}: {
  build: Build;
  onChange: (b: Build) => void;
  accent?: AccentKey;
}) {
  const sp = React.useMemo(() => computeSpeed(build), [build]);

  const setAttr = (key: keyof Attributes, v: number) =>
    onChange({ ...build, attrs: { ...build.attrs, [key]: v } });

  const setGear = (key: keyof GearMods, v: number) =>
    onChange({ ...build, gear: { ...build.gear, [key]: v } });

  const fmt = (n: number, d = 2) =>
    isFinite(n)
      ? n.toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d })
      : "—";

  return (
    <div>
      {/* --- Headline tiles: the two delays the game shows you, side by side --- */}
      <div className="mb-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            Attacking — time between attacks
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <SpeedTile
              label="Attack delay"
              value={`${fmt(sp.attackDelay, 3)}s`}
              sub={
                sp.isCapped
                  ? `${fmt(sp.hitsPerSec)} hits/sec · ASPD capped at ${sp.aspdLimit}`
                  : `${fmt(sp.hitsPerSec)} hits/sec`
              }
              accent={accent}
            />
            <SpeedTile
              label="Effective hits / sec"
              value={`${fmt(sp.effectiveHitsPerSec)}/s`}
              sub={`×${fmt(sp.avgHitsPerAttack, 2)} avg hits/attack`}
              isPrimary
              accent={accent}
            />
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            Casting — time between skill casts
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <SpeedTile
              label="Skill delay"
              value={`${fmt(sp.skillDelaySec, 2)}s`}
              sub={`at most ${fmt(sp.maxCastsPerSec)} casts/sec`}
              accent={accent}
            />
            <SpeedTile
              label={`Cast time (${fmt(sp.skillCastTime, 1)}s base)`}
              value={`${fmt(sp.actualCastTime, 2)}s`}
              badge={
                <span className="flex items-center gap-1">
                  <span className="text-sm font-semibold text-secondary">
                    -{fmt(sp.ctrExact, 1)}%
                  </span>
                  {sp.isCtrCapped && (
                    <span className="text-xs font-semibold text-bad">cap</span>
                  )}
                </span>
              }
              sub={
                sp.isCtrCapped
                  ? `saves ${fmt(sp.secondsSaved, 2)}s · CTR ${fmt(sp.ctrExact, 1)}% (raw ${fmt(sp.ctrRaw, 1)}%)`
                  : `saves ${fmt(sp.secondsSaved, 2)}s · CTR ${fmt(sp.ctrExact, 1)}%`
              }
              accent={accent}
            />
          </div>
        </div>
      </div>

      {/* --- CTR overcap callout --- */}
      {sp.isCtrCapped && (
        <div className="mb-5 rounded-xl border border-bad/30 bg-bad/6 p-4">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-bad">
            CTR overcap — {fmt(sp.ctrOvercapBy, 1)} pts wasted
          </p>
          <p className="text-sm text-foreground">
            Your raw CTR is {fmt(sp.ctrRaw, 1)}%, above the 90% cap. Cast Speed{" "}
            {fmt(sp.castSpeedAtCap, 0)} is all you need; you have{" "}
            {fmt(sp.castSpeedSurplus, 1)} spare. Move that DEX, INT or Cast Speed% gear
            into other stats.
          </p>
        </div>
      )}

      {/* --- Detail strip --- */}
      <FormulaDetails title="Details">
        <DetailRow
          label="ASPD"
          value={fmt(sp.aspd, 1)}
          hint={sp.isCapped ? `capped at ${sp.aspdLimit}; raw ${fmt(sp.aspdRaw, 1)}` : `raw ${fmt(sp.aspdRaw, 1)}`}
        />
        <DetailRow
          label="Attack delay = (200 − ASPD) / 50"
          value={`${fmt(sp.attackDelay, 3)}s`}
        />
        <DetailRow label="Base Attack Delay (BAD)" value={fmt(sp.bad, 2)} />
        <DetailRow
          label="Cast Speed"
          value={fmt(sp.castSpeed, 1)}
          hint={sp.isCtrCapped ? `cap reached at ${fmt(sp.castSpeedAtCap, 0)}; ${fmt(sp.castSpeedSurplus, 1)} spare` : `cap at ${fmt(sp.castSpeedAtCap, 0)}`}
        />
        <DetailRow
          label="Cast time multiplier = (200 − Cast Speed) / 50"
          value={fmt(sp.castTime, 3)}
          hint={
            sp.isCtrCapped
              ? `${fmt(sp.ctr, 0)}% CTR (capped at 90%; raw ${fmt(sp.ctrRaw, 1)}%)`
              : `${fmt(sp.ctr, 0)}% CTR`
          }
        />
        <DetailRow
          label="Skill delay"
          value={`${fmt(sp.skillDelaySec, 3)}s`}
          hint="entered manually"
        />
        <p className="mt-2 text-[11px] leading-relaxed text-muted">
          Skill delay tracks ASPD, not Cast Speed. The dev has not published the formula, so
          read it from the game&apos;s stat window and enter it below. Cast Speed only drives
          Cast Time Reduction (CTR), which shortens how long each skill takes to cast.
        </p>
      </FormulaDetails>

      {/* --- Multistrike explainer --- */}
      {sp.multistrikePct > 0 && (
        <div className="mb-5 rounded-xl border border-primary/30 bg-primary/6 p-4">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-primary/70">
            Multistrike — {sp.multistrikePct}%
          </p>
          <p className="text-sm text-foreground">{multistrikeText(sp.multistrikePct)}</p>
          <p className="mt-1 text-xs text-muted">
            Average hits per swing: {fmt(sp.avgHitsPerAttack, 2)}
          </p>
        </div>
      )}

      {/* --- Inputs --- */}
      <div className="space-y-4">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">
            Character stats
          </p>
          <p className="mb-2 text-[11px] text-muted">
            DEX and INT are shared with the Total Attack section — changing them here updates both.
          </p>
          <div className="grid grid-cols-3 gap-3">
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
            Speed from gear
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {GEAR_FIELDS.map((f) => (
              <NumberInput
                key={f.key}
                label={f.label}
                value={build.gear[f.key as keyof GearMods] as number}
                min={f.key === "AspdLimit" ? 1 : 0}
                max={f.key === "AspdLimit" ? 199 : undefined}
                suffix={f.suffix}
                onChange={(v) => setGear(f.key, v)}
                hint={f.hint}
              />
            ))}
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
            Skill timing inputs
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <NumberInput
              label="Skill cast time"
              value={build.skillCastTime ?? 2}
              min={0}
              step={0.1}
              suffix="s"
              onChange={(v) => onChange({ ...build, skillCastTime: v })}
              hint="Enter the skill's listed cast time to see how long it takes with your stats"
            />
            <NumberInput
              label="Skill delay"
              value={build.skillDelaySec ?? 0.3}
              min={0}
              step={0.01}
              suffix="s"
              onChange={(v) => onChange({ ...build, skillDelaySec: v })}
              hint="Read this from the in-game stat window (tracks ASPD, formula not published by dev)"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/** Returns a compact summary string for the collapsed SectionCard header. */
export function speedSectionSummary(build: Build): string {
  const sp = computeSpeed(build);
  const fmt = (n: number, d = 2) =>
    isFinite(n)
      ? n.toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d })
      : "—";
  const hits = sp.multistrikePct > 0 ? sp.effectiveHitsPerSec : sp.hitsPerSec;
  return `${fmt(hits)}/s · ${fmt(sp.skillDelaySec, 2)}s skill delay`;
}
