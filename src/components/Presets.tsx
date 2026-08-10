"use client";

import * as React from "react";
import type { Build } from "@/lib/types";
import { computeCore } from "@/lib/formulas";
import {
  buildShareUrl,
  exportBackupToFile,
  parseBackupFile,
  appendLoadouts,
} from "@/lib/storage";
import { makeDefaultBuild, WEAPONS } from "@/data/gameData";
import { Button, Card } from "@/components/ui";
import { ElementBadge } from "@/components/ElementBadge";

// ── PresetCard ────────────────────────────────────────────────────────────────

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
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const deleteTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const core = computeCore(build);
  const atkType = WEAPONS[build.weapon].type;
  // Use attackByType so dual wield (summed) is reflected correctly.
  const primaryAtk = core.attackByType;

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

  const handleDeleteClick = () => {
    if (confirmDelete) {
      if (deleteTimerRef.current) clearTimeout(deleteTimerRef.current);
      onDelete();
    } else {
      setConfirmDelete(true);
      deleteTimerRef.current = setTimeout(() => setConfirmDelete(false), 3000);
    }
  };

  // Clean up timer on unmount.
  React.useEffect(() => {
    return () => {
      if (deleteTimerRef.current) clearTimeout(deleteTimerRef.current);
    };
  }, []);

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
          <div className="text-muted">{build.offhand !== "none" && build.offhand !== "shield" ? "total atk" : `${atkType} atk`}</div>
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
        <Button
          size="sm"
          variant={confirmDelete ? "outline" : "ghost"}
          onClick={handleDeleteClick}
        >
          {confirmDelete ? "Sure?" : "Delete"}
        </Button>
        {msg ? (
          <span className="self-center text-xs font-semibold text-secondary">{msg}</span>
        ) : null}
      </div>
    </Card>
  );
}

// ── Presets tab ───────────────────────────────────────────────────────────────

export function Presets({
  presets,
  setPresets,
  onLoadToCalc,
}: {
  presets: Build[];
  setPresets: (p: Build[]) => void;
  onLoadToCalc: (b: Build) => void;
}) {
  const [ioMsg, setIoMsg] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const flashMsg = (msg: string) => {
    setIoMsg(msg);
    window.setTimeout(() => setIoMsg(null), 3000);
  };

  const update = (id: string, next: Build) =>
    setPresets(presets.map((p) => (p.id === id ? next : p)));
  const remove = (id: string) => setPresets(presets.filter((p) => p.id !== id));
  const duplicate = (b: Build) =>
    setPresets([...presets, { ...structuredClone(b), id: crypto.randomUUID(), name: `${b.name} (copy)` }]);
  const addNew = () =>
    setPresets([...presets, makeDefaultBuild(`Build ${presets.length + 1}`)]);

  const handleBackup = () => exportBackupToFile(presets);

  const handleRestoreClick = () => fileInputRef.current?.click();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    try {
      const text = await file.text();
      const { presets: importedPresets, loadouts: importedLoadouts } = parseBackupFile(text);

      const addedPresets = importedPresets.map((b) => ({
        ...structuredClone(b),
        id: crypto.randomUUID(),
      }));
      if (addedPresets.length > 0) {
        setPresets([...presets, ...addedPresets]);
      }
      if (importedLoadouts.length > 0) {
        appendLoadouts(importedLoadouts);
      }

      const parts: string[] = [];
      if (addedPresets.length > 0)
        parts.push(`${addedPresets.length} preset${addedPresets.length === 1 ? "" : "s"}`);
      if (importedLoadouts.length > 0)
        parts.push(`${importedLoadouts.length} gear set${importedLoadouts.length === 1 ? "" : "s"}`);
      flashMsg(parts.length > 0 ? `Restored ${parts.join(" and ")}` : "Nothing to restore");
    } catch {
      flashMsg("Not a valid SpiritCal file");
    }
  };

  const presetCount = presets.length;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-foreground">
            {presetCount === 0
              ? "No presets saved yet"
              : `${presetCount} preset${presetCount === 1 ? "" : "s"} saved in this browser`}
          </p>
          <p className="text-xs text-muted">
            Auto-saved automatically. Use <span className="font-semibold text-foreground">Backup JSON</span> to
            export everything for safekeeping or moving to another device.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Button size="sm" variant="secondary" onClick={addNew}>
            ＋ New preset
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleBackup}
            disabled={presets.length === 0}
            title={presets.length === 0 ? "No presets to back up" : "Download a backup of all presets and gear loadouts"}
          >
            ↓ Backup JSON
          </Button>
          <Button size="sm" variant="outline" onClick={handleRestoreClick}>
            ↑ Restore JSON
          </Button>
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

      {/* Grid */}
      {presets.length === 0 ? (
        <Card className="p-8 text-center text-muted">
          No presets yet. Build something in the{" "}
          <span className="font-semibold text-foreground">Calculator</span> and hit{" "}
          <span className="font-semibold text-foreground">Save as preset</span>, create a new
          one above, or{" "}
          <span className="font-semibold text-foreground">Restore JSON</span> from a previous
          backup.
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
