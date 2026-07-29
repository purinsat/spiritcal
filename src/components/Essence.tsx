"use client";

import { Fragment, useMemo } from "react";
import {
  BASE_STAT_ROW,
  ESSENCE_POOLS,
  buildReverseIndex,
  type EssencePool,
  type EssenceOption,
} from "@/data/essenceData";
import { ESSENCE_ACCENTS, type EssenceAccent } from "@/lib/sectionAccents";
import { Card, cn } from "@/components/ui";

// ── Helpers ────────────────────────────────────────────────────────────────

function fmtValue(v: number): string {
  return v > 0 ? `+${v}` : String(v);
}

function isNegativeBenefit(v: number): boolean {
  // negative values (reductions) are beneficial — show them in "good" colour
  return v < 0;
}

// ── Option pill ────────────────────────────────────────────────────────────

function OptionPill({
  opt,
  accent,
}: {
  opt: EssenceOption;
  accent: EssenceAccent;
}) {
  const neg = isNegativeBenefit(opt.max);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium",
        accent.border,
        "bg-surface"
      )}
    >
      <span className="text-foreground">{opt.label}</span>
      <span
        className={cn(
          "font-semibold",
          neg ? "text-good" : accent.valueText
        )}
      >
        {fmtValue(opt.max)}
      </span>
    </span>
  );
}

// ── Pool card ──────────────────────────────────────────────────────────────

