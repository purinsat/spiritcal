// Potential system data for the Essence tab.
// Source: dev-provided text (Aug 2026). Art: public/essences/*.png.

export type EssenceKey = "rebirth" | "flow" | "destruction" | "growth" | "chaos";

export interface EssenceDef {
  key: EssenceKey;
  label: string;
  image: string;
  /** Range of potential consumed per use. Chaos is special — it consumes whatever is left. */
  costMin: number;
  costMax: number;
  /** If true this essence burns all remaining potential in one use. */
  consumesAll: boolean;
  /** Drop rate from monsters (percent). */
  dropChancePct: number;
  dropOrder: number;
  /** Short description of the main effect. */
  effect: string;
  /**
   * For Chaos only — four outcomes with equal probability.
   * The Rebirth outcome is marked dangerous; the UI should highlight it.
   */
  outcomes?: ChaosOutcome[];
  /** Tailwind colour token root, e.g. "ess-rebirth" → text-ess-rebirth, bg-ess-rebirth/10. */
  colorKey: string;
}

export interface ChaosOutcome {
  label: string;
  dangerous?: boolean;
}

export const POTENTIAL_MIN = 15;
export const POTENTIAL_MAX = 25;

export const ESSENCES: EssenceDef[] = [
  {
    key: "rebirth",
    label: "Essence of Rebirth",
    image: "/essences/rebirth.png",
    costMin: 2,
    costMax: 3,
    consumesAll: false,
    dropChancePct: 30,
    dropOrder: 1,
    effect: "Removes all substats and adds 3–4 new substats from the item's pool.",
    colorKey: "ess-rebirth",
  },
  {
    key: "flow",
    label: "Essence of Flow",
    image: "/essences/flow.png",
    costMin: 3,
    costMax: 4,
    consumesAll: false,
    dropChancePct: 25,
    dropOrder: 2,
    effect: "Rerolls the value of one selected substat.",
    colorKey: "ess-flow",
  },
  {
    key: "destruction",
    label: "Essence of Destruction",
    image: "/essences/destruction.png",
    costMin: 4,
    costMax: 5,
    consumesAll: false,
    dropChancePct: 20,
    dropOrder: 3,
    effect: "Removes one selected substat and replaces it with a new substat from the pool.",
    colorKey: "ess-destruction",
  },
  {
    key: "growth",
    label: "Essence of Growth",
    image: "/essences/growth.png",
    costMin: 5,
    costMax: 6,
    consumesAll: false,
    dropChancePct: 15,
    dropOrder: 4,
    effect: "Adds one new substat from the item's pool (requires a free substat slot).",
    colorKey: "ess-growth",
  },
  {
    key: "chaos",
    label: "Essence of Chaos",
    image: "/essences/chaos.png",
    costMin: 0,
    costMax: 0,
    consumesAll: true,
    dropChancePct: 10,
    dropOrder: 5,
    effect: "Consumes all remaining potential. Outcome is random (25% each).",
    colorKey: "ess-chaos",
    outcomes: [
      { label: "Do nothing." },
      { label: "Multiply every substat value by 0.7×–1.3×. Values may exceed the normal maximum." },
      { label: "Add a random substat at minimum value. Substats can double up (extends max by 1)." },
      { label: "Rebirth effect — removes all substats and adds 3–4 new ones.", dangerous: true },
    ],
  },
];
