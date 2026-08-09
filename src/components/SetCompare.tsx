"use client";

// Gear Compare tab — per-gear swap cards.
// The internal id is still "setcompare"; only the nav label changed to "Gear Compare".
// Each card owns a Removing and an Adding section for one piece of gear.
// Cards can be toggled on/off; only active cards count toward the combined result.
// Each card shows an isolated DPS chip (that card alone vs. baseline), always visible.

import * as React from "react";
import type { Build, GearSwapCard, SetCompareState, StatDelta } from "@/lib/types";
import {
  computeStats,
  computeDamageBreakdown,
  STAT_GROUP_ORDER,
  STAT_GROUP_LABEL,
  LOWER_IS_BETTER_STATS,
} from "@/lib/formulas";
import { cardNetDelta, aggregateNetDelta, applyDeltas } from "@/lib/setCompare";
import { STAT_FIELDS, STAT_FIELD_MAP } from "@/data/statFields";
import { WEAPONS } from "@/data/gameData";
import { cn, Button, Toggle } from "@/components/ui";
import { SectionCard } from "@/components/SectionCard";

// ── Default state ─────────────────────────────────────────────────────────────

export function makeDefaultSetCompareState(): SetCompareState {
  return { cards: [] };
}

function makeDefaultCard(n: number): GearSwapCard {
  return {
    id: crypto.randomUUID(),
    name: `Gear Swap ${n}`,
    enabled: true,
    removing: [],
    adding: [],
  };
}

// ── Math helpers ──────────────────────────────────────────────────────────────

/** Target-aware DPS from a build: vs-target if target enabled, else rotation DPS. */
function dpsOf(build: Build): number {
  const dm = computeDamageBreakdown(build);
  return build.target.enabled ? dm.totalRotationDpsVsTarget : dm.totalRotationDps;
}

function fmt(v: number, decimals = 1): string {
  return v.toLocaleString(undefined, { maximumFractionDigits: decimals });
}
function fmtDelta(d: number): string {
  return (d > 0 ? "+" : "") + fmt(d);
}

// ── DeltaRow (one editable stat line) ────────────────────────────────────────

function DeltaRow({
  delta,
  usedKeys,
  onUpdate,
  onRemove,
}: {
  delta: StatDelta;
  usedKeys: Set<string>;
  onUpdate: (d: StatDelta) => void;
  onRemove: () => void;
}) {
  const field = STAT_FIELD_MAP.get(delta.key);
  return (
    <div className="flex items-center gap-2">
      <select
        value={delta.key}
        onChange={(e) => {
          const newField = STAT_FIELD_MAP.get(e.target.value);
          onUpdate({ ...delta, key: e.target.value, value: newField?.pct ? 1 : 0 });
        }}
        className="min-w-0 flex-1 rounded-lg border border-border bg-surface-2 px-2 py-1.5 text-sm text-foreground focus:border-primary focus:outline-none"
      >
        {(["Attributes", "Flat", "Percent"] as const).map((group) => {
          const opts = STAT_FIELDS.filter(
            (f) => f.group === group && (f.key === delta.key || !usedKeys.has(f.key as string)),
          );
          if (opts.length === 0) return null;
          return (
            <optgroup key={group} label={group}>
              {opts.map((f) => (
                <option key={f.key as string} value={f.key as string}>{f.label}</option>
              ))}
            </optgroup>
          );
        })}
      </select>
      <input
        type="number"
        value={delta.value}
        onChange={(e) => onUpdate({ ...delta, value: Number(e.target.value) })}
        className="w-20 shrink-0 rounded-lg border border-border bg-surface-2 px-2 py-1.5 text-right text-sm font-semibold text-foreground focus:border-primary focus:outline-none"
      />
      {field?.pct && <span className="shrink-0 text-xs text-muted">%</span>}
      <button
        type="button"
        onClick={onRemove}
        className="shrink-0 text-muted hover:text-bad transition-colors text-sm"
        title="Remove"
      >✕</button>
    </div>
  );
}

// ── DeltaSection (Removing or Adding inside a card) ───────────────────────────

