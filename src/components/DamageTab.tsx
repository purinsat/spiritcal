"use client";

// Damage Output tab — four damage sources (AA, Skills, Status, Autocast), each switchable
// on/off and each carrying its own multiplicative multipliers. Skills form a real rotation:
// cooldown gaps are filled by autoattacking, so cast time and cooldown both matter.

import * as React from "react";
import type { Build, DamageConfig, ElementKey, SkillEntry } from "@/lib/types";
import { computeDamageBreakdown, type SkillResult } from "@/lib/formulas";
import { WEAPONS, DEFAULT_SKILL, ELEMENTS, ELEMENT_LABEL } from "@/data/gameData";
import { SectionCard } from "@/components/SectionCard";
import { MultiplierList } from "@/components/MultiplierList";
import { ElementDot } from "@/components/ElementBadge";
import { Button, NumberInput, Select, TextInput, Toggle, cn } from "@/components/ui";
import { SECTION_ACCENTS } from "@/lib/sectionAccents";

type Breakdown = ReturnType<typeof computeDamageBreakdown>;

// ─── helpers ────────────────────────────────────────────────────────────────

function fmt(n: number, d = 0): string {
  if (!isFinite(n)) return "—";
  return n.toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d });
}

function fmtX(n: number): string {
  return `×${fmt(n, 3)}`;
}

// ─── small shared sub-components ────────────────────────────────────────────

function ResultTile({
  label,
  value,
  sub,
  accentText,
  accentBg,
  accentBorder,
}: {
  label: string;
  value: string;
  sub?: string;
  accentText?: string;
  accentBg?: string;
  accentBorder?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col rounded-xl border p-3",
        accentBorder ?? "border-border",
        accentBg ?? "bg-surface-2/40",
      )}
    >
      <span className={cn("text-xs font-semibold uppercase tracking-wide", accentText ?? "text-muted")}>
        {label}
      </span>
      <span className={cn("mt-1 font-display text-2xl font-bold", accentText ?? "text-foreground")}>
        {value}
      </span>
      {sub && <span className="mt-0.5 text-[11px] text-muted">{sub}</span>}
    </div>
  );
}

function CritToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border bg-surface-2/40 px-3 py-2">
      <span className="text-sm text-foreground">{label}</span>
      <Toggle checked={checked} onChange={onChange} label={checked ? "Yes" : "No"} />
    </div>
  );
}

/** Header control for switching a whole damage source on or off. */
function SourceSwitch({
  enabled,
  onChange,
  disabled,
  title,
}: {
  enabled: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  title?: string;
}) {
  return (
    <div className="flex items-center gap-2">
      {!enabled && (
        <span className="rounded bg-muted/20 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted">
          Off
        </span>
      )}
      <Toggle checked={enabled} onChange={onChange} disabled={disabled} title={title} />
    </div>
  );
}

function OffNotice({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-4 rounded-xl border border-border bg-surface-2/60 p-3">
      <p className="text-xs text-muted">{children}</p>
    </div>
  );
}

// ─── Shared Stats Banner ─────────────────────────────────────────────────────

function SharedBanner({
  build,
  dm,
  onEditInCalculator,
  swapsApplied = false,
  swapCount = 0,
}: {
  build: Build;
  dm: Breakdown;
  onEditInCalculator: () => void;
  swapsApplied?: boolean;
  swapCount?: number;
}) {
  const isDual = build.offhand !== "none" && build.offhand !== "shield";
  const weaponType = WEAPONS[build.weapon]?.type ?? "melee";
  const atkLabel = isDual
    ? "Total ATK"
    : weaponType === "magic" ? "Magic ATK" : weaponType === "ranged" ? "Ranged ATK" : "Melee ATK";

  const stats = [
    { label: atkLabel, value: fmt(dm.atk) },
    { label: "Base hits/sec", value: `${fmt(dm.baseHitsPerSec, 2)}/s` },
    { label: "Eff. hits/sec", value: `${fmt(dm.effHitsPerSec, 2)}/s` },
    { label: "Avg crit mult", value: fmtX(dm.critMultiplier) },
    { label: "Skill delay", value: `${fmt(dm.skillDelaySec, 2)}s` },
  ];

  return (
    <div className="mb-4 rounded-[--radius-card] border border-border bg-surface-2/60 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-bold uppercase tracking-wider text-muted">
          {swapsApplied
            ? `Shared Stats (Calculator + ${swapCount} gear swap${swapCount === 1 ? "" : "s"})`
            : "Shared Stats (from Calculator)"}
        </h3>
        <Button variant="outline" size="sm" onClick={onEditInCalculator}>
          Edit in Calculator ↗
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {stats.map((s) => (
          <div key={s.label} className="flex flex-col">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-muted">
              {s.label}
            </span>
            <span className="font-display text-base font-bold text-foreground">{s.value}</span>
          </div>
        ))}
      </div>
      <p className="mt-3 text-[11px] text-muted">
        Skill delay ({fmt(dm.skillDelaySec, 2)}s, set in the Speed section) is the minimum gap
        added between every skill cast, capping total casts at {fmt(dm.maxCastsPerSec, 2)}/sec.
        Cast Speed gives {fmt(dm.ctr, 0)}% CTR, cutting each skill&apos;s listed cast time to{" "}
        {fmt(dm.castTimeMult * 100, 0)}% of the tooltip value.
      </p>
    </div>
  );
}

