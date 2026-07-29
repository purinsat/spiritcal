"use client";

// Loadout tab — build and compare gear sets by filling in substats per slot.
// No transfer to Calculator; this tab reports gear totals only.

import * as React from "react";
import type { LoadoutSet, LoadoutSlot, LoadoutSubstat } from "@/lib/types";
import {
  GEAR_SLOTS,
  BASE_ATTR_OPTIONS,
  maxSubstatsFor,
  poolRowCount,
  getPoolOptions,
  makeDefaultSlot,
  STAT_GROUPS,
  LOWER_IS_BETTER,
  type GearSlotId,
  type GearSlotDef,
} from "@/data/loadoutData";
import { ESSENCE_ACCENTS } from "@/lib/sectionAccents";
import type { SlotKey } from "@/data/essenceData";
import { cn, Button } from "@/components/ui";
import { SectionCard } from "@/components/SectionCard";
import {
  loadLoadouts,
  saveLoadouts,
  exportLoadoutsToFile,
  parseLoadoutsFile,
} from "@/lib/storage";

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeDefaultSet(name: string): LoadoutSet {
  const slots = {} as Record<GearSlotId, LoadoutSlot>;
  for (const s of GEAR_SLOTS) slots[s.id] = makeDefaultSlot(s);
  return { id: crypto.randomUUID(), name, slots };
}

/** Sum all substats across all slots of a set, keyed by label. */
function sumLoadout(set: LoadoutSet): Map<string, number> {
  const totals = new Map<string, number>();
  for (const slot of Object.values(set.slots) as LoadoutSlot[]) {
    for (const sub of slot.substats) {
      if (!sub.label) continue;
      totals.set(sub.label, (totals.get(sub.label) ?? 0) + sub.value);
    }
  }
  return totals;
}

function fmtVal(v: number): string {
  return v > 0 ? `+${v}` : String(v);
}

// ── SubstatRow ────────────────────────────────────────────────────────────────

function SubstatRow({
  sub,
  isFirst,
  poolOptions,
  onChangeSub,
  onRemove,
}: {
  sub: LoadoutSubstat;
  isFirst: boolean;
  poolOptions: { label: string; max: number }[];
  onChangeSub: (updated: LoadoutSubstat) => void;
  onRemove: () => void;
}) {
  const options = isFirst ? BASE_ATTR_OPTIONS : poolOptions.map((o) => o.label);

  const handleLabelChange = (label: string) => {
    let value = sub.value;
    if (!isFirst) {
      const opt = poolOptions.find((o) => o.label === label);
      if (opt) value = opt.max;
    }
    onChangeSub({ ...sub, label, value });
  };

  return (
    <div className="flex items-center gap-2">
      <select
        value={sub.label}
        onChange={(e) => handleLabelChange(e.target.value)}
        className="min-w-0 flex-1 rounded-lg border border-border bg-surface-2 px-2 py-1.5 text-sm text-foreground focus:border-primary focus:outline-none"
      >
        <option value="">— pick substat —</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
      <input
        type="number"
        value={sub.value}
        onChange={(e) => onChangeSub({ ...sub, value: Number(e.target.value) })}
        className="w-16 shrink-0 rounded-lg border border-border bg-surface-2 px-2 py-1.5 text-right text-sm font-semibold text-foreground focus:border-primary focus:outline-none"
      />
      {!isFirst && (
        <button
          type="button"
          onClick={onRemove}
          className="shrink-0 text-muted hover:text-bad transition-colors text-sm leading-none"
          title="Remove substat"
        >
          ✕
        </button>
      )}
      {isFirst && <span className="w-4 shrink-0" />}
    </div>
  );
}

// ── SlotCard ─────────────────────────────────────────────────────────────────

