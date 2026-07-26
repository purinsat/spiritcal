"use client";

import * as React from "react";

export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}

export function Card({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-[--radius-card] border border-border bg-surface shadow-sm",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-display text-lg font-semibold text-foreground">
      {children}
    </h2>
  );
}

/** Small inline chip shown beside a stat label to indicate it is shared across sections. */
export function SharedStatBadge({ title }: { title?: string }) {
  return (
    <span
      title={title ?? "Shared across sections — editing here updates both"}
      className="ml-1 cursor-help rounded px-1 py-0.5 text-[9px] font-bold uppercase tracking-wide bg-primary/10 text-primary/70"
    >
      ⇄ shared
    </span>
  );
}

export function NumberInput({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  suffix,
  hint,
  badge,
  compact,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
  hint?: string;
  badge?: React.ReactNode;
  /** Shorter control for inline use beside buttons or inside dense rows. */
  compact?: boolean;
}) {
  // Without a label there is no header row to hang the suffix on, so it moves
  // inside the field instead of floating above an empty row.
  const hasHeader = Boolean(label) || Boolean(badge);
  const showInlineSuffix = !hasHeader && Boolean(suffix);

  return (
    <label className="flex flex-col gap-1">
      {hasHeader ? (
        <span className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-muted">
          <span className="flex items-center">{label}{badge}</span>
          {suffix ? <span className="text-[10px] opacity-70">{suffix}</span> : null}
        </span>
      ) : null}
      <div className="relative">
        <input
          type="number"
          inputMode="decimal"
          value={Number.isFinite(value) ? value : 0}
          min={min}
          max={max}
          step={step}
          onChange={(e) => {
            const v = e.target.value === "" ? 0 : Number(e.target.value);
            onChange(Number.isNaN(v) ? 0 : v);
          }}
          className={cn(
            "w-full rounded-lg border border-border bg-surface-2 px-3 text-sm font-semibold text-foreground transition focus:border-primary",
            compact ? "py-1" : "py-2",
            showInlineSuffix && "pr-7",
          )}
        />
        {showInlineSuffix ? (
          <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted">
            {suffix}
          </span>
        ) : null}
      </div>
      {hint ? <span className="text-[11px] text-muted">{hint}</span> : null}
    </label>
  );
}

export function Select<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label?: string;
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <label className="flex flex-col gap-1">
      {label ? (
        <span className="text-xs font-semibold uppercase tracking-wide text-muted">
          {label}
        </span>
      ) : null}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm font-semibold text-foreground transition focus:border-primary"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function Button({
  children,
  onClick,
  variant = "primary",
  size = "md",
  className,
  type = "button",
  disabled,
  title,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "ghost" | "outline";
  size?: "sm" | "md";
  className?: string;
  type?: "button" | "submit";
  disabled?: boolean;
  title?: string;
}) {
  const variants: Record<string, string> = {
    primary:
      "bg-primary text-primary-foreground hover:bg-primary-hover border border-transparent",
    secondary:
      "bg-secondary text-primary-foreground hover:bg-secondary-hover border border-transparent",
    ghost: "bg-transparent text-foreground hover:bg-surface-2 border border-transparent",
    outline:
      "bg-transparent text-foreground border border-border-strong hover:bg-surface-2",
  };
  const sizes: Record<string, string> = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2 text-sm",
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-lg font-semibold transition disabled:cursor-not-allowed disabled:opacity-50",
        variants[variant],
        sizes[size],
        className,
      )}
    >
      {children}
    </button>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
  disabled,
  title,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
  disabled?: boolean;
  title?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      title={title}
      onClick={() => onChange(!checked)}
      className={cn(
        "inline-flex items-center gap-2",
        disabled && "cursor-not-allowed opacity-50",
      )}
    >
      <span
        className={cn(
          "relative h-6 w-11 rounded-full border border-border transition",
          checked ? "bg-primary" : "bg-surface-2",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-4 w-4 rounded-full bg-primary-foreground shadow transition-all",
            checked ? "left-6" : "left-0.5",
          )}
        />
      </span>
      {label ? <span className="text-sm font-semibold">{label}</span> : null}
    </button>
  );
}

export function TextInput({
  label,
  value,
  onChange,
  placeholder,
  hint,
  compact,
}: {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  hint?: string;
  /** Shorter control for inline use inside dense rows. */
  compact?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1">
      {label ? (
        <span className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</span>
      ) : null}
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(
          "w-full rounded-lg border border-border bg-surface-2 px-3 text-sm font-semibold text-foreground transition focus:border-primary",
          compact ? "py-1" : "py-2",
        )}
      />
      {hint ? <span className="text-[11px] text-muted">{hint}</span> : null}
    </label>
  );
}

/** Native-disclosure collapsible wrapper for formula/details blocks.
 *  Closed by default; no JS state required — keyboard accessible via <details>. */
export function FormulaDetails({
  title = "Formula",
  children,
}: {
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <details className="group mb-5 rounded-xl border border-border bg-surface-2/40">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 p-4 text-xs font-semibold uppercase tracking-wide text-muted hover:text-foreground [&::-webkit-details-marker]:hidden">
        <span>{title}</span>
        <span className="text-sm transition-transform group-open:rotate-180">⌄</span>
      </summary>
      <div className="px-4 pb-4">{children}</div>
    </details>
  );
}
