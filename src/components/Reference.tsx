"use client";

import {
  ARCHETYPE_KEYS,
  ARCHETYPES,
  EFFECTIVENESS,
  ELEMENTS,
  ELEMENT_COLOR_VAR,
  ELEMENT_LABEL,
  STATUS_EFFECTS,
  STATUS_RESIST,
  STATUS_RESIST_PER_POINT,
  WEAPON_KEYS,
  WEAPONS,
} from "@/data/gameData";
import { Card, cn } from "@/components/ui";
import { StanceTable } from "@/components/StanceBadge";

function ElementChart() {
  return (
    <Card className="p-4">
      <h3 className="mb-1 font-display text-lg font-semibold text-foreground">
        Element Effectiveness
      </h3>
      <p className="mb-3 text-xs text-muted">
        Row = attacking element, column = defending element. Blank = 100%.
      </p>
      <div className="overflow-x-auto">
        <table className="border-separate border-spacing-1 text-center text-xs">
          <thead>
            <tr>
              <th className="p-1 text-[10px] font-semibold uppercase text-muted">
                Atk ＼ Def
              </th>
              {ELEMENTS.map((def) => (
                <th key={def} className="p-1">
                  <span
                    className="inline-flex h-6 w-6 items-center justify-center rounded-full text-[9px] font-bold text-white ring-1 ring-black/10"
                    style={{ backgroundColor: `var(${ELEMENT_COLOR_VAR[def]})` }}
                    title={ELEMENT_LABEL[def]}
                  >
                    {ELEMENT_LABEL[def].slice(0, 2)}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ELEMENTS.map((atk) => (
              <tr key={atk}>
                <th className="p-1 text-right">
                  <span
                    className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold text-white"
                    style={{ backgroundColor: `var(${ELEMENT_COLOR_VAR[atk]})` }}
                  >
                    {ELEMENT_LABEL[atk]}
                  </span>
                </th>
                {ELEMENTS.map((def) => {
                  const v = EFFECTIVENESS[atk][def];
                  return (
                    <td
                      key={def}
                      className={cn(
                        "h-8 w-10 rounded-md text-[10px] font-bold tabular-nums",
                        v === 125 && "bg-good/20 text-good",
                        v === 75 && "bg-bad/20 text-bad",
                        v === 100 && "bg-surface-2 text-muted/40",
                      )}
                    >
                      {v === 100 ? "·" : `${v}%`}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function WeaponTable() {
  const sorted = [...WEAPON_KEYS].sort((a, b) => WEAPONS[a].bad - WEAPONS[b].bad);
  return (
    <Card className="p-4">
      <h3 className="mb-3 font-display text-lg font-semibold text-foreground">
        Weapon Base Attack Delay
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-xs uppercase tracking-wide text-muted">
              <th className="py-2 text-left font-semibold">Weapon</th>
              <th className="py-2 text-left font-semibold">Type</th>
              <th className="py-2 text-right font-semibold">BAD</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((k) => (
              <tr key={k} className="border-b border-border/50">
                <td className="py-1.5">{WEAPONS[k].label}</td>
                <td className="py-1.5 capitalize text-muted">{WEAPONS[k].type}</td>
                <td className="py-1.5 text-right tabular-nums font-semibold">
                  {WEAPONS[k].bad.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-[11px] text-muted">Dual Wield: (BAD₁ + BAD₂) × 0.8</p>
    </Card>
  );
}

function ArchetypeTable() {
  return (
    <Card className="p-4">
      <h3 className="mb-3 font-display text-lg font-semibold text-foreground">
        Archetype HP%
      </h3>
      <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
        {ARCHETYPE_KEYS.map((k) => (
          <div key={k} className="rounded-lg bg-surface-2 px-3 py-2">
            <div className="text-muted">{ARCHETYPES[k].label}</div>
            <div className="font-display text-lg font-semibold">{ARCHETYPES[k].hpPct}%</div>
          </div>
        ))}
      </div>
      <p className="mt-2 text-[11px] text-muted">
        Applied to the LSUM term of Max HP.
      </p>
    </Card>
  );
}

function StatusResistTable() {
  return (
    <Card className="p-4">
      <h3 className="mb-1 font-display text-lg font-semibold text-foreground">
        Status Resist by Attribute
      </h3>
      <p className="mb-3 text-xs text-muted">
        Each point grants {STATUS_RESIST_PER_POINT}% resist (reduces chance & duration).
      </p>
      <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
        {STATUS_RESIST.map((r) => (
          <div key={r.attr} className="rounded-lg bg-surface-2 px-3 py-2">
            <div className="font-semibold text-primary">{r.attr}</div>
            <div className="text-muted">{r.effects}</div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function StatusEffectsTable() {
  const debuffs = STATUS_EFFECTS.filter((s) => s.kind === "debuff");
  const buffs = STATUS_EFFECTS.filter((s) => s.kind === "buff");
  return (
    <Card className="p-4">
      <h3 className="mb-3 font-display text-lg font-semibold text-foreground">
        Status Effects
      </h3>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-bad">
            Debuffs
          </h4>
          <ul className="space-y-1.5 text-sm">
            {debuffs.map((s) => (
              <li key={s.name}>
                <span className="font-semibold text-foreground">{s.name}</span>
                <span className="text-muted"> — {s.desc}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-good">
            Buffs
          </h4>
          <ul className="space-y-1.5 text-sm">
            {buffs.map((s) => (
              <li key={s.name}>
                <span className="font-semibold text-foreground">{s.name}</span>
                <span className="text-muted"> — {s.desc}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Card>
  );
}

function StancesCard() {
  return (
    <Card className="p-4">
      <h3 className="mb-1 font-display text-lg font-semibold text-foreground">Stances</h3>
      <p className="mb-3 text-xs text-muted">
        Determined by the off-hand slot. Applies a final multiplier to both ATK and MATK.
      </p>
      <StanceTable />
      <p className="mt-2 text-[11px] text-muted">
        Dual Wield uses attack delay formula (BAD₁ + BAD₂) × 0.8 instead of single-weapon BAD.
      </p>
    </Card>
  );
}

export function Reference() {
  return (
    <div className="space-y-6">
      <ElementChart />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <WeaponTable />
        <div className="space-y-6">
          <StancesCard />
          <ArchetypeTable />
          <StatusResistTable />
        </div>
      </div>
      <StatusEffectsTable />
    </div>
  );
}
