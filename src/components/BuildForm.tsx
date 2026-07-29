"use client";

import * as React from "react";
import {
  ARCHETYPE_KEYS,
  ARCHETYPES,
  ELEMENTS,
  ELEMENT_LABEL,
  WEAPON_KEYS,
  WEAPONS,
} from "@/data/gameData";
import type {
  ArchetypeKey,
  Attributes,
  Build,
  ElementKey,
  GearMods,
  WeaponKey,
} from "@/lib/types";
import { Card, NumberInput, Select, Toggle, cn } from "@/components/ui";
import { ElementDot } from "@/components/ElementBadge";
import { StanceBadge } from "@/components/StanceBadge";

const ATTR_FIELDS: { key: keyof Attributes; label: string }[] = [
  { key: "STR", label: "STR" },
  { key: "AGI", label: "AGI" },
  { key: "VIT", label: "VIT" },
  { key: "INT", label: "INT" },
  { key: "DEX", label: "DEX" },
  { key: "LUK", label: "LUK" },
];

const GEAR_FLAT: { key: keyof GearMods; label: string }[] = [
  { key: "ATK", label: "ATK" },
  { key: "MASTERY", label: "Mastery" },
  { key: "DEF", label: "Flat DEF" },
  { key: "MDEF", label: "Flat MDEF" },
  { key: "HIT", label: "Hit" },
  { key: "FLEE", label: "Flee" },
  { key: "CRIT", label: "Crit" },
  { key: "PerfectDodge", label: "Perf. Dodge" },
  { key: "CritDef", label: "Crit DEF" },
  { key: "HP", label: "Flat HP" },
  { key: "MP", label: "Flat MP" },
  { key: "FlatRegen", label: "Flat Regen" },
  { key: "SiphonHp", label: "Siphon HP" },
  { key: "SiphonMp", label: "Siphon MP" },
  { key: "AspdLimit", label: "ASPD Limit" },
];

const GEAR_PCT: { key: keyof GearMods; label: string }[] = [
  { key: "ATKpct", label: "ATK%" },
  { key: "MATKpct", label: "MATK%" },
  { key: "DEFpct", label: "Def%" },
  { key: "MDEFpct", label: "Mdef%" },
  { key: "Critpct", label: "Crit%" },
  { key: "CritDamagepct", label: "CritDmg%" },
  { key: "Hitpct", label: "Hit%" },
  { key: "Fleepct", label: "Flee%" },
  { key: "AtkSpdpct", label: "AtkSpd%" },
  { key: "CastSpdpct", label: "CastSpd%" },
  { key: "Hppct", label: "HP%" },
  { key: "Mppct", label: "MP%" },
  { key: "Regenpct", label: "Regen%" },
  { key: "MaxHPRegenpct", label: "MaxHPRegen%" },
  { key: "MaxMPRegenpct", label: "MaxMPRegen%" },
  { key: "Reflectpct", label: "Reflect%" },
  { key: "Healingpct", label: "Healing%" },
  { key: "StatusDamagepct", label: "StatusDmg%" },
  { key: "LeechHppct", label: "HP Leech%" },
  { key: "LeechMppct", label: "MP Leech%" },
  { key: "Multistrikepct", label: "Multistrike%" },
];

const weaponOptions = [
  ...WEAPON_KEYS.map((k) => ({ value: k, label: WEAPONS[k].label })),
];
// Off-hand options group by stance so the player immediately sees the bonus.
const offhandOptions: { value: WeaponKey | "none" | "shield"; label: string }[] = [
  { value: "none", label: "None — Two-Handed (+25%)" },
  { value: "shield", label: "Shield — One-Handed (no ATK bonus)" },
  ...WEAPON_KEYS.map((k) => ({ value: k, label: `${WEAPONS[k].label} — Dual Wield` })),
];
const archetypeOptions = ARCHETYPE_KEYS.map((k) => ({
  value: k,
  label: `${ARCHETYPES[k].label} (${ARCHETYPES[k].hpPct}%)`,
}));
const elementOptions = ELEMENTS.map((k) => ({ value: k, label: ELEMENT_LABEL[k] }));

