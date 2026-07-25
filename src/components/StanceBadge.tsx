"use client";

import { getStance, STANCES } from "@/data/gameData";
import type { Build } from "@/lib/types";
import { cn } from "@/components/ui";

const STANCE_STYLES = {
  twoHanded: "bg-primary/15 text-primary border-primary/30",
  oneHanded: "bg-surface-2 text-muted border-border",
  dualWield: "bg-surface-2 text-muted border-border",
} as const;

const STANCE_ICONS = {
  twoHanded: "⚔",
  oneHanded: "🛡",
  dualWield: "⚔⚔",
} as const;

export function StanceBadge({ build, className }: { build: Pick<Build, "offhand">; className?: string }) {
  const stance = getStance(build);
  const pct = stance.mult === 1 ? "No bonus" : `+${Math.round((stance.mult - 1) * 100)}% ATK & MATK`;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold",
        STANCE_STYLES[stance.key],
        className,
      )}
    >
      <span>{STANCE_ICONS[stance.key]}</span>
      {stance.label}
      <span className="opacity-70">— {pct}</span>
    </span>
  );
}

export function StanceTable() {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-border text-xs uppercase tracking-wide text-muted">
          <th className="py-2 text-left font-semibold">Stance</th>
          <th className="py-2 text-left font-semibold">Requirement</th>
          <th className="py-2 text-right font-semibold">ATK & MATK bonus</th>
        </tr>
      </thead>
      <tbody>
        {(["twoHanded", "oneHanded", "dualWield"] as const).map((key) => {
          const s = STANCES[key];
          const pct = s.mult === 1 ? "—" : `+${Math.round((s.mult - 1) * 100)}%`;
          return (
            <tr key={key} className="border-b border-border/50">
              <td className="py-2">
                <span className={cn("font-semibold", s.color)}>{s.label}</span>
              </td>
              <td className="py-2 text-muted">{s.requirement}</td>
              <td className="py-2 text-right tabular-nums font-semibold">
                {pct}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
