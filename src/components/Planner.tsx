"use client";

import * as React from "react";
import type { Build } from "@/lib/types";
import { computeCore } from "@/lib/formulas";
import { buildShareUrl } from "@/lib/storage";
import { makeDefaultBuild, WEAPONS } from "@/data/gameData";
import { Button, Card } from "@/components/ui";
import { ElementBadge } from "@/components/ElementBadge";

function PresetCard({
  build,
  onChange,
  onDelete,
  onDuplicate,
  onLoad,
}: {
  build: Build;
  onChange: (b: Build) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onLoad: () => void;
}) {
  const [msg, setMsg] = React.useState<string | null>(null);
  const core = computeCore(build);
  const atkType = WEAPONS[build.weapon].type;
  const primaryAtk =
    atkType === "magic" ? core.matk : atkType === "ranged" ? core.rangedAtk : core.meleeAtk;

  const share = async () => {
    try {
      await navigator.clipboard.writeText(buildShareUrl(build));
      setMsg("Link copied");
      window.setTimeout(() => setMsg(null), 1500);
    } catch {
      setMsg("Copy failed");
      window.setTimeout(() => setMsg(null), 1500);
    }
  };

  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="flex items-center gap-2">
        <input
          value={build.name}
          onChange={(e) => onChange({ ...build, name: e.target.value })}
          className="min-w-0 flex-1 rounded-lg border border-transparent bg-transparent px-1 py-1 font-display text-base font-semibold text-foreground hover:border-border focus:border-primary"
        />
        <ElementBadge element={build.element} />
      </div>
      <div className="grid grid-cols-3 gap-2 text-center text-xs">
        <div className="rounded-lg bg-surface-2 py-1.5">
          <div className="text-muted">Lv</div>
          <div className="font-semibold tabular-nums">{build.attrs.LV}</div>
        </div>
        <div className="rounded-lg bg-surface-2 py-1.5">
          <div className="text-muted">{atkType} atk</div>
          <div className="font-semibold tabular-nums">
            {Math.round(primaryAtk).toLocaleString()}
          </div>
        </div>
        <div className="rounded-lg bg-surface-2 py-1.5">
          <div className="text-muted">Max HP</div>
          <div className="font-semibold tabular-nums">
            {Math.round(core.hp).toLocaleString()}
          </div>
        </div>
      </div>
      <div className="text-[11px] text-muted">
        {WEAPONS[build.weapon].label}
        {build.offhand === "shield"
          ? " + Shield"
          : build.offhand !== "none"
            ? ` + ${WEAPONS[build.offhand].label}`
            : ""}
      </div>
      <div className="mt-auto flex flex-wrap gap-1.5">
        <Button size="sm" variant="primary" onClick={onLoad}>
          Load
        </Button>
        <Button size="sm" variant="outline" onClick={onDuplicate}>
          Duplicate
        </Button>
        <Button size="sm" variant="outline" onClick={share}>
          Share
        </Button>
        <Button size="sm" variant="ghost" onClick={onDelete}>
          Delete
        </Button>
        {msg ? (
          <span className="self-center text-xs font-semibold text-secondary">{msg}</span>
        ) : null}
      </div>
    </Card>
  );
}

export function Planner({
  presets,
  setPresets,
  onLoadToCalc,
}: {
  presets: Build[];
  setPresets: (p: Build[]) => void;
  onLoadToCalc: (b: Build) => void;
}) {
  const update = (id: string, next: Build) =>
    setPresets(presets.map((p) => (p.id === id ? next : p)));
  const remove = (id: string) => setPresets(presets.filter((p) => p.id !== id));
  const duplicate = (b: Build) =>
    setPresets([...presets, { ...structuredClone(b), id: crypto.randomUUID(), name: `${b.name} (copy)` }]);
  const addNew = () =>
    setPresets([...presets, makeDefaultBuild(`Build ${presets.length + 1}`)]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted">
          Presets are saved in your browser. Use{" "}
          <span className="font-semibold text-foreground">Share</span> to send a build to
          a friend.
        </p>
        <Button size="sm" variant="secondary" onClick={addNew}>
          ＋ New preset
        </Button>
      </div>

      {presets.length === 0 ? (
        <Card className="p-8 text-center text-muted">
          No presets yet. Build something in the{" "}
          <span className="font-semibold text-foreground">Calculator</span> and hit{" "}
          <span className="font-semibold text-foreground">Save as preset</span>, or create
          a new one here.
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {presets.map((p) => (
            <PresetCard
              key={p.id}
              build={p}
              onChange={(b) => update(p.id, b)}
              onDelete={() => remove(p.id)}
              onDuplicate={() => duplicate(p)}
              onLoad={() => onLoadToCalc(structuredClone(p))}
            />
          ))}
        </div>
      )}
    </div>
  );
}
