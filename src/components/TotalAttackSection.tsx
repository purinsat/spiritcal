"use client";

import * as React from "react";
import { WEAPON_KEYS, WEAPONS } from "@/data/gameData";
import { computeAttacks } from "@/lib/formulas";
import type { AttackBreakdown } from "@/lib/formulas";
import type { Attributes, Build, GearMods, WeaponKey } from "@/lib/types";
import { NumberInput, Select, SharedStatBadge, cn } from "@/components/ui";
import { StanceBadge } from "@/components/StanceBadge";
import { type AccentKey, SECTION_ACCENTS } from "@/lib/sectionAccents";

// ---- Attack tile --------------------------------------------------------

function AttackTile({ atk, accent }: { atk: AttackBreakdown; accent?: AccentKey }) {
  const [open, setOpen] = React.useState(false);
  const ac = accent ? SECTION_ACCENTS[accent] : null;

  const stancePct =
    atk.stanceMult === 1
      ? null
      : `+${Math.round((atk.stanceMult - 1) * 100)}% stance`;

  return (
    <div
      className={cn(
        "flex flex-col rounded-xl border p-4 transition-all",
        atk.isPrimary
          ? cn(ac?.tileBorder ?? "border-primary/40", ac?.tileBg ?? "bg-primary/8", "shadow-sm")
          : "border-border bg-surface-2/60 opacity-60",
      )}
    >
      {/* header row */}
      <div className="mb-1 flex items-center justify-between gap-2">
        <span
          className={cn(
            "text-xs font-semibold uppercase tracking-wide",
            atk.isPrimary ? (ac?.tileLabelText ?? "text-primary") : "text-muted",
          )}
        >
          {atk.label}
          {atk.isPrimary && (
            <span
              className={cn(
                "ml-1.5 rounded-full px-1.5 py-0.5 text-[10px]",
                ac?.badgeBg ?? "bg-primary/20",
                ac?.badgeText ?? "text-primary",
              )}
            >
              {atk.badgeLabel ?? "Primary"}
            </span>
          )}
        </span>
        <span className="text-[11px] text-muted">scales with {atk.driver}</span>
      </div>

      {/* big number */}
      <span
        className={cn(
          "font-display text-3xl font-bold tabular-nums",
          atk.isPrimary ? "text-foreground" : "text-muted",
        )}
      >
        {Math.round(atk.total).toLocaleString()}
      </span>

      {/* expandable breakdown */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="mt-2 flex items-center gap-1 text-left text-[11px] text-muted hover:text-foreground"
      >
        <span className={cn("transition-transform text-[9px]", open ? "rotate-90" : "")}>
          ▸
        </span>
        How is this calculated?
      </button>

      {open && (
        <div className="mt-1.5 rounded-lg bg-surface px-3 py-2 text-[11px] text-muted leading-relaxed">
          <span className="tabular-nums">{Math.round(atk.base).toLocaleString()}</span>
          {" (base)"}
          {stancePct && (
            <>
              {" × "}
              <span className={cn("font-semibold", ac?.tileText ?? "text-primary")}>
                {atk.stanceMult}
              </span>
              {` (${stancePct})`}
            </>
          )}
          {" = "}
          <span className="font-semibold text-foreground tabular-nums">
            {Math.round(atk.total).toLocaleString()}
          </span>
        </div>
      )}
    </div>
  );
}

// ---- Weapon options -----------------------------------------------------

const weaponOptions = WEAPON_KEYS.map((k) => ({
  value: k,
  label: WEAPONS[k].label,
}));

const offhandOptions: { value: WeaponKey | "none" | "shield"; label: string }[] = [
  { value: "none", label: "None — Two-Handed (+25%)" },
  { value: "shield", label: "Shield — One-Handed (no ATK bonus)" },
  ...WEAPON_KEYS.map((k) => ({ value: k, label: `${WEAPONS[k].label} — Dual Wield` })),
];

// ---- Attribute + gear inputs -------------------------------------------

type AttrInput = { key: keyof Attributes; label: string; hint: string; shared?: boolean };
const ATTR_INPUTS: AttrInput[] = [
  { key: "LV", label: "Level", hint: "Your character level" },
  { key: "STR", label: "STR", hint: "Boosts Melee Attack" },
  { key: "DEX", label: "DEX", hint: "Boosts Ranged & helps all attacks", shared: true },
  { key: "INT", label: "INT", hint: "Boosts Magic Attack", shared: true },
  { key: "LUK", label: "LUK", hint: "Small bonus to Melee & Ranged" },
];

type GearInput = { key: keyof GearMods; label: string; hint: string; suffix?: string };
const GEAR_INPUTS_BASE: GearInput[] = [
  { key: "ATK", label: "Other Flat ATK", hint: "Flat ATK from armor, accessories, buffs (not the weapons themselves)" },
  { key: "MASTERY", label: "Mastery", hint: "Flat attack bonus from Mastery stat" },
  { key: "ATKpct", label: "ATK%", hint: "% attack boost on gear / buffs", suffix: "%" },
  { key: "MATKpct", label: "MATK%", hint: "% magic attack boost on gear / buffs", suffix: "%" },
];

// ---- Main component -----------------------------------------------------

export function TotalAttackSection({
  build,
  onChange,
  accent,
}: {
  build: Build;
  onChange: (b: Build) => void;
  accent?: AccentKey;
}) {
  const attacks = React.useMemo(() => computeAttacks(build), [build]);

  const setAttr = (key: keyof Attributes, v: number) =>
    onChange({ ...build, attrs: { ...build.attrs, [key]: v } });

  const setGear = (key: keyof GearMods, v: number) =>
    onChange({ ...build, gear: { ...build.gear, [key]: v } });

  return (
    <div>
      {/* --- Three attack tiles --- */}
      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {attacks.map((a) => (
          <AttackTile key={a.id} atk={a} accent={accent} />
        ))}
      </div>

      {/* --- Weapon & Stance setup --- */}
      <div className="mb-5 space-y-3 rounded-xl border border-border bg-surface-2/40 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">Weapon setup</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Select<WeaponKey>
            label="Weapon"
            value={build.weapon}
            onChange={(v) => onChange({ ...build, weapon: v })}
            options={weaponOptions}
          />
          <Select<WeaponKey | "none" | "shield">
            label="Off-hand"
            value={build.offhand}
            onChange={(v) => onChange({ ...build, offhand: v })}
            options={offhandOptions}
          />
        </div>
        <StanceBadge build={build} />
      </div>

      {/* --- Character attributes --- */}
      <div className="mb-4 space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">Your character</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {ATTR_INPUTS.map((f) => (
            <NumberInput
              key={f.key}
              label={f.label}
              value={build.attrs[f.key]}
              min={f.key === "LV" ? 1 : 0}
              max={f.key === "LV" ? 200 : undefined}
              onChange={(v) => setAttr(f.key, v)}
              hint={f.hint}
              badge={f.shared ? <SharedStatBadge title="Also used in the Attack & Cast Speed section" /> : undefined}
            />
          ))}
        </div>
      </div>

      {/* --- Attack gear mods --- */}
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">Attack from gear</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <NumberInput
            label={`${WEAPONS[build.weapon].label} ATK`}
            value={build.gear.WeaponATK}
            min={0}
            onChange={(v) => setGear("WeaponATK", v)}
            hint="Flat ATK on your main-hand weapon"
          />
          {build.offhand !== "none" && build.offhand !== "shield" && (
            <NumberInput
              label={`${WEAPONS[build.offhand].label} ATK`}
              value={build.gear.OffhandATK}
              min={0}
              onChange={(v) => setGear("OffhandATK", v)}
              hint="Flat ATK on your off-hand weapon"
            />
          )}
          {GEAR_INPUTS_BASE.map((f) => (
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
  );
}