function DeltaSection({
  label,
  colorClass,
  deltas,
  onDeltas,
  siblingKeys,
}: {
  label: string;
  colorClass: string;
  deltas: StatDelta[];
  onDeltas: (d: StatDelta[]) => void;
  /** Keys already used on the OTHER side, to allow the same key on both sides. */
  siblingKeys: Set<string>;
}) {
  const usedKeys = new Set(deltas.map((d) => d.key));
  const canAdd = deltas.length < STAT_FIELDS.length;

  const addRow = () => {
    const first = STAT_FIELDS.find((f) => !usedKeys.has(f.key as string));
    if (!first) return;
    onDeltas([...deltas, { id: crypto.randomUUID(), key: first.key as string, value: 0 }]);
  };

  return (
    <div className="flex flex-col gap-2">
      <p className={cn("text-[10px] font-semibold uppercase tracking-wide", colorClass)}>{label}</p>
      {deltas.length === 0 && (
        <p className="text-xs text-muted italic">None — click below to add a stat.</p>
      )}
      {deltas.map((d) => (
        <DeltaRow
          key={d.id}
          delta={d}
          usedKeys={usedKeys}
          onUpdate={(u) => onDeltas(deltas.map((x) => (x.id === d.id ? u : x)))}
          onRemove={() => onDeltas(deltas.filter((x) => x.id !== d.id))}
        />
      ))}
      <button
        type="button"
        onClick={addRow}
        disabled={!canAdd}
        className={cn(
          "w-full rounded-lg border border-dashed py-1.5 text-xs font-semibold transition-colors",
          canAdd
            ? "border-border text-muted hover:text-foreground hover:border-foreground/40"
            : "border-border/40 text-border cursor-not-allowed",
        )}
      >
        {canAdd ? `+ Add ${label.toLowerCase()} stat` : "All stats used"}
      </button>
    </div>
  );
}

// ── DpsChip ──────────────────────────────────────────────────────────────────

function DpsChip({ base, after, label }: { base: number; after: number; label: string }) {
  const delta = after - base;
  const changed = Math.abs(delta) >= 0.05;
  const better = delta > 0;
  return (
    <div className="flex flex-col items-end text-right min-w-0" title={label}>
      <p className="text-[10px] uppercase tracking-wide text-muted font-semibold">{label}</p>
      <p className="font-display text-sm font-bold tabular-nums text-foreground">
        {Math.round(after).toLocaleString()}
      </p>
      {changed ? (
        <p className={cn("text-[11px] font-semibold tabular-nums", better ? "text-good" : "text-bad")}>
          {fmtDelta(delta)}
        </p>
      ) : (
        <p className="text-[11px] text-muted">no change</p>
      )}
    </div>
  );
}

// ── GearSwapCardView ──────────────────────────────────────────────────────────