// ─── Duration & Target Controls ──────────────────────────────────────────────

const QUICK_DURATIONS = [5, 10, 30, 60];

function DurationControl({
  build,
  onChange,
}: {
  build: Build;
  onChange: (b: Build) => void;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-3 rounded-[--radius-card] border border-border bg-surface px-4 py-3">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-xs font-semibold uppercase tracking-wide text-muted">
          Duration
        </span>
        {QUICK_DURATIONS.map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => onChange({ ...build, durationSec: d })}
            className={cn(
              "rounded-lg border px-2.5 py-1 text-xs font-bold transition",
              build.durationSec === d
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-surface-2 text-foreground hover:border-primary/40",
            )}
          >
            {d}s
          </button>
        ))}
        <div className="ml-1 w-20">
          <NumberInput
            label=""
            value={build.durationSec}
            onChange={(v) => onChange({ ...build, durationSec: Math.max(1, v) })}
            min={1}
            suffix="s"
            compact
          />
        </div>
      </div>

      <span className="ml-auto text-[11px] text-muted">
        Every total below is measured over this window.
      </span>
    </div>
  );
}

// ─── Target & Element Block ──────────────────────────────────────────────────

const elementOptions = ELEMENTS.map((k) => ({ value: k, label: ELEMENT_LABEL[k] }));

