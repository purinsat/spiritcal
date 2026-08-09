"use client";

import { Fragment, useMemo, useState } from "react";
import {
  BASE_STAT_ROW,
  ESSENCE_POOLS,
  buildReverseIndex,
  type EssencePool,
  type EssenceOption,
} from "@/data/essenceData";
import { ESSENCES, POTENTIAL_MIN, POTENTIAL_MAX, type EssenceDef } from "@/data/potentialData";
import { ESSENCE_ACCENTS, type EssenceAccent } from "@/lib/sectionAccents";
import { SectionCard } from "@/components/SectionCard";
import { Button, cn } from "@/components/ui";

// ── Helpers ────────────────────────────────────────────────────────────────

function fmtValue(v: number): string {
  return v > 0 ? `+${v}` : String(v);
}

function isNegativeBenefit(v: number): boolean {
  return v < 0;
}

// ── Per-essence colour classes ─────────────────────────────────────────────

const COLOR_CLASSES: Record<string, {
  border: string; ring: string; headerBg: string; headerText: string; tag: string; tagText: string;
}> = {
  "ess-rebirth":     { border: "border-ess-rebirth/40",     ring: "ring-ess-rebirth",     headerBg: "bg-ess-rebirth/10",     headerText: "text-ess-rebirth",     tag: "bg-ess-rebirth/15",     tagText: "text-ess-rebirth" },
  "ess-flow":        { border: "border-ess-flow/40",        ring: "ring-ess-flow",        headerBg: "bg-ess-flow/10",        headerText: "text-ess-flow",        tag: "bg-ess-flow/15",        tagText: "text-ess-flow" },
  "ess-destruction": { border: "border-ess-destruction/40", ring: "ring-ess-destruction", headerBg: "bg-ess-destruction/10", headerText: "text-ess-destruction", tag: "bg-ess-destruction/15", tagText: "text-ess-destruction" },
  "ess-growth":      { border: "border-ess-growth/40",      ring: "ring-ess-growth",      headerBg: "bg-ess-growth/10",      headerText: "text-ess-growth",      tag: "bg-ess-growth/15",      tagText: "text-ess-growth" },
  "ess-chaos":       { border: "border-ess-chaos/40",       ring: "ring-ess-chaos",       headerBg: "bg-ess-chaos/10",       headerText: "text-ess-chaos",       tag: "bg-ess-chaos/15",       tagText: "text-ess-chaos" },
};

// ── Option pill ────────────────────────────────────────────────────────────

function OptionPill({ opt, accent }: { opt: EssenceOption; accent: EssenceAccent }) {
  const neg = isNegativeBenefit(opt.max);
  return (
    <span className={cn(
      "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium bg-surface",
      accent.border
    )}>
      <span className="text-foreground">{opt.label}</span>
      <span className={cn("font-semibold", neg ? "text-good" : accent.valueText)}>
        {fmtValue(opt.max)}
      </span>
    </span>
  );
}

// ── Pool card ──────────────────────────────────────────────────────────────