function PoolCard({ pool }: { pool: EssencePool }) {
  const accent = ESSENCE_ACCENTS[pool.key];
  // Items start at 3 substats; the first is always a base attr, so rows drawn = substats - 1.
  const defaultRows = 3 - 1; // 2 pool rows at the start
  const maxRows = pool.maxSubstats - 1;
  const repeatsRow = maxRows > pool.rows.length;
  const drawText =
    defaultRows === maxRows
      ? `${defaultRows} rows (fixed)`
      : repeatsRow
        ? `2–${pool.rows.length} rows (${pool.rows.length + 1}–${maxRows} repeat a row)`
        : `2–${maxRows} of these ${pool.rows.length} rows`;

  return (
    <div
      className={cn(
        "flex flex-col overflow-hidden rounded-2xl border bg-surface shadow-sm",
        accent.border
      )}
    >
      {/* Header */}
      <div className={cn("flex items-center gap-3 px-4 py-3", accent.headerBg)}>
        <span className="text-2xl leading-none" aria-hidden>
          {pool.icon}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className={cn("font-display text-base font-semibold leading-tight", accent.headerText)}>
            {pool.label}
          </h3>
          <p className="text-[11px] text-muted">
            Starts 3 substats, max {pool.maxSubstats} · {drawText}
          </p>
        </div>
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[11px] font-semibold",
              accent.valueBg,
              accent.valueText
            )}
          >
            3–{pool.maxSubstats} substats
          </span>
      </div>

      {/* Rows — each row is a separate dashed box */}
      <div className="flex flex-col gap-2.5 p-3">
        {pool.rows.map((row, ri) => (
          <div
            key={ri}
            className={cn("rounded-xl border border-dashed p-2.5", accent.border, accent.rowBg)}
          >
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-muted">
                Row {ri + 1}
              </span>
              <span
                className={cn(
                  "rounded px-1.5 py-0.5 text-[10px] font-bold",
                  accent.valueBg,
                  accent.valueText
                )}
              >
                {row.options.length === 1 ? "Fixed" : `Pick 1 of ${row.options.length}`}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {row.options.map((opt, oi) => (
                <Fragment key={opt.label}>
                  {oi > 0 && (
                    <span className="text-[10px] font-medium uppercase text-muted/60">or</span>
                  )}
                  <OptionPill opt={opt} accent={accent} />
                </Fragment>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Rules card ─────────────────────────────────────────────────────────────

function RulesCard() {
  return (
    <Card className="p-5">
      <h2 className="mb-1 font-display text-xl font-bold text-foreground">
        How equipment substats roll
      </h2>
      <p className="mb-4 text-sm text-muted">
        Every piece of gear is assigned substats when it drops. The rules below apply to all items.
      </p>

      <ol className="space-y-3 text-sm text-foreground">
        <li className="flex gap-3">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">
            1
          </span>
          <span>
            <strong>First substat is always a base attribute</strong> — one of STR / AGI / VIT / INT
            / DEX / LUK, rolling <span className="font-semibold text-accent">+2 to +3</span>.
          </span>
        </li>
        <li className="flex gap-3">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">
            2
          </span>
          <span>
            <strong>Remaining substats each come from a pool row</strong> in no fixed order.
            One option is picked per row, and no two substats share the same row —{" "}
            <em>until the final expansion repeats a row</em>.
          </span>
        </li>
        <li className="flex gap-3">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">
            3
          </span>
          <span>
            <strong>All items start at 3 substats</strong> and can be expanded.{" "}
            <span className="font-semibold">Weapons</span> expand to a max of{" "}
            <span className="font-semibold">6</span>.{" "}
            <span className="font-semibold">Armor &amp; accessories</span> expand to{" "}
            <span className="font-semibold">5</span>.{" "}
            <span className="font-semibold">Artifacts</span> stay at{" "}
            <span className="font-semibold">3</span>.
            The last expansion on weapons (6th) and fully-upgraded armor (5th) repeats one row from that slot&apos;s pool.
          </span>
        </li>
        <li className="flex gap-3">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/20 text-xs font-bold text-accent">
            !
          </span>
          <span className="text-muted">
            Values shown are <strong className="text-foreground">maximums</strong>. Minimums are
            pending confirmation and will be added later. Negative values (MP Cost, Damage From Melee,
            etc.) are reductions — they are beneficial.
          </span>
        </li>
      </ol>
    </Card>
  );
}

// ── Base-stat banner ───────────────────────────────────────────────────────

function BaseStatBanner() {
  return (
    <div className="rounded-2xl border border-accent/30 bg-accent/6 p-4">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-accent">
        First substat — every item
      </p>
      <div className="flex flex-wrap gap-2">
        {BASE_STAT_ROW.options.map((opt) => (
          <span
            key={opt.label}
            className="inline-flex items-center gap-1.5 rounded-full border border-accent/40 bg-accent/10 px-3 py-1 text-sm font-semibold text-accent"
          >
            {opt.label}
            <span className="text-xs font-normal text-muted">
              +{opt.min}–{opt.max}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Reverse-lookup card ────────────────────────────────────────────────────

function ReverseCard() {
  const index = useMemo(() => buildReverseIndex(), []);

  return (
    <Card className="p-5">
      <h2 className="mb-1 font-display text-xl font-bold text-foreground">
        Where to find each modifier
      </h2>
      <p className="mb-4 text-sm text-muted">
        Every distinct modifier from all nine pools, with the slots that can roll it and the best
        available maximum. Computed automatically — never drifts from the data above.
      </p>

      <div className="overflow-x-auto">
        <table className="w-full border-separate border-spacing-0 text-sm">
          <thead>
            <tr>
              <th className="sticky left-0 bg-surface pb-2 pr-4 text-left text-xs font-semibold uppercase tracking-wide text-muted">
                Modifier
              </th>
              <th className="pb-2 pr-4 text-right text-xs font-semibold uppercase tracking-wide text-muted">
                Best max
              </th>
              <th className="pb-2 text-left text-xs font-semibold uppercase tracking-wide text-muted">
                Found on
              </th>
            </tr>
          </thead>
          <tbody>
            {index.map((entry, i) => {
              const neg = isNegativeBenefit(entry.bestMax);
              return (
                <tr
                  key={entry.label}
                  className={cn(
                    "border-t border-border/50",
                    i % 2 === 0 ? "bg-surface" : "bg-background-alt"
                  )}
                >
                  <td className="py-2 pr-4 font-medium text-foreground">{entry.label}</td>
                  <td
                    className={cn(
                      "py-2 pr-4 text-right font-semibold tabular-nums",
                      neg ? "text-good" : "text-primary"
                    )}
                  >
                    {fmtValue(entry.bestMax)}
                  </td>
                  <td className="py-2">
                    <div className="flex flex-wrap gap-1">
                      {entry.slots.map((s) => {
                        const a = ESSENCE_ACCENTS[s.slotKey];
                        return (
                          <span
                            key={s.slotKey}
                            className={cn(
                              "rounded-full border px-2 py-0.5 text-xs",
                              a.border,
                              a.headerBg,
                              a.headerText
                            )}
                          >
                            {s.slotLabel}
                            {Math.abs(s.max) < Math.abs(entry.bestMax) && (
                              <span className="ml-1 opacity-60">({fmtValue(s.max)})</span>
                            )}
                          </span>
                        );
                      })}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

// ── Main export ────────────────────────────────────────────────────────────

export default function Essence() {
  return (
    <div className="space-y-6 py-4">
      <RulesCard />
      <BaseStatBanner />

      {/* Nine pool cards — 1 col mobile, 2 at md, 3 at lg */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {ESSENCE_POOLS.map((pool) => (
          <PoolCard key={pool.key} pool={pool} />
        ))}
      </div>

      <ReverseCard />
    </div>
  );
}