function TargetBlock({
  build,
  onChange,
  dm,
}: {
  build: Build;
  onChange: (b: Build) => void;
  dm: Breakdown;
}) {
  const ac = SECTION_ACCENTS.damage;
  const t = build.target;
  const setTarget = (next: Partial<Build["target"]>) =>
    onChange({ ...build, target: { ...t, ...next } });

  return (
    <div className="space-y-5">
      {!dm.targetEnabled && (
        <OffNotice>
          Target is switched off, so every number on this tab is raw damage before the enemy&apos;s
          element, defence, and dodge are applied.
        </OffNotice>
      )}

      {dm.targetEnabled && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <ResultTile
            label="Element"
            value={fmtX(dm.elMult)}
            sub={`${ELEMENT_LABEL[build.element]} vs ${ELEMENT_LABEL[t.element]}`}
            accentText={ac.tileText}
            accentBg={ac.tileBg}
            accentBorder={ac.tileBorder}
          />
          <ResultTile
            label="After enemy DEF"
            value={fmtX(dm.defMult)}
            sub={`DEF ${fmt(t.DEF)} · MDEF ${fmt(t.MDEF)}`}
            accentText={ac.tileText}
            accentBg={ac.tileBg}
            accentBorder={ac.tileBorder}
          />
          <ResultTile
            label="Chance to hit"
            value={`${fmt(dm.hitChance * 100, 1)}%`}
            sub={`vs ${fmt(t.FLEE)} enemy Flee`}
            accentText={ac.tileText}
            accentBg={ac.tileBg}
            accentBorder={ac.tileBorder}
          />
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
            <ElementDot element={build.element} /> Your attack element
          </span>
          <Select<ElementKey>
            value={build.element}
            onChange={(element) => onChange({ ...build, element })}
            options={elementOptions}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
            <ElementDot element={t.element} /> Enemy element
          </span>
          <Select<ElementKey>
            value={t.element}
            onChange={(element) => setTarget({ element })}
            options={elementOptions}
          />
        </label>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <NumberInput
          label="Enemy DEF"
          value={t.DEF}
          min={0}
          onChange={(DEF) => setTarget({ DEF })}
          hint="Reduces physical damage"
        />
        <NumberInput
          label="Enemy MDEF"
          value={t.MDEF}
          min={0}
          onChange={(MDEF) => setTarget({ MDEF })}
          hint="Reduces magic damage"
        />
        <NumberInput
          label="Enemy Flee"
          value={t.FLEE}
          min={0}
          onChange={(FLEE) => setTarget({ FLEE })}
          hint="A rough monster Flee is its level × 2"
        />
      </div>

      <p className="text-[11px] text-muted">
        Switch this off to compare raw damage between builds; switch it on to see what actually
        lands on a specific enemy.
      </p>
    </div>
  );
}

// ─── Auto Attack Block ───────────────────────────────────────────────────────

function AABlock({
  build,
  onChange,
  dm,
}: {
  build: Build;
  onChange: (b: Build) => void;
  dm: Breakdown;
}) {
  const ac = SECTION_ACCENTS.damage;
  const setAA = (aa: DamageConfig["aa"]) =>
    onChange({ ...build, damage: { ...build.damage, aa } });

  return (
    <div className="space-y-5">
      {!dm.aaOn && (
        <OffNotice>
          Auto Attack is switched off, so it contributes nothing to the rotation. Autocast is
          suppressed too, since only autoattacks can proc it. The numbers below still show what
          Auto Attack would do if you turned it back on.
        </OffNotice>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <ResultTile
          label="Per hit"
          value={fmt(dm.aaPerHit)}
          sub="ATK × crit × multipliers"
          accentText={ac.tileText}
          accentBg={ac.tileBg}
          accentBorder={ac.tileBorder}
        />
        <ResultTile
          label="DPS at full rate"
          value={fmt(dm.aaDps, 1)}
          sub={`${fmt(dm.effHitsPerSec, 2)} eff hits/sec`}
          accentText={ac.tileText}
          accentBg={ac.tileBg}
          accentBorder={ac.tileBorder}
        />
        <ResultTile
          label="DPS in rotation"
          value={fmt(dm.aaDpsInRotation, 1)}
          sub={`${fmt(dm.aaUptime * 100, 1)}% autoattack uptime`}
          accentText={ac.tileText}
          accentBg={ac.tileBg}
          accentBorder={ac.tileBorder}
        />
      </div>

      {build.target.enabled && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <ResultTile
            label="Per hit vs target"
            value={fmt(dm.aaPerHitVsTarget)}
            sub={`elem ×${fmt(dm.elMult, 2)} · def ×${fmt(dm.defMult, 2)} · hit ${fmt(dm.hitChance * 100, 1)}%`}
          />
          <ResultTile
            label="DPS in rotation vs target"
            value={fmt(dm.aaDpsInRotationVsTarget, 1)}
            sub={`Total: ${fmt(dm.aaDpsInRotationVsTarget * build.durationSec, 0)}`}
          />
        </div>
      )}

      <p className="text-[11px] text-muted">
        Auto Attack uses your primary attack type from the banner. Multistrike raises effective
        hits/sec and applies here. Full rate is what you deal while actually autoattacking;
        in-rotation scales that by the time your skills leave free.
      </p>

      <MultiplierList
        multipliers={build.damage.aa.multipliers}
        onChange={(multipliers) => setAA({ ...build.damage.aa, multipliers })}
        accentText={ac.tileText}
      />
    </div>
  );
}

// ─── Skills Block ────────────────────────────────────────────────────────────

function SkillRow({
  skill,
  result,
  onChange,
  onRemove,
  targetEnabled,
  durationSec,
  skillDelaySec,
}: {
  skill: SkillEntry;
  result: SkillResult | undefined;
  onChange: (s: SkillEntry) => void;
  onRemove: () => void;
  targetEnabled: boolean;
  durationSec: number;
  skillDelaySec: number;
}) {
  const [open, setOpen] = React.useState(false);
  const ac = SECTION_ACCENTS.skill;
  const dps = result ? (targetEnabled ? result.dpsVsTarget : result.dps) : 0;
  // The cycle sits on the delay floor when cast + cooldown alone would be faster than the game allows.
  const atDelayFloor =
    !!result && skillDelaySec > 0 && result.cycleSec <= skillDelaySec + 1e-9;

  return (
    <div
      className={cn(
        "rounded-xl border transition",
        skill.enabled ? "border-sec-skill/30 bg-sec-skill/5" : "border-border bg-surface-2/40",
      )}
    >
      {/* Row header: enable switch, name, DPS, collapse, remove */}
      <div className="flex items-center gap-2 px-3 py-2">
        <Toggle
          checked={skill.enabled}
          onChange={(enabled) => onChange({ ...skill, enabled })}
          title={skill.enabled ? "Mute this skill" : "Include this skill"}
        />
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex min-w-0 flex-1 items-center justify-between gap-2 text-left"
        >
          <span
            className={cn(
              "truncate font-semibold",
              skill.enabled ? "text-foreground" : "text-muted",
            )}
          >
            {skill.name || "Unnamed skill"}
          </span>
          <span className="flex shrink-0 items-center gap-2">
            <span className={cn("text-sm font-bold", skill.enabled ? ac.tileText : "text-muted")}>
              {fmt(dps, 1)} DPS
            </span>
            <span
              className={cn(
                "text-muted transition-transform duration-200",
                open ? "rotate-90" : "rotate-0",
              )}
            >
              ▸
            </span>
          </span>
        </button>
        <button
          type="button"
          onClick={onRemove}
          title="Remove skill"
          className="shrink-0 rounded p-1 text-muted transition hover:bg-bad/10 hover:text-bad"
        >
          ✕
        </button>
      </div>

      {open && (
        <div className="space-y-4 border-t border-border/60 px-3 pb-3 pt-3">
          {/* Readouts */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <ResultTile
              label="Per cast"
              value={fmt(result?.perCast ?? 0)}
              sub={`${skill.damagePct}% × ${skill.hits} hit${skill.hits !== 1 ? "s" : ""}`}
            />
            <ResultTile
              label="Cast time"
              value={`${fmt(result?.actualCastTime ?? 0, 2)}s`}
              sub={`${fmt(skill.baseCastTime, 1)}s base after CTR`}
            />
            <ResultTile
              label="Cycle"
              value={`${fmt(result?.cycleSec ?? 0, 2)}s`}
              sub={
                atDelayFloor
                  ? `held at the ${fmt(skillDelaySec, 2)}s skill delay`
                  : "cast + cooldown"
              }
            />
            <ResultTile
              label={`Casts in ${durationSec}s`}
              value={fmt(result?.castsInWindow ?? 0, 1)}
              sub={`${fmt(result?.castsPerSec ?? 0, 2)}/s · ${fmt(result?.total ?? 0, 0)} damage`}
            />
          </div>

          {/* Inputs */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <TextInput
              label="Skill name"
              value={skill.name}
              onChange={(name) => onChange({ ...skill, name })}
              placeholder="e.g. Snipe"
            />
            <NumberInput
              label="Skill damage %"
              value={skill.damagePct}
              onChange={(damagePct) => onChange({ ...skill, damagePct })}
              min={0}
              step={10}
              suffix="%"
            />
            <NumberInput
              label="Hits per cast"
              value={skill.hits}
              onChange={(hits) => onChange({ ...skill, hits: Math.max(1, Math.round(hits)) })}
              min={1}
              step={1}
            />
            <NumberInput
              label="Base cast time"
              value={skill.baseCastTime}
              onChange={(baseCastTime) =>
                onChange({ ...skill, baseCastTime: Math.max(0, baseCastTime) })
              }
              min={0}
              step={0.1}
              suffix="s"
              hint="Listed cast time, before reduction"
            />
            <NumberInput
              label="Cooldown"
              value={skill.cooldownSec}
              onChange={(cooldownSec) =>
                onChange({ ...skill, cooldownSec: Math.max(0, cooldownSec) })
              }
              min={0}
              step={0.5}
              suffix="s"
              hint="Starts when the cast finishes"
            />
            <div />
          </div>

          <CritToggleRow
            label="Crit applies to this skill"
            checked={skill.critApplies}
            onChange={(critApplies) => onChange({ ...skill, critApplies })}
          />

          <MultiplierList
            multipliers={skill.multipliers}
            onChange={(multipliers) => onChange({ ...skill, multipliers })}
            accentText={ac.tileText}
          />
        </div>
      )}
    </div>
  );
}

function SkillsBlock({
  build,
  onChange,
  dm,
}: {
  build: Build;
  onChange: (b: Build) => void;
  dm: Breakdown;
}) {
  const ac = SECTION_ACCENTS.skill;
  const skills = build.damage.skills;
  const resultById = React.useMemo(
    () => new Map(dm.skills.map((s) => [s.id, s])),
    [dm.skills],
  );

  const setSkills = (next: SkillEntry[]) =>
    onChange({ ...build, damage: { ...build.damage, skills: { ...skills, entries: next } } });

  const addSkill = () =>
    setSkills([
      ...skills.entries,
      {
        ...DEFAULT_SKILL,
        id: crypto.randomUUID(),
        name: `Skill ${skills.entries.length + 1}`,
        multipliers: [],
      },
    ]);

  return (
    <div className="space-y-5">
      {!dm.skillsOn && (
        <OffNotice>
          Skills are switched off, so the whole timeline is spent autoattacking and autoattack
          uptime reads 100%.
        </OffNotice>
      )}

      {/* Aggregate readouts */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <ResultTile
          label="Skill DPS"
          value={fmt(dm.targetEnabled ? dm.skillDpsVsTarget : dm.skillDps, 1)}
          sub={`${dm.skills.filter((s) => s.enabled).length} of ${dm.skills.length} in rotation`}
          accentText={ac.tileText}
          accentBg={ac.tileBg}
          accentBorder={ac.tileBorder}
        />
        <ResultTile
          label="Casts / sec"
          value={`${fmt(dm.totalCastsPerSec, 2)}/s`}
          sub={`skill delay caps you at ${fmt(dm.maxCastsPerSec, 2)}/s`}
          accentText={ac.tileText}
          accentBg={ac.tileBg}
          accentBorder={ac.tileBorder}
        />
        <ResultTile
          label="Time spent casting"
          value={`${fmt(Math.min(1, dm.totalCastFraction) * 100, 1)}%`}
          sub={dm.isCastBound ? "over-subscribed" : `${fmt(dm.aaUptime * 100, 1)}% left to autoattack`}
          accentText={ac.tileText}
          accentBg={ac.tileBg}
          accentBorder={ac.tileBorder}
        />
        <ResultTile
          label={`Total over ${build.durationSec}s`}
          value={fmt(
            dm.targetEnabled ? dm.skillDpsVsTarget * build.durationSec : dm.skillTotal,
            0,
          )}
          accentText={ac.tileText}
          accentBg={ac.tileBg}
          accentBorder={ac.tileBorder}
        />
      </div>

      {dm.isCastBound && (
        <div className="rounded-xl border border-bad/30 bg-bad/6 p-4">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-bad">
            Rotation over-subscribed
          </p>
          <p className="text-sm text-foreground">
            Your skills want {fmt(dm.totalCastFraction * 100, 0)}% of the timeline but only 100% is
            available, so casts are scaled down proportionally and there is no time left to
            autoattack. Raise cooldowns, cut a skill, or reduce cast time to fit.
          </p>
        </div>
      )}

      {dm.isDelayBound && !dm.isCastBound && (
        <div className="rounded-xl border border-accent/30 bg-accent/6 p-4">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-accent">
            Capped by skill delay
          </p>
          <p className="text-sm text-foreground">
            Your cooldowns would allow {fmt(dm.desiredCastsPerSec, 2)} casts/sec, but the{" "}
            {fmt(dm.skillDelaySec, 2)}s skill delay holds you to{" "}
            {fmt(dm.maxCastsPerSec, 2)}/s across all skills. Lower skill delay (raise ASPD) to lift
            the ceiling; shorter cooldowns will not help.
          </p>
        </div>
      )}

      {/* Skill list */}
      <div className="space-y-2">
        {skills.entries.length === 0 ? (
          <p className="rounded-xl border border-border bg-surface-2/40 p-4 text-sm text-muted">
            No skills yet. Add one to build a rotation.
          </p>
        ) : (
          skills.entries.map((s, i) => (
            <SkillRow
              key={s.id}
              skill={s}
              result={resultById.get(s.id)}
              targetEnabled={dm.targetEnabled}
              durationSec={build.durationSec}
              skillDelaySec={dm.skillDelaySec}
              onChange={(updated) => {
                const next = [...skills.entries];
                next[i] = updated;
                setSkills(next);
              }}
              onRemove={() => setSkills(skills.entries.filter((_, j) => j !== i))}
            />
          ))
        )}
      </div>

      <Button variant="outline" size="sm" onClick={addSkill}>
        + Add skill
      </Button>

      <p className="text-[11px] text-muted">
        Each skill repeats on a cycle of cast time + skill delay + cooldown (all three add up).
        Skill delay ({fmt(dm.skillDelaySec, 2)}s — set in the Speed section, tracks ASPD) also
        acts as a global cap, so all skills together cannot exceed{" "}
        {fmt(dm.maxCastsPerSec, 2)} casts/sec. Whatever time your skills leave free is spent
        autoattacking.
      </p>
    </div>
  );
}

// ─── Status Block ─────────────────────────────────────────────────────────────

function StatusBlock({
  build,
  onChange,
  dm,
}: {
  build: Build;
  onChange: (b: Build) => void;
  dm: Breakdown;
}) {
  const ac = SECTION_ACCENTS.status;
  const status = build.damage.status;
  const setStatus = (s: DamageConfig["status"]) =>
    onChange({ ...build, damage: { ...build.damage, status: s } });

  return (
    <div className="space-y-5">
      {!dm.statusOn && (
        <OffNotice>Status damage is switched off and contributes nothing to the rotation.</OffNotice>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <ResultTile
          label="Per tick"
          value={fmt(dm.statusPerTick, 1)}
          sub={`${status.stacks} stack${status.stacks !== 1 ? "s" : ""} · StatusDmg% gear`}
          accentText={ac.tileText}
          accentBg={ac.tileBg}
          accentBorder={ac.tileBorder}
        />
        <ResultTile
          label="DPS (1 tick/sec)"
          value={fmt(dm.targetEnabled ? dm.statusDpsVsTarget : dm.statusDps, 1)}
          sub="Ticks whether or not you autoattack"
          accentText={ac.tileText}
          accentBg={ac.tileBg}
          accentBorder={ac.tileBorder}
        />
        <ResultTile
          label={`Total over ${build.durationSec}s`}
          value={fmt(
            (dm.targetEnabled ? dm.statusDpsVsTarget : dm.statusDps) * build.durationSec,
            0,
          )}
          accentText={ac.tileText}
          accentBg={ac.tileBg}
          accentBorder={ac.tileBorder}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <NumberInput
          label="Stacks on enemy"
          value={status.stacks}
          onChange={(stacks) => setStatus({ ...status, stacks: Math.max(1, Math.round(stacks)) })}
          min={1}
          step={1}
          hint="StatusDamage% × stacks applied"
        />
        <NumberInput
          label="StatusDamage%"
          value={build.gear.StatusDamagepct}
          onChange={(StatusDamagepct) =>
            onChange({ ...build, gear: { ...build.gear, StatusDamagepct } })
          }
          min={0}
          suffix="%"
          hint="From your gear — shared with the rest of the build"
        />
      </div>

      <CritToggleRow
        label="Crit applies to status ticks"
        checked={status.critApplies}
        onChange={(critApplies) => setStatus({ ...status, critApplies })}
      />

      <p className="text-[11px] text-muted">
        Formula: (LV + STR + AGI + INT) / 10 × Stacks × StatusDamage%. Tick rate is assumed 1/sec.
        Because a damage-over-time effect keeps ticking while you cast, status is the one source
        that is not scaled by autoattack uptime.
      </p>

      <MultiplierList
        multipliers={status.multipliers}
        onChange={(multipliers) => setStatus({ ...status, multipliers })}
        accentText={ac.tileText}
      />
    </div>
  );
}

// ─── Autocast Block ───────────────────────────────────────────────────────────

function AutocastBlock({
  build,
  onChange,
  dm,
}: {
  build: Build;
  onChange: (b: Build) => void;
  dm: Breakdown;
}) {
  const ac = SECTION_ACCENTS.autocast;
  const autocast = build.damage.autocast;
  const setAutocast = (a: DamageConfig["autocast"]) =>
    onChange({ ...build, damage: { ...build.damage, autocast: a } });

  return (
    <div className="space-y-5">
      {dm.autocastSuppressedByAa && (
        <OffNotice>
          Autocast is on but cannot proc, because Auto Attack is switched off and only autoattacks
          trigger autocasts. Turn Auto Attack back on to see it contribute.
        </OffNotice>
      )}
      {!autocast.enabled && (
        <OffNotice>
          Autocast is switched off — useful if your class has no autocast at all.
        </OffNotice>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <ResultTile
          label="Per proc"
          value={fmt(dm.acPerCast)}
          sub={`${autocast.damagePct}% ATK`}
          accentText={ac.tileText}
          accentBg={ac.tileBg}
          accentBorder={ac.tileBorder}
        />
        <ResultTile
          label="Procs per sec"
          value={fmt(dm.acProcsPerSec, 2)}
          sub={`${autocast.chancePct}% chance × base attacks/sec`}
          accentText={ac.tileText}
          accentBg={ac.tileBg}
          accentBorder={ac.tileBorder}
        />
        <ResultTile
          label="DPS in rotation"
          value={fmt(dm.targetEnabled ? dm.acDpsInRotationVsTarget : dm.acDpsInRotation, 1)}
          sub={`${fmt(dm.acDps, 1)} at full rate · ${fmt(dm.aaUptime * 100, 1)}% uptime`}
          accentText={ac.tileText}
          accentBg={ac.tileBg}
          accentBorder={ac.tileBorder}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TextInput
          label="Skill name"
          value={autocast.name}
          onChange={(name) => setAutocast({ ...autocast, name })}
          placeholder="e.g. Ice Bolt"
        />
        <NumberInput
          label="Skill damage %"
          value={autocast.damagePct}
          onChange={(damagePct) => setAutocast({ ...autocast, damagePct })}
          min={0}
          step={10}
          suffix="%"
        />
        <NumberInput
          label="Proc chance"
          value={autocast.chancePct}
          onChange={(chancePct) => setAutocast({ ...autocast, chancePct })}
          min={0}
          max={100}
          step={1}
          suffix="%"
        />
        <div />
      </div>

      <CritToggleRow
        label="Crit applies to autocast"
        checked={autocast.critApplies}
        onChange={(critApplies) => setAutocast({ ...autocast, critApplies })}
      />

      <div className="rounded-xl border border-sec-autocast/30 bg-sec-autocast/5 p-4">
        <p className="mb-1 text-xs font-bold uppercase tracking-wide text-sec-autocast">
          Confirmed proc behaviour
        </p>
        <p className="text-sm text-foreground">
          Procs scale on <strong>base attacks/sec</strong>, not effective hits/sec. Multistrike
          extra hits count as one hit for autocast, so stacking Multistrike raises your Auto Attack
          damage but not your autocast rate. Only autoattacks trigger autocasts, which is why
          casting more skills lowers autocast DPS.
        </p>
      </div>

      <MultiplierList
        multipliers={autocast.multipliers}
        onChange={(multipliers) => setAutocast({ ...autocast, multipliers })}
        accentText={ac.tileText}
      />
    </div>
  );
}

// ─── Combined Block ───────────────────────────────────────────────────────────

function CombinedBlock({ build, dm }: { build: Build; dm: Breakdown }) {
  const useT = dm.targetEnabled;
  const totalDps = useT ? dm.totalRotationDpsVsTarget : dm.totalRotationDps;
  const totalDamage = useT ? dm.totalRotationDamageVsTarget : dm.totalRotationDamage;

  const sources = [
    {
      key: "aa",
      label: "Auto Attack",
      on: dm.aaOn,
      dps: useT ? dm.aaDpsInRotationVsTarget : dm.aaDpsInRotation,
      color: "bg-sec-damage",
      note: `${fmt(dm.aaUptime * 100, 1)}% uptime`,
    },
    {
      key: "skills",
      label: "Skills",
      on: dm.skillsOn,
      dps: useT ? dm.skillDpsVsTarget : dm.skillDps,
      color: "bg-sec-skill",
      note: `${dm.skills.filter((s) => s.enabled).length} in rotation`,
    },
    {
      key: "status",
      label: "Status",
      on: dm.statusOn,
      dps: useT ? dm.statusDpsInRotationVsTarget : dm.statusDpsInRotation,
      color: "bg-sec-status",
      note: "always ticking",
    },
    {
      key: "autocast",
      label: "Autocast",
      on: dm.autocastOn,
      dps: useT ? dm.acDpsInRotationVsTarget : dm.acDpsInRotation,
      color: "bg-sec-autocast",
      note: dm.autocastSuppressedByAa ? "needs autoattacks" : `${fmt(dm.acProcsPerSec, 2)} procs/s`,
    },
  ];

  const share = (dps: number) => (totalDps > 0 ? (dps / totalDps) * 100 : 0);

  const enabledSkills = dm.skills.filter((s) => s.enabled && s.dps > 0);

  return (
    <div className="space-y-5">
      {/* Totals */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <ResultTile
          label={`Rotation DPS${useT ? " vs target" : ""}`}
          value={fmt(totalDps, 1)}
          sub="All active sources combined"
          accentText="text-primary"
          accentBg="bg-primary/8"
          accentBorder="border-primary/40"
        />
        <ResultTile
          label={`Total over ${build.durationSec}s`}
          value={fmt(totalDamage, 0)}
          accentText="text-primary"
          accentBg="bg-primary/8"
          accentBorder="border-primary/40"
        />
        <ResultTile
          label="Autoattack uptime"
          value={`${fmt(dm.aaUptime * 100, 1)}%`}
          sub={
            dm.isCastBound
              ? "cast-bound"
              : dm.isDelayBound
                ? "delay-bound"
                : `${fmt(Math.min(1, dm.totalCastFraction) * 100, 1)}% casting`
          }
          accentText="text-primary"
          accentBg="bg-primary/8"
          accentBorder="border-primary/40"
        />
      </div>

      {/* Warnings */}
      {dm.isCastBound && (
        <div className="rounded-xl border border-bad/30 bg-bad/6 p-4">
          <p className="text-sm text-foreground">
            <strong className="text-bad">Over-subscribed rotation.</strong> Skills need{" "}
            {fmt(dm.totalCastFraction * 100, 0)}% of the timeline, so casts are scaled down and no
            time is left to autoattack.
          </p>
        </div>
      )}
      {dm.isDelayBound && !dm.isCastBound && (
        <div className="rounded-xl border border-accent/30 bg-accent/6 p-4">
          <p className="text-sm text-foreground">
            <strong className="text-accent">Capped by skill delay.</strong> Your cooldowns would
            allow {fmt(dm.desiredCastsPerSec, 2)} casts/sec, but the {fmt(dm.skillDelaySec, 2)}s
            skill delay holds you to {fmt(dm.maxCastsPerSec, 2)}/s. Lower skill delay (raise ASPD)
            to lift the ceiling — shorter cooldowns will not help.
          </p>
        </div>
      )}
      {dm.autocastSuppressedByAa && (
        <div className="rounded-xl border border-border bg-surface-2/60 p-4">
          <p className="text-sm text-foreground">
            Autocast is contributing nothing because Auto Attack is off — only autoattacks trigger
            autocasts.
          </p>
        </div>
      )}

      {/* Per-source breakdown */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wide text-muted">
          Where your damage comes from
        </h4>
        {sources.map((s) => (
          <div key={s.key} className="space-y-1">
            <div className="flex items-baseline justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <span
                  className={cn("font-semibold", s.on ? "text-foreground" : "text-muted")}
                >
                  {s.label}
                </span>
                {s.on ? (
                  <span className="text-[11px] text-muted">{s.note}</span>
                ) : (
                  <span className="rounded bg-muted/20 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted">
                    Off
                  </span>
                )}
              </div>
              <div className="shrink-0 text-right">
                <span className={cn("font-bold", s.on ? "text-foreground" : "text-muted")}>
                  {fmt(s.dps, 1)} DPS
                </span>
                <span className="ml-2 text-xs text-muted">
                  {fmt(share(s.dps), 1)}% · {fmt(s.dps * build.durationSec, 0)}
                </span>
              </div>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-surface-2">
              <div
                className={cn("h-full rounded-full transition-all", s.color)}
                style={{ width: `${Math.min(100, share(s.dps)).toFixed(1)}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Per-skill itemisation */}
      {dm.skillsOn && enabledSkills.length > 0 && (
        <div className="space-y-2 rounded-xl border border-sec-skill/30 bg-sec-skill/5 p-4">
          <h4 className="text-xs font-bold uppercase tracking-wide text-sec-skill">
            Skills, itemised
          </h4>
          {enabledSkills.map((s) => {
            const d = useT ? s.dpsVsTarget : s.dps;
            return (
              <div key={s.id} className="flex items-baseline justify-between gap-3 text-sm">
                <span className="truncate text-foreground">{s.name || "Unnamed skill"}</span>
                <span className="shrink-0 text-right">
                  <span className="font-semibold text-foreground">{fmt(d, 1)} DPS</span>
                  <span className="ml-2 text-xs text-muted">
                    {fmt(share(d), 1)}% · every {fmt(s.cycleSec, 1)}s
                  </span>
                </span>
              </div>
            );
          })}
        </div>
      )}

      <p className="text-[11px] text-muted">
        Auto Attack and Autocast are scaled by autoattack uptime, since casting a skill means you
        are not autoattacking. Status ticks regardless. Shares add up to 100% of the rotation.
      </p>
    </div>
  );
}

// ─── Main DamageTab ───────────────────────────────────────────────────────────

const DAMAGE_SECTION_KEYS = ["target", "aa", "skills", "status", "autocast", "combined"] as const;
type DamageSectionKey = (typeof DAMAGE_SECTION_KEYS)[number];

const DAMAGE_INITIAL_OPEN: Record<DamageSectionKey, boolean> = {
  target: false, aa: false, skills: false, status: false, autocast: false, combined: false,
};

export function DamageTab({
  build,
  computeBuild,
  onChange,
  onEditInCalculator,
  swapInfo,
}: {
  build: Build;
  /** Baseline + active swap deltas. Compute-only — never passed to onChange. */
  computeBuild: Build;
  onChange: (b: Build) => void;
  onEditInCalculator: () => void;
  swapInfo: {
    activeCount: number;
    applied: boolean;
    onToggle: (v: boolean) => void;
    onOpenSetCompare: () => void;
  };
}) {
  const dm = React.useMemo(() => computeDamageBreakdown(computeBuild), [computeBuild]);
  const d = build.damage;

  const [openSections, setOpenSections] = React.useState<Record<DamageSectionKey, boolean>>(
    DAMAGE_INITIAL_OPEN,
  );
  const setSection = (key: DamageSectionKey, value: boolean) =>
    setOpenSections((prev) => ({ ...prev, [key]: value }));

  const allOpen = DAMAGE_SECTION_KEYS.every((k) => openSections[k]);
  const toggleAll = () =>
    setOpenSections(
      Object.fromEntries(DAMAGE_SECTION_KEYS.map((k) => [k, !allOpen])) as Record<DamageSectionKey, boolean>,
    );

  const setGroup = <K extends keyof DamageConfig>(key: K, value: DamageConfig[K]) =>
    onChange({ ...build, damage: { ...d, [key]: value } });

  const aaSummary = dm.aaOn ? `${fmt(dm.aaDpsInRotation, 1)} DPS` : "Off";
  const skillSummary = dm.skillsOn ? `${fmt(dm.skillDps, 1)} DPS` : "Off";
  const statusSummary = dm.statusOn ? `${fmt(dm.statusPerTick, 1)} / tick` : "Off";
  const acSummary = dm.autocastOn ? `${fmt(dm.acDpsInRotation, 1)} DPS` : "Off";
  const totalSummary = `${fmt(dm.totalRotationDps, 1)} DPS`;

  return (
    <div className="space-y-4">
      {swapInfo.activeCount > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-primary">
              {swapInfo.applied
                ? `${swapInfo.activeCount} gear swap${swapInfo.activeCount === 1 ? "" : "s"} applied`
                : `${swapInfo.activeCount} gear swap${swapInfo.activeCount === 1 ? "" : "s"} available (off)`}
            </p>
            <p className="text-xs text-muted">
              Inputs still edit your base build. Swaps only affect computed numbers above.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <Toggle
              checked={swapInfo.applied}
              onChange={swapInfo.onToggle}
              label={swapInfo.applied ? "On" : "Off"}
            />
            <Button variant="outline" size="sm" onClick={swapInfo.onOpenSetCompare}>
              Edit swaps ↗
            </Button>
          </div>
        </div>
      )}
      <SharedBanner
        build={build}
        dm={dm}
        onEditInCalculator={onEditInCalculator}
        swapsApplied={swapInfo.applied && swapInfo.activeCount > 0}
        swapCount={swapInfo.activeCount}
      />
      <DurationControl build={build} onChange={onChange} />
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="ghost" size="sm" onClick={toggleAll}>
          {allOpen ? "⌃ Collapse all" : "⌄ Expand all"}
        </Button>
      </div>

      {/* Target & Element */}
      <SectionCard
        title="Target & Element"
        subtitle="Who you are hitting — element matchup, defence, and dodge."
        summary={dm.targetEnabled ? `${fmtX(dm.elMult)} element` : "Off"}
        open={openSections.target}
        onOpenChange={(v) => setSection("target", v)}
        accent="damage"
        dimmed={!dm.targetEnabled}
        headerRight={
          <SourceSwitch
            enabled={build.target.enabled}
            onChange={(enabled) =>
              onChange({ ...build, target: { ...build.target, enabled } })
            }
          />
        }
      >
        <TargetBlock build={build} onChange={onChange} dm={dm} />
      </SectionCard>

      {/* Auto Attack */}
      <SectionCard
        title="Auto Attack"
        subtitle="Flat ATK × effective hits/sec with your unique multipliers."
        summary={aaSummary}
        open={openSections.aa}
        onOpenChange={(v) => setSection("aa", v)}
        accent="damage"
        dimmed={!dm.aaOn}
        headerRight={
          <SourceSwitch
            enabled={d.aa.enabled}
            onChange={(enabled) => setGroup("aa", { ...d.aa, enabled })}
          />
        }
      >
        <AABlock build={build} onChange={onChange} dm={dm} />
      </SectionCard>

      {/* Skills */}
      <SectionCard
        title="Skills"
        subtitle="Add each skill with its cast time and cooldown to build a rotation."
        summary={skillSummary}
        open={openSections.skills}
        onOpenChange={(v) => setSection("skills", v)}
        accent="skill"
        dimmed={!dm.skillsOn}
        headerRight={
          <SourceSwitch
            enabled={d.skills.enabled}
            onChange={(enabled) => setGroup("skills", { ...d.skills, enabled })}
          />
        }
      >
        <SkillsBlock build={build} onChange={onChange} dm={dm} />
      </SectionCard>

      {/* Status */}
      <SectionCard
        title="Status Damage"
        subtitle="Burning, bleeding, or other status ticks."
        summary={statusSummary}
        open={openSections.status}
        onOpenChange={(v) => setSection("status", v)}
        accent="status"
        dimmed={!dm.statusOn}
        headerRight={
          <SourceSwitch
            enabled={d.status.enabled}
            onChange={(enabled) => setGroup("status", { ...d.status, enabled })}
          />
        }
      >
        <StatusBlock build={build} onChange={onChange} dm={dm} />
      </SectionCard>

      {/* Autocast */}
      <SectionCard
        title={`Autocast${d.autocast.name ? ` — ${d.autocast.name}` : ""}`}
        subtitle="Procs from autoattacks at a % chance. Switch off for classes without it."
        summary={acSummary}
        open={openSections.autocast}
        onOpenChange={(v) => setSection("autocast", v)}
        accent="autocast"
        dimmed={!dm.autocastOn}
        headerRight={
          <SourceSwitch
            enabled={d.autocast.enabled}
            onChange={(enabled) => setGroup("autocast", { ...d.autocast, enabled })}
            disabled={!dm.aaOn}
            title={
              dm.aaOn
                ? undefined
                : "Auto Attack is off — only autoattacks trigger autocasts"
            }
          />
        }
      >
        <AutocastBlock build={build} onChange={onChange} dm={dm} />
      </SectionCard>

      {/* Combined */}
      <SectionCard
        title="Combined Overview"
        subtitle="One rotation: skills, autoattacks in the gaps, autocast procs, and status ticks."
        summary={totalSummary}
        open={openSections.combined}
        onOpenChange={(v) => setSection("combined", v)}
      >
        <CombinedBlock build={build} dm={dm} />
      </SectionCard>
    </div>
  );
}
