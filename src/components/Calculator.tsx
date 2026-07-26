"use client";

import * as React from "react";
import type { Build } from "@/lib/types";
import { buildShareUrl } from "@/lib/storage";
import { makeDefaultBuild } from "@/data/gameData";
import { computeAttacks } from "@/lib/formulas";
import { TotalAttackSection } from "@/components/TotalAttackSection";
import { SpeedSection, speedSectionSummary } from "@/components/SpeedSection";
import { CriticalSection, critSectionSummary } from "@/components/CriticalSection";
import { DefenseSection, defenseSectionSummary } from "@/components/DefenseSection";
import { UtilitySection, utilitySectionSummary } from "@/components/UtilitySection";
import { SectionCard } from "@/components/SectionCard";
import { Button } from "@/components/ui";

const SECTION_KEYS = ["attack", "speed", "crit", "defense", "utility"] as const;
type SectionKey = (typeof SECTION_KEYS)[number];

const INITIAL_OPEN: Record<SectionKey, boolean> = {
  attack: true,
  speed: false,
  crit: false,
  defense: false,
  utility: false,
};

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
  const [openSections, setOpenSections] = React.useState<Record<SectionKey, boolean>>(INITIAL_OPEN);

  const setSection = (key: SectionKey, value: boolean) =>
    setOpenSections((prev) => ({ ...prev, [key]: value }));

  const flash = (text: string) => {
    setMsg(text);
    window.setTimeout(() => setMsg(null), 2000);
  };

  const allOpen = SECTION_KEYS.every((k) => openSections[k]);
  const toggleAll = () =>
    setOpenSections(
      Object.fromEntries(SECTION_KEYS.map((k) => [k, !allOpen])) as Record<SectionKey, boolean>,
    );

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
  const defenseSummary = React.useMemo(() => defenseSectionSummary(build), [build]);
  const utilitySummary = React.useMemo(() => utilitySectionSummary(build), [build]);

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
        <Button variant="ghost" size="sm" onClick={toggleAll}>
          {allOpen ? "⌃ Collapse all" : "⌄ Expand all"}
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
        open={openSections.attack}
        onOpenChange={(v) => setSection("attack", v)}
        accent="attack"
      >
        <TotalAttackSection build={build} onChange={setBuild} accent="attack" />
      </SectionCard>

      {/* Attack & Cast Speed */}
      <SectionCard
        title="Attack & Cast Speed"
        subtitle="Hits per second, cast time, and multistrike."
        summary={speedSummary}
        open={openSections.speed}
        onOpenChange={(v) => setSection("speed", v)}
        accent="speed"
      >
        <SpeedSection build={build} onChange={setBuild} accent="speed" />
      </SectionCard>

      {/* Critical */}
      <SectionCard
        title="Critical"
        subtitle="Crit chance, crit damage, and effective hit multiplier."
        summary={critSummary}
        open={openSections.crit}
        onOpenChange={(v) => setSection("crit", v)}
        accent="crit"
      >
        <CriticalSection build={build} onChange={setBuild} accent="crit" />
      </SectionCard>

      {/* Defense */}
      <SectionCard
        title="Defense"
        subtitle="Damage reduction, dodge, and reflect."
        summary={defenseSummary}
        open={openSections.defense}
        onOpenChange={(v) => setSection("defense", v)}
        accent="defense"
      >
        <DefenseSection build={build} onChange={setBuild} accent="defense" />
      </SectionCard>

      {/* Utility */}
      <SectionCard
        title="Utility"
        subtitle="HP, MP, regen, siphon, leech, and healing."
        summary={utilitySummary}
        open={openSections.utility}
        onOpenChange={(v) => setSection("utility", v)}
        accent="utility"
      >
        <UtilitySection build={build} onChange={setBuild} accent="utility" />
      </SectionCard>

      <p className="pt-1 text-center text-xs text-muted">
        Looking for the full stat sheet or a side-by-side comparison? Every stat, formula, and delta
        lives in the <span className="font-semibold text-foreground">Compare</span> tab.
      </p>
    </div>
  );
}
