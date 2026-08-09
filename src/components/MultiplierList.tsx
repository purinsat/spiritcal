"use client";

import * as React from "react";
import type { DamageMultiplier } from "@/lib/types";
import { Button, NumberInput, TextInput, Toggle, cn } from "@/components/ui";

/** Per-entry multiplier factor, floored at 0 so values below -100% cannot
 *  produce negative damage. */
function entryFactor(pct: number): number {
  return Math.max(0, 1 + pct / 100);
}

/** Computes the combined multiplicative product of all enabled multipliers.
 *  Each entry's factor is floored at zero. */
export function multiplierProduct(multipliers: DamageMultiplier[]): number {
  return multipliers.filter((m) => m.enabled).reduce((acc, m) => acc * entryFactor(m.pct), 1);
}

function MultiplierRow({
  m,
  onChange,
  onRemove,
}: {
  m: DamageMultiplier;
  onChange: (updated: DamageMultiplier) => void;
  onRemove: () => void;
}) {
  const factor = entryFactor(m.pct);
  const isZero = factor === 0;
  const isPenalty = m.pct < 0;

  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-surface-2/60 px-3 py-2">
      <Toggle
        checked={m.enabled}
        onChange={(checked) => onChange({ ...m, enabled: checked })}
      />
      <div className="min-w-0 flex-1">
        <TextInput
          value={m.name}
          onChange={(name) => onChange({ ...m, name })}
          placeholder="Multiplier name"
          compact
        />
      </div>
      <div className="w-24 shrink-0">
        <NumberInput
          label=""
          value={m.pct}
          onChange={(pct) => onChange({ ...m, pct })}
          suffix="%"
          step={1}
          compact
        />
      </div>
      {/* Per-entry factor readout */}
      <div className="w-14 shrink-0 text-right">
        {isZero ? (
          <span className="text-xs font-semibold text-bad" title="Damage from this source is reduced to zero">
            ×0
          </span>
        ) : (
          <span
            className={cn(
              "text-xs font-semibold",
              isPenalty ? "text-bad" : "text-good",
            )}
          >
            ×{factor.toFixed(2)}
          </span>
        )}
      </div>
      {/* Sign flip button */}
      <button
        type="button"
        onClick={() => onChange({ ...m, pct: -m.pct })}
        title="Flip between bonus and penalty"
        className="shrink-0 rounded px-1.5 py-1 text-xs font-bold text-muted transition hover:bg-surface-3 hover:text-foreground"
      >
        +/−
      </button>
      <button
        type="button"
        onClick={onRemove}
        title="Remove"
        className="shrink-0 rounded p-1 text-muted transition hover:bg-bad/10 hover:text-bad"
      >
        ✕
      </button>
    </div>
  );
}

/** Reusable list of named damage multipliers that combine multiplicatively. */
export function MultiplierList({
  multipliers,
  onChange,
  accentText,
}: {
  multipliers: DamageMultiplier[];
  onChange: (m: DamageMultiplier[]) => void;
  /** Optional Tailwind text-color class for the product readout (e.g. "text-sec-skill"). */
  accentText?: string;
}) {
  const product = multiplierProduct(multipliers);
  const productStr = product.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 3,
  });

  function addMultiplier() {
    onChange([
      ...multipliers,
      { id: crypto.randomUUID(), name: "Multiplier", pct: 20, enabled: true },
    ]);
  }

  function updateAt(index: number, updated: DamageMultiplier) {
    const next = [...multipliers];
    next[index] = updated;
    onChange(next);
  }

  function removeAt(index: number) {
    onChange(multipliers.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-2">
      {/* Header row: label + product readout */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted">
          Unique Multipliers
        </span>
        {multipliers.length > 0 && (
          <span className={cn("text-sm font-bold", accentText ?? "text-foreground")}>
            Combined: ×{productStr}
          </span>
        )}
      </div>

      {/* Rows */}
      {multipliers.map((m, i) => (
        <MultiplierRow
          key={m.id}
          m={m}
          onChange={(u) => updateAt(i, u)}
          onRemove={() => removeAt(i)}
        />
      ))}

      {/* Add button */}
      <Button variant="outline" size="sm" onClick={addMultiplier}>
        + Add multiplier
      </Button>

      {/* Persistent one-line hint */}
      <p className="text-[11px] text-muted">
        {multipliers.length === 0
          ? "Each entry is its own bracket — they combine multiplicatively (e.g. +20% and +30% → ×1.56). Use a negative value for a penalty (e.g. −30% → ×0.70)."
          : "Tip: use a negative % for a penalty (e.g. −30% → ×0.70). Values below −100% are treated as ×0."}
      </p>
    </div>
  );
}
