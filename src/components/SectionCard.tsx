"use client";

import * as React from "react";
import { cn } from "@/components/ui";
import { type AccentKey, SECTION_ACCENTS } from "@/lib/sectionAccents";

interface SectionCardProps {
  title: string;
  subtitle?: string;
  /** Shown in the header when collapsed so the section still communicates its key value. */
  summary?: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
  className?: string;
  /** Optional per-section accent color. Adds a left border strip + tinted header. */
  accent?: AccentKey;
  /** Controls rendered in the header beside the collapse arrow. Sits outside the
   *  collapse button so interactive elements stay valid and don't toggle the section. */
  headerRight?: React.ReactNode;
  /** Dims the body to signal the section is switched off without hiding its numbers. */
  dimmed?: boolean;
}

export function SectionCard({
  title,
  subtitle,
  summary,
  defaultOpen = true,
  children,
  className,
  accent,
  headerRight,
  dimmed,
}: SectionCardProps) {
  const [open, setOpen] = React.useState(defaultOpen);
  const ac = accent ? SECTION_ACCENTS[accent] : null;

  return (
    <div
      className={cn(
        "rounded-[--radius-card] border border-border bg-surface shadow-sm",
        ac?.leftBorder,
        className,
      )}
    >
      {/* Header: collapse button + optional sibling controls */}
      <div
        className={cn(
          "flex items-start gap-3 rounded-t-[--radius-card] px-5 py-4",
          ac?.headerBg,
        )}
      >
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex min-w-0 flex-1 items-start justify-between gap-3 text-left transition-colors"
        >
          <div className="min-w-0">
            <h2
              className={cn(
                "font-display text-lg font-bold",
                ac ? ac.titleText : "text-foreground",
              )}
            >
              {title}
            </h2>
            {subtitle && !open ? (
              <p className="text-xs text-muted">{subtitle}</p>
            ) : null}
          </div>

          <div className="flex shrink-0 items-center gap-3">
            {/* Summary shown only when collapsed */}
            {!open && summary ? (
              <span className="text-sm font-semibold text-foreground">{summary}</span>
            ) : null}
            {/* Collapse arrow */}
            <span
              className={cn(
                "transition-transform duration-200",
                ac ? ac.titleText : "text-muted",
                open ? "rotate-90" : "rotate-0",
              )}
            >
              ▸
            </span>
          </div>
        </button>

        {headerRight ? (
          <div className="flex shrink-0 items-center gap-2">{headerRight}</div>
        ) : null}
      </div>

      {/* Content */}
      {open ? (
        <div
          className={cn(
            "border-t border-border px-5 pb-5 pt-4 transition-opacity",
            dimmed && "opacity-45",
          )}
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}