function PoolCard({ pool }: { pool: EssencePool }) {
  const accent = ESSENCE_ACCENTS[pool.key];
  const defaultRows = 3 - 1;
  const normalRows = pool.normalMaxSubstats - 1;
  const repeatsRow = normalRows > pool.rows.length;
  const chaosExtra = pool.maxSubstats > pool.normalMaxSubstats;
  const drawText =
    defaultRows === normalRows
      ? `${defaultRows} rows (fixed)`
      : repeatsRow
        ? `2–${pool.rows.length} rows (${pool.rows.length + 1}–${normalRows} repeat a row)`
        : `2–${normalRows} of these ${pool.rows.length} rows`;

  return (
    <div className={cn("flex flex-col overflow-hidden rounded-2xl border bg-surface shadow-sm", accent.border)}>
      <div className={cn("flex items-center gap-3 px-4 py-3", accent.headerBg)}>
        <span className="text-2xl leading-none" aria-hidden>{pool.icon}</span>
        <div className="min-w-0 flex-1">
          <h3 className={cn("font-display text-base font-semibold leading-tight", accent.headerText)}>
            {pool.label}
          </h3>
          <p className="text-[11px] text-muted">
            Starts 3 · normally max {pool.normalMaxSubstats}
            {chaosExtra ? ` (${pool.maxSubstats} via Chaos)` : ""} · {drawText}
          </p>
        </div>
        <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", accent.valueBg, accent.valueText)}>
          3–{pool.normalMaxSubstats} substats
          {chaosExtra ? <span className="ml-0.5 opacity-70">(+1 Chaos)</span> : null}
        </span>
      </div>
      <div className="flex flex-col gap-2.5 p-3">
        {pool.rows.map((row, ri) => (
          <div key={ri} className={cn("rounded-xl border border-dashed p-2.5", accent.border, accent.rowBg)}>
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-muted">Row {ri + 1}</span>
              <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-bold", accent.valueBg, accent.valueText)}>
                {row.options.length === 1 ? "Fixed" : `Pick 1 of ${row.options.length}`}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {row.options.map((opt, oi) => (
                <Fragment key={opt.label}>
                  {oi > 0 && <span className="text-[10px] font-medium uppercase text-muted/60">or</span>}
                  <OptionPill opt={opt} accent={accent} />
                </Fragment>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Essence reference card (for the Essence Types section) ─────────────────

function EssenceCard({ ess }: { ess: EssenceDef }) {
  const c = COLOR_CLASSES[ess.colorKey];
  const costLabel = ess.consumesAll ? "All remaining" : `${ess.costMin}–${ess.costMax} potential`;
  return (
    <div className={cn("flex flex-col overflow-hidden rounded-2xl border bg-surface shadow-sm", c.border)}>
      <div className={cn("flex items-center gap-3 px-4 py-3", c.headerBg)}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={ess.image} alt={ess.label} className="h-10 w-10 shrink-0 object-contain" />
        <div className="min-w-0 flex-1">
          <h3 className={cn("font-display text-base font-semibold leading-tight", c.headerText)}>{ess.label}</h3>
          <p className="text-[11px] text-muted">Drop chance: {ess.dropChancePct}%</p>
        </div>
        <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold", c.tag, c.tagText)}>
          {costLabel}
        </span>
      </div>
      <div className="px-4 py-3 text-sm text-foreground">
        <p>{ess.effect}</p>
        {ess.outcomes && (
          <ul className="mt-3 space-y-1.5">
            {ess.outcomes.map((o, i) => (
              <li key={i} className="flex gap-2">
                <span className="mt-0.5 shrink-0 text-[10px] font-bold text-muted">{(i + 1) * 25}%</span>
                <span className={o.dangerous ? "font-semibold text-bad" : "text-muted"}>{o.label}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// ── PotentialSection body (intro text + reference cards) ───────────────────

function PotentialSectionBody() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">
        Every item drops with{" "}
        <strong className="text-foreground">{POTENTIAL_MIN}–{POTENTIAL_MAX} potential</strong>.
        Each essence use consumes some potential. When potential reaches 0 the item can no longer be
        modified. Essences drop from monsters with a{" "}
        <strong className="text-foreground">0.1%–0.5%</strong> chance, scaling with monster level.
      </p>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {ESSENCES.map((ess) => <EssenceCard key={ess.key} ess={ess} />)}
      </div>
    </div>
  );
}

// ── RulesContent (strips own Card/h2; SectionCard wraps it) ───────────────

function RulesContent() {
  return (
    <div className="space-y-3 text-sm text-foreground">
      <p className="text-muted">Every piece of gear is assigned substats when it drops.</p>
      <ol className="space-y-3">
        <li className="flex gap-3">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">1</span>
          <span>
            <strong>First substat is always a base attribute</strong> — one of STR / AGI / VIT / INT
            / DEX / LUK, rolling <span className="font-semibold text-accent">+2 to +3</span>.
          </span>
        </li>
        <li className="flex gap-3">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">2</span>
          <span>
            <strong>Remaining substats each come from a pool row</strong> in no fixed order.
            One option is picked per row, and no two substats share the same row —{" "}
            <em>until the final expansion repeats a row</em>.
          </span>
        </li>
        <li className="flex gap-3">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">3</span>
          <span>
            <strong>All items start at 3 substats</strong> and can be expanded with essences.{" "}
            <span className="font-semibold">Weapons</span> normally max at <span className="font-semibold">5</span>.{" "}
            <span className="font-semibold">Armor &amp; accessories</span> normally max at <span className="font-semibold">4</span>.{" "}
            <span className="font-semibold">Artifacts</span> stay at <span className="font-semibold">3</span>.{" "}
            The <strong>Essence of Chaos</strong> can push weapons to 6 and armor/accessories to 5.
          </span>
        </li>
        <li className="flex gap-3">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/20 text-xs font-bold text-accent">!</span>
          <span className="text-muted">
            Values shown are <strong className="text-foreground">maximums</strong>. Minimums are
            pending confirmation. Negative values are reductions — they are beneficial.
          </span>
        </li>
      </ol>
    </div>
  );
}

// ── SubstatPoolsContent (BaseStatBanner + nine PoolCards) ──────────────────

function SubstatPoolsContent() {
  return (
    <div className="space-y-4">
      {/* Base stat banner */}
      <div className="rounded-2xl border border-accent/30 bg-accent/6 p-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-accent">
          First substat — every item
        </p>
        <div className="flex flex-wrap gap-2">
          {BASE_STAT_ROW.options.map((opt) => (
            <span
              key={opt.label}
              className="inline-flex items-center gap-1.5 rounded-full border border-accent/40 bg-accent/10 px-3 py-1 text-sm font-semibold text-accent"
            >
              {opt.label}
              <span className="text-xs font-normal text-muted">+{opt.min}–{opt.max}</span>
            </span>
          ))}
        </div>
      </div>
      {/* Nine pool cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {ESSENCE_POOLS.map((pool) => <PoolCard key={pool.key} pool={pool} />)}
      </div>
    </div>
  );
}

// ── ReverseContent (strips own Card/h2) ────────────────────────────────────

function ReverseContent() {
  const index = useMemo(() => buildReverseIndex(), []);
  return (
    <div className="space-y-2">
      <p className="text-sm text-muted">
        Every modifier from all nine pools, the slots that can roll it, and the best available maximum.
        Computed automatically — never drifts from the pool data.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full border-separate border-spacing-0 text-sm">
          <thead>
            <tr>
              <th className="sticky left-0 bg-surface pb-2 pr-4 text-left text-xs font-semibold uppercase tracking-wide text-muted">Modifier</th>
              <th className="pb-2 pr-4 text-right text-xs font-semibold uppercase tracking-wide text-muted">Best max</th>
              <th className="pb-2 text-left text-xs font-semibold uppercase tracking-wide text-muted">Found on</th>
            </tr>
          </thead>
          <tbody>
            {index.map((entry, i) => {
              const neg = isNegativeBenefit(entry.bestMax);
              return (
                <tr key={entry.label} className={cn("border-t border-border/50", i % 2 === 0 ? "bg-surface" : "bg-background-alt")}>
                  <td className="py-2 pr-4 font-medium text-foreground">{entry.label}</td>
                  <td className={cn("py-2 pr-4 text-right font-semibold tabular-nums", neg ? "text-good" : "text-primary")}>
                    {fmtValue(entry.bestMax)}
                  </td>
                  <td className="py-2">
                    <div className="flex flex-wrap gap-1">
                      {entry.slots.map((s) => {
                        const a = ESSENCE_ACCENTS[s.slotKey];
                        return (
                          <span key={s.slotKey} className={cn("rounded-full border px-2 py-0.5 text-xs", a.border, a.headerBg, a.headerText)}>
                            {s.slotLabel}
                            {Math.abs(s.max) < Math.abs(entry.bestMax) && (
                              <span className="ml-1 opacity-60">({fmtValue(s.max)})</span>
                            )}
                          </span>
                        );
                      })}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Essence tile (replaces stepper row) ────────────────────────────────────

function EssenceTile({
  ess,
  count,
  onIncrement,
  onDecrement,
  blocked,
}: {
  ess: EssenceDef;
  count: number;
  onIncrement: () => void;
  onDecrement: (e: React.MouseEvent) => void;
  /** True when adding one more use would exceed remaining potential. */
  blocked: boolean;
}) {
  const c = COLOR_CLASSES[ess.colorKey];
  const selected = count > 0;
  const isOverused = ess.consumesAll && count > 1;
  const costLabel = ess.consumesAll ? "All remaining" : `${ess.costMin}–${ess.costMax} pot`;

  return (
    <div className={cn("relative", blocked && !selected && "opacity-50")}>
      {/* Main tile — whole surface taps to increment */}
      <button
        type="button"
        onClick={onIncrement}
        disabled={blocked}
        className={cn(
          "flex w-full flex-col items-center gap-2 rounded-2xl border-2 px-3 py-4 text-center transition",
          blocked
            ? "cursor-not-allowed border-border bg-surface-2/40"
            : selected
              ? cn(c.border, c.headerBg, "ring-2", c.ring, "ring-offset-1 ring-offset-background", "active:scale-95")
              : "border-border bg-surface-2/60 hover:border-border-strong hover:bg-surface active:scale-95"
        )}
      >
        {/* Count badge — top right, shown when selected */}
        {selected && (
          <span className={cn(
            "absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold",
            isOverused ? "bg-bad text-primary-foreground" : cn(c.tag, c.tagText)
          )}>
            {count}
          </span>
        )}

        {/* Orb art */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={ess.image} alt={ess.label} className="h-16 w-16 object-contain drop-shadow-sm" />

        {/* Name */}
        <p className={cn("text-xs font-bold leading-tight", selected ? c.headerText : "text-foreground")}>
          {ess.label.replace("Essence of ", "")}
        </p>

        {/* Cost */}
        {blocked && !selected ? (
          <p className="text-[10px] font-semibold text-bad">0 potential left</p>
        ) : (
          <p className="text-[10px] text-muted">{costLabel}</p>
        )}

        {/* Running cost when selected */}
        {selected && !ess.consumesAll && (
          <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", c.tag, c.tagText)}>
            {count * ess.costMin}–{count * ess.costMax} spent
          </span>
        )}
        {selected && ess.consumesAll && (
          <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", c.tag, c.tagText)}>
            consumes all
          </span>
        )}
      </button>

      {/* Decrement — overlaid sibling so no nested-button issue */}
      {selected && (
        <button
          type="button"
          onClick={onDecrement}
          title="Remove one use"
          className="absolute left-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-surface border border-border text-xs font-bold text-muted shadow-sm transition hover:bg-bad/10 hover:text-bad hover:border-bad/40"
        >
          −
        </button>
      )}
    </div>
  );
}

// ── Potential simulator ────────────────────────────────────────────────────

type EssenceCounts = Record<string, number>;

function PotentialSimulatorContent() {
  const [start, setStart] = useState(20);
  const [counts, setCounts] = useState<EssenceCounts>(() =>
    Object.fromEntries(ESSENCES.map((e) => [e.key, 0]))
  );

  const nonChaosEssences = ESSENCES.filter((e) => !e.consumesAll);
  const chaosEss = ESSENCES.find((e) => e.consumesAll)!;
  const chaosCount = counts[chaosEss.key] ?? 0;

  const spentMin = nonChaosEssences.reduce((s, e) => s + (counts[e.key] ?? 0) * e.costMin, 0);
  const spentMax = nonChaosEssences.reduce((s, e) => s + (counts[e.key] ?? 0) * e.costMax, 0);

  // Raw (may be negative) — used for verdict so all three states are reachable.
  const rawRemainMin = start - spentMax;
  const rawRemainMax = start - spentMin;

  // Clamped — used for display and for the zero-gate.
  const afterMin = Math.max(0, rawRemainMin);
  const afterMax = Math.max(0, rawRemainMax);

  let remainMin: number;
  let remainMax: number;
  let chaosNote: string | null = null;

  if (chaosCount > 0) {
    // Display: Chaos consumed whatever was left, so show 0.
    remainMin = 0;
    remainMax = 0;
    if (chaosCount > 1) {
      chaosNote = "Chaos always consumes all remaining potential — using it more than once has no extra effect.";
    }
  } else {
    remainMin = afterMin;
    remainMax = afterMax;
  }

  const totalUses = Object.values(counts).reduce((s, n) => s + n, 0);

  // Verdict uses raw values so it reflects over-spend even when display is clamped.
  type Verdict = "safe" | "maybe" | "insufficient";
  let verdict: Verdict = "safe";
  if (rawRemainMax < 0) verdict = "insufficient";
  else if (rawRemainMin < 0) verdict = "maybe";

  const verdictConfig: Record<Verdict, { label: string; cls: string; barCls: string }> = {
    safe:         { label: "Affordable",            cls: "text-good",   barCls: "bg-good" },
    maybe:        { label: "Might not fit",          cls: "text-accent",  barCls: "bg-accent" },
    insufficient: { label: "Not enough potential",   cls: "text-bad",    barCls: "bg-bad" },
  };
  const vc = verdictConfig[verdict];

  function adjust(key: string, delta: number) {
    setCounts((prev) => ({ ...prev, [key]: Math.max(0, (prev[key] ?? 0) + delta) }));
  }

  function reset() {
    setCounts(Object.fromEntries(ESSENCES.map((e) => [e.key, 0])));
    setStart(20);
  }

  const remainLabel = remainMin === remainMax ? String(remainMin) : `${remainMin}–${remainMax}`;

  return (
    <div className="space-y-5">
      {/* Starting potential row */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Starting potential</p>
        <div className="flex flex-wrap items-center gap-2">
          {[15, 20, 25].map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setStart(v)}
              className={cn(
                "rounded-lg border px-3 py-1.5 text-sm font-semibold transition",
                start === v
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-surface-2 text-muted hover:border-primary/50 hover:text-foreground"
              )}
            >
              {v}
            </button>
          ))}
          <input
            type="number"
            min={1}
            max={99}
            value={start}
            onChange={(e) => {
              const v = parseInt(e.target.value, 10);
              if (!isNaN(v) && v > 0) setStart(v);
            }}
            className="w-20 rounded-lg border border-border bg-surface-2 px-3 py-1.5 text-sm font-semibold text-foreground focus:border-primary focus:outline-none"
          />
          <Button variant="ghost" size="sm" onClick={reset} className="ml-auto">Reset</Button>
        </div>
      </div>

      {/* Result panel — always visible, updates as you tap */}
      <div className={cn(
        "rounded-xl border px-4 py-3 transition-colors",
        totalUses > 0 ? "border-border bg-surface-2/60" : "border-dashed border-border bg-surface-2/20"
      )}>
        {totalUses > 0 ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">Potential remaining</p>
              <p className="mt-0.5 text-3xl font-bold tabular-nums text-foreground">{remainLabel}</p>
              {remainMin !== remainMax && chaosCount === 0 && (
                <p className="text-[11px] text-muted">Range because each essence has a variable cost.</p>
              )}
              {chaosCount > 0 && (
                <p className="text-[11px] text-muted">Chaos consumed all remaining potential.</p>
              )}
            </div>
            <div className="flex flex-col items-end gap-1">
              <p className={cn("text-xl font-bold", vc.cls)}>{vc.label}</p>
              <div className={cn("h-1.5 w-24 rounded-full opacity-60", vc.barCls)} />
            </div>
          </div>
        ) : (
          <p className="py-1 text-center text-sm text-muted">
            Tap an essence below to see how much potential you need.
          </p>
        )}
      </div>

      {/* Chaos warning */}
      {chaosNote && (
        <p className="rounded-lg bg-bad/10 px-3 py-2 text-xs font-medium text-bad">{chaosNote}</p>
      )}

      {/* Essence tile grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {ESSENCES.map((ess) => {
          // Game rule: any essence is usable while potential > 0.
          // Block only when remainMax hits 0 — true for every tile equally.
          const isBlocked = remainMax === 0;
          return (
            <EssenceTile
              key={ess.key}
              ess={ess}
              count={counts[ess.key] ?? 0}
              onIncrement={() => adjust(ess.key, 1)}
              onDecrement={(e) => { e.stopPropagation(); adjust(ess.key, -1); }}
              blocked={isBlocked}
            />
          );
        })}
      </div>
    </div>
  );
}

// ── Main export ────────────────────────────────────────────────────────────

const ESSENCE_SECTION_KEYS = ["sim", "types", "rules", "pools", "reverse"] as const;
type EssenceSectionKey = typeof ESSENCE_SECTION_KEYS[number];

const ESSENCE_INITIAL_OPEN: Record<EssenceSectionKey, boolean> = {
  sim:     true,
  types:   false,
  rules:   false,
  pools:   false,
  reverse: false,
};

export default function Essence() {
  const reverseCount = useMemo(() => buildReverseIndex().length, []);
  const [openSections, setOpenSections] = useState<Record<EssenceSectionKey, boolean>>(ESSENCE_INITIAL_OPEN);

  const setSection = (key: EssenceSectionKey, value: boolean) =>
    setOpenSections((prev) => ({ ...prev, [key]: value }));

  const allOpen = ESSENCE_SECTION_KEYS.every((k) => openSections[k]);
  const toggleAll = () =>
    setOpenSections(
      Object.fromEntries(ESSENCE_SECTION_KEYS.map((k) => [k, !allOpen])) as Record<EssenceSectionKey, boolean>
    );

  return (
    <div className="space-y-4 py-4">
      {/* Toolbar */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={toggleAll}>
          {allOpen ? "⌃ Collapse all" : "⌄ Expand all"}
        </Button>
      </div>

      {/* 1 — Potential Simulator (open) */}
      <SectionCard
        title="Potential Simulator"
        subtitle="Plan how many essence uses your item's potential can cover."
        open={openSections.sim}
        onOpenChange={(v) => setSection("sim", v)}
        accent="attack"
      >
        <PotentialSimulatorContent />
      </SectionCard>

      {/* 2 — Essence Types */}
      <SectionCard
        title="Essence Types"
        subtitle="What each essence does and how often it drops."
        summary="5 types"
        open={openSections.types}
        onOpenChange={(v) => setSection("types", v)}
        accent="autocast"
      >
        <PotentialSectionBody />
      </SectionCard>

      {/* 3 — Substat roll rules */}
      <SectionCard
        title="How Equipment Substats Roll"
        subtitle="Rules that apply to every item, every slot."
        open={openSections.rules}
        onOpenChange={(v) => setSection("rules", v)}
        accent="utility"
      >
        <RulesContent />
      </SectionCard>

      {/* 4 — Substat pools */}
      <SectionCard
        title="Substat Pools by Slot"
        subtitle="Which modifiers can roll on each equipment slot."
        summary="9 slots"
        open={openSections.pools}
        onOpenChange={(v) => setSection("pools", v)}
        accent="skill"
      >
        <SubstatPoolsContent />
      </SectionCard>

      {/* 5 — Reverse lookup */}
      <SectionCard
        title="Where to Find Each Modifier"
        subtitle="Every modifier across all nine pools with slot and best max."
        summary={`${reverseCount} modifiers`}
        open={openSections.reverse}
        onOpenChange={(v) => setSection("reverse", v)}
        accent="status"
      >
        <ReverseContent />
      </SectionCard>
    </div>
  );
}