function GearSwapCardView({
  card,
  baseBuild,
  open,
  onToggle,
  onChange,
  onDelete,
}: {
  card: GearSwapCard;
  baseBuild: Build;
  open: boolean;
  onToggle: () => void;
  onChange: (c: GearSwapCard) => void;
  onDelete: () => void;
}) {
  // DPS chip: isolated (this card only, regardless of enabled state)
  const modBuild = React.useMemo(
    () => applyDeltas(baseBuild, cardNetDelta(card)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [baseBuild, card.removing, card.adding],
  );
  const baseDps = React.useMemo(() => dpsOf(baseBuild), [baseBuild]);
  const cardDps = React.useMemo(() => dpsOf(modBuild), [modBuild]);
  const dpsLabel = baseBuild.target.enabled ? "DPS vs Target" : "Rotation DPS";

  const removingCount = card.removing.length;
  const addingCount = card.adding.length;
  const subtitle =
    removingCount + addingCount === 0
      ? "No stats yet"
      : `${removingCount} removing, ${addingCount} adding`;

  return (
    <SectionCard
      title={card.name || "Unnamed swap"}
      subtitle={subtitle}
      open={open}
      onOpenChange={onToggle}
      dimmed={!card.enabled}
      headerRight={
        <div className="flex items-center gap-2 shrink-0">
          <DpsChip base={baseDps} after={cardDps} label={dpsLabel} />
          <div className="w-px self-stretch bg-border/50" />
          <Toggle
            checked={card.enabled}
            onChange={(v) => onChange({ ...card, enabled: v })}
            title={card.enabled ? "Exclude from result" : "Include in result"}
          />
          <button
            type="button"
            onClick={onDelete}
            className="text-muted hover:text-bad transition-colors text-sm ml-1"
            title="Delete this swap"
          >✕</button>
        </div>
      }
    >
      {/* Card name input */}
      <div className="mb-4">
        <label className="flex flex-col gap-1">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-muted">Swap name</span>
          <input
            type="text"
            value={card.name}
            onChange={(e) => onChange({ ...card, name: e.target.value })}
            placeholder="e.g. Helmet: Iron +3 → Dragon +7"
            className="w-full rounded-lg border border-border bg-surface-2 px-2 py-1.5 text-sm text-foreground placeholder:text-muted/60 focus:border-primary focus:outline-none"
          />
        </label>
      </div>

      {/* Removing + Adding stacked */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-bad/25 bg-bad/5 p-3 flex flex-col gap-2">
          <DeltaSection
            label="Removing"
            colorClass="text-bad"
            deltas={card.removing}
            onDeltas={(d) => onChange({ ...card, removing: d })}
            siblingKeys={new Set(card.adding.map((x) => x.key))}
          />
        </div>
        <div className="rounded-xl border border-good/25 bg-good/5 p-3 flex flex-col gap-2">
          <DeltaSection
            label="Adding"
            colorClass="text-good"
            deltas={card.adding}
            onDeltas={(d) => onChange({ ...card, adding: d })}
            siblingKeys={new Set(card.removing.map((x) => x.key))}
          />
        </div>
      </div>
    </SectionCard>
  );
}

// ── HeadlineTile ─────────────────────────────────────────────────────────────

function HeadlineTile({
  label,
  before,
  after,
  statKey,
  display,
}: {
  label: string;
  before: number;
  after: number;
  statKey: string;
  display: (v: number) => string;
}) {
  const delta = after - before;
  const pct = before !== 0 ? (delta / Math.abs(before)) * 100 : 0;
  const better = LOWER_IS_BETTER_STATS.has(statKey) ? delta < 0 : delta > 0;
  const changed = Math.abs(delta) >= 1e-4;
  return (
    <div className="rounded-xl border border-border bg-surface p-4 text-center">
      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted">{label}</p>
      <p className="font-display text-xl font-bold text-foreground tabular-nums">{display(after)}</p>
      <p className="text-xs text-muted tabular-nums">from {display(before)}</p>
      {changed ? (
        <p className={cn("mt-1 text-sm font-semibold tabular-nums", better ? "text-good" : "text-bad")}>
          {fmtDelta(delta)}
          {Math.abs(pct) >= 0.05 && (
            <span className="ml-1 text-xs opacity-70">({pct > 0 ? "+" : ""}{pct.toFixed(1)}%)</span>
          )}
        </p>
      ) : (
        <p className="mt-1 text-xs text-muted">no change</p>
      )}
    </div>
  );
}

// ── Result table ──────────────────────────────────────────────────────────────

function ResultTable({
  statsBase,
  statsMod,
  removingLabel,
  addingLabel,
}: {
  statsBase: ReturnType<typeof computeStats>;
  statsMod: ReturnType<typeof computeStats>;
  removingLabel: string;
  addingLabel: string;
}) {
  const modMap = new Map(statsMod.map((s) => [s.key, s]));

  const groups = new Map<string, { label: string; key: string; before: number; after: number; displayBefore: string; displayAfter: string }[]>();
  for (const base of statsBase) {
    const mod = modMap.get(base.key);
    const before = base.value;
    const after = mod?.value ?? before;
    if (Math.abs(after - before) < 1e-6) continue;
    const rows = groups.get(base.group) ?? [];
    rows.push({ label: base.label, key: base.key, before, after, displayBefore: base.display, displayAfter: mod?.display ?? base.display });
    groups.set(base.group, rows);
  }

  if (groups.size === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted">
        No computed stats changed. Try adding or adjusting stats in the gear swap cards.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <div className="mb-3 flex items-center gap-3 text-xs text-muted font-semibold">
        <span>{removingLabel}</span>
        <span className="text-foreground/40">→</span>
        <span>{addingLabel}</span>
      </div>
      <table className="w-full border-separate border-spacing-0 text-sm">
        <thead>
          <tr>
            <th className="px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-muted">Stat</th>
            <th className="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-wide text-muted">Before</th>
            <th className="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-wide text-muted">After</th>
            <th className="px-4 py-2 text-right text-[10px] font-semibold uppercase tracking-wide text-muted">Change</th>
          </tr>
        </thead>
        <tbody>
          {STAT_GROUP_ORDER.map((group) => {
            const rows = groups.get(group);
            if (!rows || rows.length === 0) return null;
            return (
              <React.Fragment key={group}>
                <tr>
                  <td colSpan={4} className="px-4 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-wide text-accent">
                    {STAT_GROUP_LABEL[group]}
                  </td>
                </tr>
                {rows.map((row, i) => {
                  const delta = row.after - row.before;
                  const better = LOWER_IS_BETTER_STATS.has(row.key) ? delta < 0 : delta > 0;
                  return (
                    <tr key={row.key} className={cn("border-t border-border/50", i % 2 === 0 ? "bg-surface" : "bg-surface-2/30")}>
                      <td className="px-4 py-2 font-medium text-foreground">{row.label}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-muted">{row.displayBefore}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-muted">{row.displayAfter}</td>
                      <td className={cn("px-4 py-2 text-right font-semibold tabular-nums", better ? "text-good" : "text-bad")}>
                        {fmtDelta(delta)}
                        <span className="ml-1 text-xs">{better ? "▲" : "▼"}</span>
                      </td>
                    </tr>
                  );
                })}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Main SetCompare component ─────────────────────────────────────────────────

export function SetCompare({
  build,
  state,
  onChange,
}: {
  build: Build;
  state: SetCompareState;
  onChange: (s: SetCompareState) => void;
}) {
  const [openCards, setOpenCards] = React.useState<Set<string>>(new Set());
  const [resultOpen, setResultOpen] = React.useState(true);

  const { cards } = state;
  const activeCards = cards.filter((c) => c.enabled);
  const allCardsOpen = cards.length > 0 && cards.every((c) => openCards.has(c.id));

  // Aggregate net delta from all ACTIVE cards
  const netDelta = React.useMemo(() => aggregateNetDelta(activeCards), [activeCards]);

  // Modified build (active cards only)
  const modBuild = React.useMemo(() => applyDeltas(build, netDelta), [build, netDelta]);

  // Full stat diff for result table
  const statsBase = React.useMemo(() => computeStats(build), [build]);
  const statsMod = React.useMemo(() => computeStats(modBuild), [modBuild]);

  // Headline stats
  const weaponType = WEAPONS[build.weapon]?.type ?? "melee";
  const atkKey = weaponType === "magic" ? "matk" : weaponType === "ranged" ? "rangedAtk" : "meleeAtk";
  const dpsKey = build.target.enabled ? "rotationVsTarget" : "totalRotationDps";
  const statModMap = React.useMemo(() => new Map(statsMod.map((s) => [s.key, s])), [statsMod]);

  const addCard = () => {
    const card = makeDefaultCard(cards.length + 1);
    onChange({ cards: [...cards, card] });
    setOpenCards((prev) => new Set([...prev, card.id]));
  };

  const updateCard = (id: string, updated: GearSwapCard) => {
    onChange({ cards: cards.map((c) => (c.id === id ? updated : c)) });
  };

  const deleteCard = (id: string) => {
    onChange({ cards: cards.filter((c) => c.id !== id) });
    setOpenCards((prev) => { const next = new Set(prev); next.delete(id); return next; });
  };

  const toggleCard = (id: string) => {
    setOpenCards((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    setOpenCards(allCardsOpen ? new Set() : new Set(cards.map((c) => c.id)));
  };

  // Shared labels for "removing → adding" direction across all active cards
  const removingLabel = activeCards.length === 0 ? "Baseline" : activeCards.map((c) => c.name || "swap").join(", ") + " (removing)";
  const addingLabel = activeCards.length === 0 ? "No active swaps" : "after all active swaps";

  return (
    <div className="space-y-4 py-2">
      {/* Baseline banner + toolbar */}
      <div className="rounded-xl border border-border bg-surface px-5 py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">Baseline (Calculator build)</p>
            <p className="font-display text-base font-bold text-foreground truncate">{build.name}</p>
            <p className="text-xs text-muted mt-0.5">
              Changes to the Calculator update this tab live. Toggle cards on/off to include or exclude them from the combined result.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {cards.length > 0 && (
              <Button variant="ghost" size="sm" onClick={toggleAll}>
                {allCardsOpen ? "Collapse all" : "Expand all"}
              </Button>
            )}
            <Button variant="secondary" size="sm" onClick={addCard}>+ Add gear swap</Button>
          </div>
        </div>
      </div>

      {/* Empty state */}
      {cards.length === 0 && (
        <div className="rounded-xl border border-border bg-surface-2/40 py-12 text-center">
          <p className="font-display text-base font-semibold text-foreground">No gear swaps yet</p>
          <p className="mt-1 text-sm text-muted max-w-sm mx-auto">
            Click <strong>+ Add gear swap</strong> to compare what happens when you change a piece of gear.
            Each card holds the stats you are removing and the ones you are gaining.
          </p>
        </div>
      )}

      {/* Gear swap cards */}
      {cards.map((card) => (
        <GearSwapCardView
          key={card.id}
          card={card}
          baseBuild={build}
          open={openCards.has(card.id)}
          onToggle={() => toggleCard(card.id)}
          onChange={(updated) => updateCard(card.id, updated)}
          onDelete={() => deleteCard(card.id)}
        />
      ))}

      {/* Headline tiles — only when there are active cards with content */}
      {activeCards.length > 0 && (
        <>
          <div className="flex items-center gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">
              Combined result — {activeCards.length} of {cards.length} swap{cards.length === 1 ? "" : "s"} active
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {(() => {
              const atkBase = statsBase.find((s) => s.key === atkKey);
              const atkMod = statModMap.get(atkKey);
              const dpsBase = statsBase.find((s) => s.key === dpsKey);
              const dpsMod = statModMap.get(dpsKey);
              const hpBase = statsBase.find((s) => s.key === "maxHp");
              const hpMod = statModMap.get("maxHp");
              return (
                <>
                  {atkBase && atkMod && (
                    <HeadlineTile
                      label={weaponType === "magic" ? "Magic ATK" : weaponType === "ranged" ? "Ranged ATK" : "Melee ATK"}
                      before={atkBase.value} after={atkMod.value} statKey={atkKey}
                      display={(v) => Math.round(v).toLocaleString()}
                    />
                  )}
                  {dpsBase && dpsMod && (
                    <HeadlineTile
                      label={build.target.enabled ? "DPS vs Target" : "Rotation DPS"}
                      before={dpsBase.value} after={dpsMod.value} statKey={dpsKey}
                      display={(v) => Math.round(v).toLocaleString()}
                    />
                  )}
                  {hpBase && hpMod && (
                    <HeadlineTile
                      label="Max HP"
                      before={hpBase.value} after={hpMod.value} statKey="maxHp"
                      display={(v) => Math.round(v).toLocaleString()}
                    />
                  )}
                </>
              );
            })()}
          </div>

          {/* Combined result table — collapsible */}
          <SectionCard
            title="Result"
            subtitle="Only stats affected by active swaps are shown."
            summary={(() => {
              let changed = 0;
              const modMap = new Map(statsMod.map((s) => [s.key, s]));
              for (const b of statsBase) {
                const m = modMap.get(b.key);
                if (m && Math.abs(m.value - b.value) >= 1e-6) changed++;
              }
              return changed > 0 ? `${changed} stat${changed === 1 ? "" : "s"} changed` : undefined;
            })()}
            open={resultOpen}
            onOpenChange={setResultOpen}
          >
            <ResultTable
              statsBase={statsBase}
              statsMod={statsMod}
              removingLabel={removingLabel}
              addingLabel={addingLabel}
            />
          </SectionCard>
        </>
      )}
    </div>
  );
}
