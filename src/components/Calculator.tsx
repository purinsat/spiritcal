"use client";

import * as React from "react";
import type { Build } from "@/lib/types";
import { buildShareUrl } from "@/lib/storage";
import { makeDefaultBuild } from "@/data/gameData";
import { computeAttacks } from "@/lib/formulas";
import { TotalAttackSection } from "@/components/TotalAttackSection";
import { SpeedSection, speedSectionSummary } from "@/components/SpeedSection";
import { CriticalSection, critSectionSummary } from "@/components/CriticalSection";
import { SectionCard } from "@/components/SectionCard";
import { Button } from "@/components/ui";

export function Calculator({
  build,
  setBuild,
  onSavePreset,
}: {
  build: Build;
  setBuild: (b: Build) => void;
  onSavePreset: (b: Build) => void;
}) {
  const [msg, setMsg] = React.useState<string | null>(null);

  const flash = (text: string) => {
    setMsg(text);
    window.setTimeout(() => setMsg(null), 2000);
  };

  const share = async () => {
    const url = buildShareUrl(build);
    try {
      await navigator.clipboard.writeText(url);
      flash("Share link copied to clipboard");
    } catch {
      flash("Copy failed — check clipboard permissions");
    }
  };

  // Collapsed summaries
  const primaryAtk = React.useMemo(() => {
    const atks = computeAttacks(build);
    const primary = atks.find((a) => a.isPrimary) ?? atks[0];
    return primary ? Math.round(primary.total).toLocaleString() : "—";
  }, [build]);

  const speedSummary = React.useMemo(() => speedSectionSummary(build), [build]);
  const critSummary = React.useMemo(() => critSectionSummary(build), [build]);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="secondary" size="sm" onClick={() => onSavePreset(build)}>
          ＋ Save as preset
        </Button>
        <Button variant="outline" size="sm" onClick={share}>
          ⇗ Share link
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setBuild({ ...makeDefaultBuild(build.name), target: build.target })}
        >
          ↺ Reset
        </Button>
        {msg ? (
          <span className="text-xs font-semibold text-secondary">{msg}</span>
        ) : null}
      </div>

      {/* Total Attack */}
      <SectionCard
        title="Total Attack"
        subtitle="Your final attack power after all stats, gear, and stance."
        summary={primaryAtk}
        defaultOpen
        accent="attack"
      >
        <TotalAttackSection build={build} onChange={setBuild} accent="attack" />
      </SectionCard>

      {/* Attack & Cast Speed */}
      <SectionCard
        title="Attack & Cast Speed"
        subtitle="Hits per second, cast time, and multistrike."
        summary={speedSummary}
        defaultOpen
        accent="speed"
      >
        <SpeedSection build={build} onChange={setBuild} accent="speed" />
      </SectionCard>

      {/* Critical */}
      <SectionCard
        title="Critical"
        subtitle="Crit chance, crit damage, and effective hit multiplier."
        summary={critSummary}
        defaultOpen
        accent="crit"
      >
        <CriticalSection build={build} onChange={setBuild} accent="crit" />
      </SectionCard>

      <p className="pt-1 text-center text-xs text-muted">
        Looking for HP, defence, or the full stat sheet? Every stat and its formula lives in the{" "}
        <span className="font-semibold text-foreground">Compare</span> tab.
      </p>
    </div>
  );
}
