// Per-section accent system.
// All class strings are LITERAL so Tailwind's scanner picks them up.
// Import AccentKey and SECTION_ACCENTS wherever you need section-specific colors.

export type AccentKey = "attack" | "speed" | "crit" | "damage" | "skill" | "status" | "autocast";

/** One accent entry used by the Essence pool cards — simpler shape than SectionAccent. */
export interface EssenceAccent {
  border: string;
  headerBg: string;
  headerText: string;
  rowBg: string;
  valueBg: string;
  valueText: string;
}

import type { SlotKey } from "@/data/essenceData";

export const ESSENCE_ACCENTS: Record<SlotKey, EssenceAccent> = {
  meleeWeapon: {
    border: "border-primary/40",
    headerBg: "bg-primary/10",
    headerText: "text-primary",
    rowBg: "bg-primary/5",
    valueBg: "bg-primary/15",
    valueText: "text-primary",
  },
  rangedWeapon: {
    border: "border-secondary/40",
    headerBg: "bg-secondary/10",
    headerText: "text-secondary",
    rowBg: "bg-secondary/5",
    valueBg: "bg-secondary/15",
    valueText: "text-secondary",
  },
  magicWeapon: {
    border: "border-sec-autocast/40",
    headerBg: "bg-sec-autocast/10",
    headerText: "text-sec-autocast",
    rowBg: "bg-sec-autocast/5",
    valueBg: "bg-sec-autocast/15",
    valueText: "text-sec-autocast",
  },
  chest: {
    border: "border-sec-damage/40",
    headerBg: "bg-sec-damage/10",
    headerText: "text-sec-damage",
    rowBg: "bg-sec-damage/5",
    valueBg: "bg-sec-damage/15",
    valueText: "text-sec-damage",
  },
  feet: {
    border: "border-accent/40",
    headerBg: "bg-accent/10",
    headerText: "text-accent",
    rowBg: "bg-accent/5",
    valueBg: "bg-accent/15",
    valueText: "text-accent",
  },
  legs: {
    border: "border-sec-status/40",
    headerBg: "bg-sec-status/10",
    headerText: "text-sec-status",
    rowBg: "bg-sec-status/5",
    valueBg: "bg-sec-status/15",
    valueText: "text-sec-status",
  },
  artifact: {
    border: "border-sec-skill/40",
    headerBg: "bg-sec-skill/10",
    headerText: "text-sec-skill",
    rowBg: "bg-sec-skill/5",
    valueBg: "bg-sec-skill/15",
    valueText: "text-sec-skill",
  },
  accessory: {
    border: "border-sec-essence-a/40",
    headerBg: "bg-sec-essence-a/10",
    headerText: "text-sec-essence-a",
    rowBg: "bg-sec-essence-a/5",
    valueBg: "bg-sec-essence-a/15",
    valueText: "text-sec-essence-a",
  },
  headgear: {
    border: "border-sec-essence-b/40",
    headerBg: "bg-sec-essence-b/10",
    headerText: "text-sec-essence-b",
    rowBg: "bg-sec-essence-b/5",
    valueBg: "bg-sec-essence-b/15",
    valueText: "text-sec-essence-b",
  },
};

export interface SectionAccent {
  /** Left border strip added to the SectionCard container */
  leftBorder: string;
  /** Light tint applied to the SectionCard header */
  headerBg: string;
  /** Title text color */
  titleText: string;
  /** Primary tile: border */
  tileBorder: string;
  /** Primary tile: background */
  tileBg: string;
  /** Primary tile: big number text */
  tileText: string;
  /** Primary tile: label/heading text */
  tileLabelText: string;
  /** Primary tile: small "Primary" badge */
  badgeBg: string;
  badgeText: string;
}

export const SECTION_ACCENTS: Record<AccentKey, SectionAccent> = {
  attack: {
    leftBorder: "border-l-4 border-l-primary",
    headerBg: "bg-primary/5",
    titleText: "text-primary",
    tileBorder: "border-primary/40",
    tileBg: "bg-primary/8",
    tileText: "text-primary",
    tileLabelText: "text-primary",
    badgeBg: "bg-primary/20",
    badgeText: "text-primary",
  },
  speed: {
    leftBorder: "border-l-4 border-l-secondary",
    headerBg: "bg-secondary/5",
    titleText: "text-secondary",
    tileBorder: "border-secondary/40",
    tileBg: "bg-secondary/8",
    tileText: "text-secondary",
    tileLabelText: "text-secondary",
    badgeBg: "bg-secondary/20",
    badgeText: "text-secondary",
  },
  crit: {
    leftBorder: "border-l-4 border-l-accent",
    headerBg: "bg-accent/5",
    titleText: "text-accent",
    tileBorder: "border-accent/40",
    tileBg: "bg-accent/8",
    tileText: "text-accent",
    tileLabelText: "text-accent",
    badgeBg: "bg-accent/20",
    badgeText: "text-accent",
  },
  damage: {
    leftBorder: "border-l-4 border-l-sec-damage",
    headerBg: "bg-sec-damage/5",
    titleText: "text-sec-damage",
    tileBorder: "border-sec-damage/40",
    tileBg: "bg-sec-damage/8",
    tileText: "text-sec-damage",
    tileLabelText: "text-sec-damage",
    badgeBg: "bg-sec-damage/20",
    badgeText: "text-sec-damage",
  },
  skill: {
    leftBorder: "border-l-4 border-l-sec-skill",
    headerBg: "bg-sec-skill/5",
    titleText: "text-sec-skill",
    tileBorder: "border-sec-skill/40",
    tileBg: "bg-sec-skill/8",
    tileText: "text-sec-skill",
    tileLabelText: "text-sec-skill",
    badgeBg: "bg-sec-skill/20",
    badgeText: "text-sec-skill",
  },
  status: {
    leftBorder: "border-l-4 border-l-sec-status",
    headerBg: "bg-sec-status/5",
    titleText: "text-sec-status",
    tileBorder: "border-sec-status/40",
    tileBg: "bg-sec-status/8",
    tileText: "text-sec-status",
    tileLabelText: "text-sec-status",
    badgeBg: "bg-sec-status/20",
    badgeText: "text-sec-status",
  },
  autocast: {
    leftBorder: "border-l-4 border-l-sec-autocast",
    headerBg: "bg-sec-autocast/5",
    titleText: "text-sec-autocast",
    tileBorder: "border-sec-autocast/40",
    tileBg: "bg-sec-autocast/8",
    tileText: "text-sec-autocast",
    tileLabelText: "text-sec-autocast",
    badgeBg: "bg-sec-autocast/20",
    badgeText: "text-sec-autocast",
  },
};