function Collapsible({
  title,
  defaultOpen = false,
  right,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(defaultOpen);
  return (
    <div className="rounded-xl border border-border bg-surface-2/40">
      <div className="flex items-center justify-between px-4 py-2.5">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-2 text-sm font-semibold text-foreground"
        >
          <span
            className={cn(
              "inline-block transition-transform",
              open ? "rotate-90" : "rotate-0",
            )}
          >
            ▸
          </span>
          {title}
        </button>
        {right}
      </div>
      {open ? <div className="px-4 pb-4">{children}</div> : null}
    </div>
  );
}

export function BuildForm({
  build,
  onChange,
}: {
  build: Build;
  onChange: (b: Build) => void;
}) {
  const setAttr = (key: keyof Attributes, v: number) =>
    onChange({ ...build, attrs: { ...build.attrs, [key]: v } });
  const setGear = (key: keyof GearMods, v: number) =>
    onChange({ ...build, gear: { ...build.gear, [key]: v } });

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
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
          <Select<ArchetypeKey>
            label="Archetype"
            value={build.archetype}
            onChange={(v) => onChange({ ...build, archetype: v })}
            options={archetypeOptions}
          />
          <Select<ElementKey>
            label="Attack Element"
            value={build.element}
            onChange={(v) => onChange({ ...build, element: v })}
            options={elementOptions}
          />
        </div>

        <div className="mb-3">
          <StanceBadge build={build} />
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          <NumberInput label="Level" value={build.attrs.LV} min={1} max={200} onChange={(v) => setAttr("LV", v)} />
          {ATTR_FIELDS.map((f) => (
            <NumberInput
              key={f.key}
              label={f.label}
              value={build.attrs[f.key]}
              min={0}
              onChange={(v) => setAttr(f.key, v)}
            />
          ))}
        </div>
      </Card>

      <Collapsible title="Gear & buffs — flat" defaultOpen>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {GEAR_FLAT.map((f) => (
            <NumberInput
              key={f.key}
              label={f.label}
              value={build.gear[f.key]}
              onChange={(v) => setGear(f.key, v)}
            />
          ))}
        </div>
      </Collapsible>

      <Collapsible title="Gear & buffs — percent (%)">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {GEAR_PCT.map((f) => (
            <NumberInput
              key={f.key}
              label={f.label}
              value={build.gear[f.key]}
              suffix="%"
              onChange={(v) => setGear(f.key, v)}
            />
          ))}
        </div>
      </Collapsible>

      <Collapsible
        title="Target (enemy)"
        defaultOpen={build.target.enabled}
        right={
          <Toggle
            checked={build.target.enabled}
            onChange={(v) =>
              onChange({ ...build, target: { ...build.target, enabled: v } })
            }
          />
        }
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <NumberInput
            label="Enemy DEF"
            value={build.target.DEF}
            onChange={(v) => onChange({ ...build, target: { ...build.target, DEF: v } })}
          />
          <NumberInput
            label="Enemy MDEF"
            value={build.target.MDEF}
            onChange={(v) => onChange({ ...build, target: { ...build.target, MDEF: v } })}
          />
          <NumberInput
            label="Enemy Flee"
            value={build.target.FLEE}
            onChange={(v) => onChange({ ...build, target: { ...build.target, FLEE: v } })}
          />
          <label className="flex flex-col gap-1">
            <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
              <ElementDot element={build.target.element} /> Enemy Element
            </span>
            <Select<ElementKey>
              value={build.target.element}
              onChange={(v) =>
                onChange({ ...build, target: { ...build.target, element: v } })
              }
              options={elementOptions}
            />
          </label>
        </div>
        <p className="mt-2 text-[11px] text-muted">
          Enable to compute chance-to-hit, element multiplier, and effective attack vs
          this enemy.
        </p>
      </Collapsible>
    </div>
  );
}
