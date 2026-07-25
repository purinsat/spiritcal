"use client";

import { ELEMENT_COLOR_VAR, ELEMENT_LABEL } from "@/data/gameData";
import type { ElementKey } from "@/lib/types";
import { cn } from "@/components/ui";

export function ElementDot({ element, size = 12 }: { element: ElementKey; size?: number }) {
  return (
    <span
      className="inline-block rounded-full ring-1 ring-black/10"
      style={{
        width: size,
        height: size,
        backgroundColor: `var(${ELEMENT_COLOR_VAR[element]})`,
      }}
    />
  );
}

export function ElementBadge({
  element,
  className,
}: {
  element: ElementKey;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold text-white shadow-sm",
        className,
      )}
      style={{ backgroundColor: `var(${ELEMENT_COLOR_VAR[element]})` }}
    >
      {ELEMENT_LABEL[element]}
    </span>
  );
}
