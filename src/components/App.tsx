"use client";

import * as React from "react";
import type { Build, SetCompareState } from "@/lib/types";
import { makeDefaultBuild } from "@/data/gameData";
import { aggregateNetDelta, applyDeltas } from "@/lib/setCompare";
import {
  decodeBuild,
  loadPresets,
  savePresets,
} from "@/lib/storage";
import { Calculator } from "@/components/Calculator";
import { Compare } from "@/components/Compare";
import { DamageTab } from "@/components/DamageTab";
import { Loadout } from "@/components/Loadout";
import { Presets } from "@/components/Presets";
import { Reference } from "@/components/Reference";
import Essence from "@/components/Essence";
import { SetCompare, makeDefaultSetCompareState } from "@/components/SetCompare";
import { ThemeToggle } from "@/components/ThemeToggle";
import { CreditFooter } from "@/components/CreditFooter";
import { cn } from "@/components/ui";

type Tab = "calculator" | "setcompare" | "damage" | "presets" | "essence" | "reference" | "loadout" | "compare";

const TABS: { id: Tab; label: string }[] = [
  { id: "calculator",  label: "Calculator" },
  { id: "setcompare",  label: "Gear Compare" },
  { id: "damage",      label: "Damage" },
  { id: "presets",     label: "Presets" },
  { id: "essence",     label: "Essence" },
  { id: "reference",   label: "Reference" },
  { id: "loadout",     label: "Loadout" },
  { id: "compare",     label: "Build Compare" },
];

export function App() {
  const [tab, setTab] = React.useState<Tab>("calculator");
  const [build, setBuild] = React.useState<Build>(() => makeDefaultBuild("My Build"));
  const [compareA, setCompareA] = React.useState<Build>(() => makeDefaultBuild("Build A"));
  const [compareB, setCompareB] = React.useState<Build>(() => makeDefaultBuild("Build B"));
  const [setCompareState, setSetCompareState] = React.useState<SetCompareState>(makeDefaultSetCompareState);
  const [applySwapsToDamage, setApplySwapsToDamage] = React.useState(true);
  const [presets, setPresets] = React.useState<Build[]>([]);
  const [hydrated, setHydrated] = React.useState(false);

  // Hydrate presets + optional shared build from URL.
  React.useEffect(() => {
    setPresets(loadPresets());
    const params = new URLSearchParams(window.location.search);
    const shared = params.get("b");
    if (shared) {
      const decoded = decodeBuild(shared);
      if (decoded) setBuild(decoded);
      params.delete("b");
      const qs = params.toString();
      window.history.replaceState(
        null,
        "",
        window.location.pathname + (qs ? `?${qs}` : ""),
      );
    }
    setHydrated(true);
  }, []);

  // Persist presets after hydration.
  React.useEffect(() => {
    if (hydrated) savePresets(presets);
  }, [presets, hydrated]);

  const savePreset = (b: Build) => {
    const copy: Build = { ...structuredClone(b), id: crypto.randomUUID() };
    setPresets((prev) => [...prev, copy]);
    setTab("presets");
  };

  const loadToCalc = (b: Build) => {
    setBuild(b);
    setTab("calculator");
  };

  const activeCount = setCompareState.cards.filter((c) => c.enabled).length;
  const damageBuild = React.useMemo(() => {
    if (!applySwapsToDamage || activeCount === 0) return build;
    return applyDeltas(build, aggregateNetDelta(setCompareState.cards));
  }, [build, setCompareState, applySwapsToDamage, activeCount]);

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-10 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-lg text-primary-foreground shadow-sm">
              ✦
            </span>
            <div className="leading-tight">
              <h1 className="font-display text-xl font-bold text-foreground">SpiritCal</h1>
              <p className="text-[11px] text-muted">SpiritVale stat calculator</p>
            </div>
          </div>
          <ThemeToggle />
        </div>
        <nav className="mx-auto max-w-6xl px-2">
          <div className="flex gap-1 overflow-x-auto">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  "relative whitespace-nowrap px-4 py-2.5 text-sm font-semibold transition",
                  tab === t.id
                    ? "text-primary"
                    : "text-muted hover:text-foreground",
                )}
              >
                {t.label}
                {tab === t.id ? (
                  <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-primary" />
                ) : null}
              </button>
            ))}
          </div>
        </nav>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        {tab === "calculator" && (
          <Calculator build={build} setBuild={setBuild} onSavePreset={savePreset} />
        )}
        {tab === "setcompare" && (
          <SetCompare
            build={build}
            state={setCompareState}
            onChange={setSetCompareState}
          />
        )}
        {tab === "damage" && (
          <DamageTab
            build={build}
            computeBuild={damageBuild}
            onChange={setBuild}
            onEditInCalculator={() => setTab("calculator")}
            swapInfo={{
              activeCount,
              applied: applySwapsToDamage,
              onToggle: setApplySwapsToDamage,
              onOpenSetCompare: () => setTab("setcompare"),
            }}
          />
        )}
        {tab === "loadout" && <Loadout />}
        {tab === "compare" && (
          <Compare
            a={compareA}
            b={compareB}
            setA={setCompareA}
            setB={setCompareB}
            presets={presets}
          />
        )}
        {tab === "presets" && (
          <Presets
            presets={presets}
            setPresets={setPresets}
            onLoadToCalc={loadToCalc}
          />
        )}
        {tab === "essence" && <Essence />}
        {tab === "reference" && <Reference />}
      </main>

      <CreditFooter />
    </div>
  );
}
