"use client";

import * as React from "react";
import type { Build, StatResult } from "@/lib/types";
import { computeStats, STAT_GROUP_LABEL, STAT_GROUP_ORDER } from "@/lib/formulas";
import { BuildForm } from "@/components/BuildForm";
import { StanceBadge } from "@/components/StanceBadge";
import { Button, Card, Select, cn } from "@/components/ui";

// Stats where a lower value is the better outcome.
const LOWER_BETTER = new Set([
  "attackDelay",
  "dmgReduction",
  "mdmgReduction",
  "castTime",
  "skillDelay",
  "actualCastTime",
]);
// Stats with no clear "better" direction.
const NEUTRAL = new Set<string>();

function useMerged(a: Build, b: Build) {
  return React.useMemo(() => {
    const sa = computeStats(a);
    const sb = computeStats(b);
    const bMap = new Map(sb.map((s) => [s.key, s]));
    const keys = [...sa.map((s) => s.key)];
    sb.forEach((s) => {
      if (!keys.includes(s.key)) keys.push(s.key);
    });
    const rows = keys.map((k) => {
      const ra = sa.find((s) => s.key === k);
      const rb = bMap.get(k);
      const ref = (ra ?? rb) as StatResult;
      return { key: k, label: ref.label, group: ref.group, a: ra, b: rb };
    });
    const byGroup = new Map<StatResult["group"], typeof rows>();
    rows.forEach((r) => {
      const arr = byGroup.get(r.group) ?? [];
      arr.push(r);
      byGroup.set(r.group, arr);
    });
    return byGroup;
  }, [a, b]);
}

function DeltaCell({
  keyName,
  a,
  b,
}: {
  keyName: string;
  a?: StatResult;
  b?: StatResult;
}) {
  if (!a || !b) return <span className="text-muted">—</span>;
  const diff = b.value - a.value;
  if (Math.abs(diff) < 1e-6 || NEUTRAL.has(keyName))
    return <span className="text-muted">0</span>;
  const better = LOWER_BETTER.has(keyName) ? diff < 0 : diff > 0;
  return (
    <span
      className={cn(
        "font-semibold tabular-nums",
        better ? "text-good" : "text-bad",
      )}
    >
      {diff > 0 ? "+" : ""}
      {diff.toLocaleString(undefined, { maximumFractionDigits: 1 })}
    </span>
  );
}

function BuildPicker({
  label,
  presets,
  onLoad,
}: {
  label: string;
  presets: Build[];
  onLoad: (b: Build) => void;
}) {
  if (presets.length === 0) return null;
  return (
    <Select
      label={label}
      value=""
      onChange={(id) => {
        const p = presets.find((x) => x.id === id);
        if (p) onLoad(structuredClone(p));
      }}
      options={[
        { value: "", label: "Load preset…" },
        ...presets.map((p) => ({ value: p.id, label: p.name })),
      ]}
    />
  );
}

export function Compare({
  a,
  b,
  setA,
  setB,
  presets,
}: {
  a: Build;
  b: Build;
  setA: (x: Build) => void;
  setB: (x: Build) => void;
  presets: Build[];
}) {
  const byGroup = useMerged(a, b);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <h3 className="font-display text-lg font-semibold text-primary">Build A</h3>
              <StanceBadge build={a} />
            </div>
            <div className="w-44">
              <BuildPicker label="" presets={presets} onLoad={(p) => setA({ ...p, name: "Build A" })} />
            </div>
          </div>
          <BuildForm build={a} onChange={setA} />
        </div>
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <h3 className="font-display text-lg font-semibold text-secondary">Build B</h3>
              <StanceBadge build={b} />
            </div>
            <div className="w-44">
              <BuildPicker label="" presets={presets} onLoad={(p) => setB({ ...p, name: "Build B" })} />
            </div>
          </div>
          <BuildForm build={b} onChange={setB} />
        </div>
      </div>

      <Card className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-display text-lg font-semibold text-foreground">
            Comparison
          </h3>
          <Button size="sm" variant="outline" onClick={() => setB(structuredClone(a))}>
            Copy A → B
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[420px] text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-wide text-muted">
                <th className="py-2 text-left font-semibold">Stat</th>
                <th className="py-2 text-right font-semibold text-primary">A</th>
                <th className="py-2 text-right font-semibold text-secondary">B</th>
                <th className="py-2 text-right font-semibold">Δ (B−A)</th>
              </tr>
            </thead>
            <tbody>
              {STAT_GROUP_ORDER.map((group) => {
                const rows = byGroup.get(group);
                if (!rows || rows.length === 0) return null;
                return (
                  <React.Fragment key={group}>
                    <tr>
                      <td
                        colSpan={4}
                        className="pt-3 pb-1 text-xs font-semibold uppercase tracking-wide text-accent"
                      >
                        {STAT_GROUP_LABEL[group]}
                      </td>
                    </tr>
                    {rows.map((r) => (
                      <tr key={r.key} className="border-b border-border/50">
                        <td className="py-1.5 text-muted">{r.label}</td>
                        <td className="py-1.5 text-right tabular-nums">
                          {r.a?.display ?? "—"}
                        </td>
                        <td className="py-1.5 text-right tabular-nums">
                          {r.b?.display ?? "—"}
                        </td>
                        <td className="py-1.5 text-right">
                          <DeltaCell keyName={r.key} a={r.a} b={r.b} />
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