function SlotCard({
  slotDef,
  slot,
  open,
  onToggle,
  onChange,
}: {
  slotDef: GearSlotDef;
  slot: LoadoutSlot;
  open: boolean;
  onToggle: () => void;
  onChange: (updated: LoadoutSlot) => void;
}) {
  const poolKey = slot.pool;
  const accent = ESSENCE_ACCENTS[poolKey] ?? ESSENCE_ACCENTS["headgear"];
  const poolOpts = getPoolOptions(poolKey);
  const maxSubs = maxSubstatsFor(poolKey);
  const rowCount = poolRowCount(poolKey);
  const canAdd = slot.substats.length < maxSubs;
  const isRepeating = slot.substats.length - 1 > rowCount;

  const updateSub = (index: number, updated: LoadoutSubstat) => {
    const subs = slot.substats.map((s, i) => (i === index ? updated : s));
    onChange({ ...slot, substats: subs });
  };

  const removeSub = (index: number) => {
    onChange({ ...slot, substats: slot.substats.filter((_, i) => i !== index) });
  };

  const addSub = () => {
    if (!canAdd) return;
    onChange({
      ...slot,
      substats: [...slot.substats, { id: crypto.randomUUID(), label: "", value: 0 }],
    });
  };

  const handlePoolChange = (newPool: SlotKey) => {
    const newOpts = new Set(getPoolOptions(newPool).map((o) => o.label));
    const kept = slot.substats.map((s, i) => {
      if (i === 0) return s;
      if (!s.label || newOpts.has(s.label)) return s;
      return { ...s, label: "", value: 0 };
    });
    onChange({ ...slot, pool: newPool, substats: kept });
  };

  // What to show in the collapsed header title.
  const displayTitle = slot.name.trim() || slotDef.label;
  const poolLabel = poolKey.replace(/([A-Z])/g, " $1").trim();

  return (
    <div className={cn("rounded-2xl border bg-surface shadow-sm overflow-hidden", accent.border)}>
      {/* Collapse header button */}
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors",
          accent.headerBg,
        )}
      >
        <span className="text-xl leading-none shrink-0" aria-hidden>{slotDef.icon}</span>
        <div className="min-w-0 flex-1">
          <p className={cn("text-sm font-semibold leading-tight truncate", accent.headerText)}>
            {displayTitle}
          </p>
          <p className="text-[11px] text-muted">
            {slotDef.label !== displayTitle ? `${slotDef.label} · ` : ""}{poolLabel}
          </p>
        </div>
        <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums", accent.valueBg, accent.valueText)}>
          {slot.substats.length} / {maxSubs}
        </span>
        <span className={cn(
          "shrink-0 text-muted transition-transform duration-200",
          open ? "rotate-90" : "rotate-0",
        )}>▸</span>
      </button>

      {/* Expanded body */}
      {open && (
        <div className="border-t border-border flex flex-col gap-2.5 p-3">
          {/* Pool selector — only for Main Hand / Off Hand */}
          {slotDef.pool === null && slotDef.choices && (
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-muted">Weapon type</span>
              <select
                value={poolKey}
                onChange={(e) => handlePoolChange(e.target.value as SlotKey)}
                className="w-full rounded-lg border border-border bg-surface-2 px-2 py-1.5 text-sm text-foreground focus:border-primary focus:outline-none"
              >
                {slotDef.choices.map((c) => (
                  <option key={c} value={c}>{c.replace("Weapon", " Weapon")}</option>
                ))}
              </select>
            </div>
          )}

          {/* Gear name */}
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-muted">Gear name</span>
            <input
              type="text"
              value={slot.name}
              onChange={(e) => onChange({ ...slot, name: e.target.value })}
              placeholder={`e.g. Dragon ${slotDef.label} +7`}
              className="w-full rounded-lg border border-border bg-surface-2 px-2 py-1.5 text-sm text-foreground placeholder:text-muted/60 focus:border-primary focus:outline-none"
            />
          </div>

          {/* Substats */}
          <div className="flex flex-col gap-2">
            {isRepeating && (
              <p className="text-[10px] text-muted italic">
                Last substat repeats a pool row — correct for fully upgraded gear.
              </p>
            )}
            {slot.substats.map((sub, i) => (
              <SubstatRow
                key={sub.id}
                sub={sub}
                isFirst={i === 0}
                poolOptions={poolOpts}
                onChangeSub={(updated) => updateSub(i, updated)}
                onRemove={() => removeSub(i)}
              />
            ))}
            <button
              type="button"
              onClick={addSub}
              disabled={!canAdd}
              className={cn(
                "mt-1 w-full rounded-lg border border-dashed py-1.5 text-xs font-semibold transition-colors",
                canAdd
                  ? "border-border text-muted hover:text-foreground hover:border-foreground/40"
                  : "border-border/40 text-border cursor-not-allowed",
              )}
            >
              {canAdd ? "+ Add substat" : `Max ${maxSubs} reached`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── TotalsPanel ───────────────────────────────────────────────────────────────

function TotalsPanel({ set }: { set: LoadoutSet }) {
  const totals = sumLoadout(set);

  const claimedLabels = new Set(STAT_GROUPS.flatMap((g) => g.statLabels));
  const otherLabels = [...totals.keys()].filter((l) => !claimedLabels.has(l) && l !== "");

  const groups = [
    ...STAT_GROUPS.map((g) => ({
      label: g.label,
      entries: g.statLabels.filter((l) => totals.has(l)).map((l) => ({ label: l, value: totals.get(l)! })),
    })),
    ...(otherLabels.length > 0
      ? [{ label: "Other", entries: otherLabels.map((l) => ({ label: l, value: totals.get(l)! })) }]
      : []),
  ].filter((g) => g.entries.length > 0);

  if (totals.size === 0) {
    return (
      <div className="rounded-xl border border-border bg-surface-2/40 p-5 text-center text-sm text-muted">
        Fill in substats above to see totals here.
      </div>
    );
  }

  return (
    <div className="divide-y divide-border/50">
      {groups.map((group) => (
        <div key={group.label} className="px-5 py-3 first:pt-4 last:pb-4">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted">{group.label}</p>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 sm:grid-cols-3">
            {group.entries.map(({ label, value }) => {
              const isLow = LOWER_IS_BETTER.has(label);
              return (
                <div key={label} className="flex items-baseline justify-between gap-2 text-sm">
                  <span className="text-muted truncate">{label}</span>
                  <span className={cn("font-semibold tabular-nums shrink-0", isLow ? "text-good" : "text-foreground")}>
                    {fmtVal(value)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── ComparePanel ──────────────────────────────────────────────────────────────

function ComparePanel({ sets }: { sets: LoadoutSet[] }) {
  const [aId, setAId] = React.useState<string>(sets[0]?.id ?? "");
  const [bId, setBId] = React.useState<string>(sets[1]?.id ?? sets[0]?.id ?? "");
  const [hideUnchanged, setHideUnchanged] = React.useState(false);

  const setA = sets.find((s) => s.id === aId);
  const setB = sets.find((s) => s.id === bId);

  if (sets.length < 2) {
    return (
      <div className="rounded-xl border border-border bg-surface-2/40 p-5 text-center text-sm text-muted">
        Create at least two sets to compare them.
      </div>
    );
  }

  const totalsA = setA ? sumLoadout(setA) : new Map<string, number>();
  const totalsB = setB ? sumLoadout(setB) : new Map<string, number>();

  const allLabels = new Set([...totalsA.keys(), ...totalsB.keys()]);
  const rows: { label: string; a: number; b: number; delta: number }[] = [];
  allLabels.forEach((label) => {
    if (!label) return;
    const a = totalsA.get(label) ?? 0;
    const b = totalsB.get(label) ?? 0;
    rows.push({ label, a, b, delta: b - a });
  });

  const claimedLabels = STAT_GROUPS.flatMap((g) => g.statLabels);
  rows.sort((x, y) => {
    const ix = claimedLabels.indexOf(x.label);
    const iy = claimedLabels.indexOf(y.label);
    if (ix === -1 && iy === -1) return x.label.localeCompare(y.label);
    if (ix === -1) return 1;
    if (iy === -1) return -1;
    return ix - iy;
  });

  const visible = hideUnchanged ? rows.filter((r) => r.delta !== 0) : rows;

  return (
    <div className="rounded-2xl border border-border bg-surface shadow-sm overflow-hidden">
      <div className="border-b border-border bg-primary/5 px-5 py-3">
        <h2 className="font-display text-base font-bold text-primary">Set Comparison</h2>
      </div>

      <div className="flex flex-wrap items-end gap-4 p-4 border-b border-border/50">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-semibold uppercase tracking-wide text-muted">Set A</label>
          <select value={aId} onChange={(e) => setAId(e.target.value)}
            className="rounded-lg border border-border bg-surface-2 px-3 py-1.5 text-sm text-foreground focus:outline-none">
            {sets.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-semibold uppercase tracking-wide text-muted">Set B</label>
          <select value={bId} onChange={(e) => setBId(e.target.value)}
            className="rounded-lg border border-border bg-surface-2 px-3 py-1.5 text-sm text-foreground focus:outline-none">
            {sets.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <label className="flex items-center gap-2 text-sm text-muted cursor-pointer">
          <input type="checkbox" checked={hideUnchanged} onChange={(e) => setHideUnchanged(e.target.checked)}
            className="rounded" />
          Hide unchanged
        </label>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-separate border-spacing-0 text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="px-5 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-muted">Stat</th>
              <th className="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-wide text-muted">{setA?.name ?? "A"}</th>
              <th className="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-wide text-muted">{setB?.name ?? "B"}</th>
              <th className="px-5 py-2 text-right text-[10px] font-semibold uppercase tracking-wide text-muted">Δ (B − A)</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((row, i) => {
              const isLow = LOWER_IS_BETTER.has(row.label);
              const better = isLow ? row.delta < 0 : row.delta > 0;
              const worse = isLow ? row.delta > 0 : row.delta < 0;
              return (
                <tr key={row.label} className={cn("border-t border-border/50", i % 2 === 0 ? "bg-surface" : "bg-surface-2/30")}>
                  <td className="px-5 py-2 font-medium text-foreground">{row.label}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-muted">{fmtVal(row.a)}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-muted">{fmtVal(row.b)}</td>
                  <td className={cn("px-5 py-2 text-right font-semibold tabular-nums",
                    row.delta === 0 ? "text-muted" : better ? "text-good" : worse ? "text-bad" : "text-foreground"
                  )}>
                    {row.delta === 0 ? "—" : `${row.delta > 0 ? "+" : ""}${row.delta}`}
                    {row.delta !== 0 && (
                      <span className="ml-1 text-xs">{better ? "▲" : "▼"}</span>
                    )}
                  </td>
                </tr>
              );
            })}
            {visible.length === 0 && (
              <tr>
                <td colSpan={4} className="px-5 py-4 text-center text-sm text-muted">
                  No differences between these two sets.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── SetBar ────────────────────────────────────────────────────────────────────

function SetBar({
  sets,
  activeId,
  onSelect,
  onCreate,
  onDuplicate,
  onRename,
  onDelete,
}: {
  sets: LoadoutSet[];
  activeId: string;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onDuplicate: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
}) {
  const [editing, setEditing] = React.useState<string | null>(null);
  const [editValue, setEditValue] = React.useState("");

  const startEdit = (set: LoadoutSet) => {
    setEditing(set.id);
    setEditValue(set.name);
  };

  const commitEdit = () => {
    if (editing && editValue.trim()) onRename(editing, editValue.trim());
    setEditing(null);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {sets.map((s) => (
        <div key={s.id} className="flex items-center">
          {editing === s.id ? (
            <input
              autoFocus
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={commitEdit}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitEdit();
                if (e.key === "Escape") setEditing(null);
              }}
              className="rounded-lg border border-primary bg-surface px-3 py-1 text-sm font-semibold focus:outline-none"
            />
          ) : (
            <button
              type="button"
              onClick={() => onSelect(s.id)}
              onDoubleClick={() => startEdit(s)}
              title="Double-click to rename"
              className={cn(
                "rounded-lg border px-3 py-1 text-sm font-semibold transition-colors",
                s.id === activeId
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-surface text-muted hover:text-foreground",
              )}
            >
              {s.name}
            </button>
          )}
        </div>
      ))}

      <div className="flex items-center gap-1 ml-1">
        <Button variant="secondary" size="sm" onClick={onCreate}>+ New</Button>
        <Button variant="outline" size="sm" onClick={() => onDuplicate(activeId)} title="Copy active set">⧉ Dup</Button>
        {sets.length > 1 && (
          <Button variant="ghost" size="sm" onClick={() => onDelete(activeId)} className="text-bad hover:text-bad">✕ Del</Button>
        )}
      </div>
    </div>
  );
}

// ── Main Loadout tab ──────────────────────────────────────────────────────────

export function Loadout() {
  const [sets, setSets] = React.useState<LoadoutSet[]>(() => {
    if (typeof window === "undefined") return [makeDefaultSet("Set 1")];
    const loaded = loadLoadouts();
    return loaded.length > 0 ? loaded : [makeDefaultSet("Set 1")];
  });
  const [activeId, setActiveId] = React.useState<string>(() => sets[0]?.id ?? "");
  const [openSlots, setOpenSlots] = React.useState<Set<GearSlotId>>(new Set());
  const [totalsOpen, setTotalsOpen] = React.useState(true);
  const [showCompare, setShowCompare] = React.useState(false);
  const [ioMsg, setIoMsg] = React.useState<string | null>(null);

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Persist sets on every change.
  React.useEffect(() => {
    saveLoadouts(sets);
  }, [sets]);

  const activeSet = sets.find((s) => s.id === activeId) ?? sets[0];

  const updateActiveSlot = (slotId: GearSlotId, slot: LoadoutSlot) => {
    setSets((prev) =>
      prev.map((s) =>
        s.id === activeId
          ? { ...s, slots: { ...s.slots, [slotId]: slot } }
          : s,
      ),
    );
  };

  const createSet = () => {
    const next = makeDefaultSet(`Set ${sets.length + 1}`);
    setSets((prev) => [...prev, next]);
    setActiveId(next.id);
    setOpenSlots(new Set());
  };

  const duplicateSet = (id: string) => {
    const src = sets.find((s) => s.id === id);
    if (!src) return;
    const next: LoadoutSet = { ...structuredClone(src), id: crypto.randomUUID(), name: `${src.name} (copy)` };
    setSets((prev) => [...prev, next]);
    setActiveId(next.id);
    setOpenSlots(new Set());
  };

  const renameSet = (id: string, name: string) => {
    setSets((prev) => prev.map((s) => (s.id === id ? { ...s, name } : s)));
  };

  const deleteSet = (id: string) => {
    const remaining = sets.filter((s) => s.id !== id);
    setSets(remaining);
    setActiveId(remaining[0]?.id ?? "");
    setOpenSlots(new Set());
  };

  const toggleSlot = (id: GearSlotId) => {
    setOpenSlots((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allIds = GEAR_SLOTS.map((s) => s.id);
  const allOpen = allIds.every((id) => openSlots.has(id));
  const toggleAll = () => {
    setOpenSlots(allOpen ? new Set() : new Set(allIds));
  };

  // JSON export
  const handleExport = () => {
    exportLoadoutsToFile(sets);
  };

  // JSON import
  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Reset the input so the same file can be imported again if needed.
    e.target.value = "";
    try {
      const text = await file.text();
      const imported = parseLoadoutsFile(text);
      // Add with fresh ids to never overwrite existing sets.
      const withNewIds = imported.map((s) => ({ ...structuredClone(s), id: crypto.randomUUID() }));
      setSets((prev) => [...prev, ...withNewIds]);
      if (withNewIds[0]) setActiveId(withNewIds[0].id);
      flashMsg(`Imported ${withNewIds.length} set${withNewIds.length === 1 ? "" : "s"}`);
    } catch {
      flashMsg("Not a valid SpiritCal loadout file");
    }
  };

  const flashMsg = (msg: string) => {
    setIoMsg(msg);
    window.setTimeout(() => setIoMsg(null), 2500);
  };

  if (!activeSet) return null;

  const leftSlots = GEAR_SLOTS.filter((s) => s.side === "left");
  const rightSlots = GEAR_SLOTS.filter((s) => s.side === "right");
  const artifactSlots = GEAR_SLOTS.filter((s) => s.side === "artifact");

  const totalStatCount = sumLoadout(activeSet).size;

  return (
    <div className="space-y-5 py-2">
      {/* ── Set bar + IO controls ───────────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-surface p-4 space-y-3">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">
          Gear sets — double-click a set name to rename
        </p>
        <SetBar
          sets={sets}
          activeId={activeId}
          onSelect={(id) => { setActiveId(id); setOpenSlots(new Set()); }}
          onCreate={createSet}
          onDuplicate={duplicateSet}
          onRename={renameSet}
          onDelete={deleteSet}
        />
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-border/50">
          <Button variant="outline" size="sm" onClick={handleExport}>↓ Export JSON</Button>
          <Button variant="outline" size="sm" onClick={handleImportClick}>↑ Import JSON</Button>
          {ioMsg && (
            <span className="text-xs font-semibold text-secondary">{ioMsg}</span>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
      </div>

      {/* ── Expand / Collapse all toolbar ───────────────────────────────── */}
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">Equipment slots</p>
        <Button variant="ghost" size="sm" onClick={toggleAll}>
          {allOpen ? "Collapse all" : "Expand all"}
        </Button>
      </div>

      {/* ── Slot grid ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-3">
          {leftSlots.map((slotDef) => (
            <SlotCard
              key={slotDef.id}
              slotDef={slotDef}
              slot={activeSet.slots[slotDef.id]}
              open={openSlots.has(slotDef.id)}
              onToggle={() => toggleSlot(slotDef.id)}
              onChange={(updated) => updateActiveSlot(slotDef.id, updated)}
            />
          ))}
        </div>
        <div className="space-y-3">
          {rightSlots.map((slotDef) => (
            <SlotCard
              key={slotDef.id}
              slotDef={slotDef}
              slot={activeSet.slots[slotDef.id]}
              open={openSlots.has(slotDef.id)}
              onToggle={() => toggleSlot(slotDef.id)}
              onChange={(updated) => updateActiveSlot(slotDef.id, updated)}
            />
          ))}
        </div>
      </div>

      {/* ── Artifacts ───────────────────────────────────────────────────── */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Artifacts</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {artifactSlots.map((slotDef) => (
            <SlotCard
              key={slotDef.id}
              slotDef={slotDef}
              slot={activeSet.slots[slotDef.id]}
              open={openSlots.has(slotDef.id)}
              onToggle={() => toggleSlot(slotDef.id)}
              onChange={(updated) => updateActiveSlot(slotDef.id, updated)}
            />
          ))}
        </div>
      </div>

      {/* ── Gear totals (collapsible, open by default) ───────────────────── */}
      <SectionCard
        title="Gear Totals"
        subtitle="Sum of all substats across every equipped slot."
        summary={totalStatCount > 0 ? `${totalStatCount} stat${totalStatCount === 1 ? "" : "s"}` : undefined}
        open={totalsOpen}
        onOpenChange={setTotalsOpen}
      >
        <TotalsPanel set={activeSet} />
      </SectionCard>

      {/* ── Compare ─────────────────────────────────────────────────────── */}
      <div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowCompare((v) => !v)}
        >
          {showCompare ? "▲ Hide comparison" : "⇔ Compare sets"}
        </Button>
      </div>
      {showCompare && <ComparePanel sets={sets} />}
    </div>
  );
}
