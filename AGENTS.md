# SpiritCal — agent context

Read this first. It exists so any future prompt is productive without re-reading the whole repo.

## What this is
**SpiritCal**: a free, fun, Earthtone-themed **character stat calculator** for the game **SpiritVale**.
Made by the YouTube channel **KRUN-KID**. No accounts, no backend, no paywalls — keep it that way.

## Stack
Next.js (App Router) + TypeScript + Tailwind CSS v4. 100% client-side; deploys on Vercel (`npm run dev` / `build`).

## Source of truth for game math
The dev's real formulas + element chart live in `mechanics/` (`formulas.md`, `SpiritVale_Elements.png`, `stances.md`).
They are encoded in exactly TWO files:
- `src/data/gameData.ts` — constants: 10 elements + `EFFECTIVENESS` matrix, weapon Base Attack Delay, archetype HP%, status effects/resist, stances (`STANCES` + `getStance()`), `DEFAULT_DAMAGE`, defaults.
- `src/lib/formulas.ts` — pure functions ported 1:1 from `formulas.md`; `computeCore()`, `computeSpeed()`, `computeCrit()`, `computeDamageBreakdown()`, and `computeStats()` (labelled stat sheet + formula text).

> To change game data/math, edit ONLY those two files (and `mechanics/` if the source changed). Formulas are ported verbatim — keep `FLOOR`/`ROUND` semantics and percent-as-whole-number (10 = 10%) convention.

## Tabs
1. **Calculator** — three focused sections only (Total Attack, Attack & Cast Speed, Critical). Deliberately has NO full stat sheet and no raw input form; those live in Compare.
2. **Damage** — Target & Element plus four switchable damage sources (AA, Skills, Status, Autocast) each with named multiplicative multipliers. Skills are a list with per-skill cast time and cooldown driving a rotation. Reads shared ATK/speed/crit live from the same build.
3. **Compare** — side-by-side build comparison. Also the only place with the full `BuildForm` (every attribute, gear flat/percent, target) and the complete `computeStats()` table, so it doubles as the stat sheet.
4. **Planner** — saved build presets.
5. **Essence** — read-only item substat reference. Nine pool cards (Melee/Ranged/Magic Weapon, Chest, Feet, Legs, Artifact, Accessory, Headgear) with roll rules, a base-attribute banner, and a computed reverse-lookup table. Data in `src/data/essenceData.ts`.
6. **Reference** — element chart, stances, status effects.

## File map
- `src/lib/types.ts` — all shared types (`Build`, `Attributes`, `GearMods`, `Target`, `DamageMultiplier`, `DamageConfig`, `StatResult`, keys).
- `src/lib/storage.ts` — localStorage presets, theme, base64 URL share encode/decode, and `normalizeDamage()` deep merge for backward compat.
- `src/lib/sectionAccents.ts` — `AccentKey` type + `SECTION_ACCENTS` map. Seven keys: attack, speed, crit, damage (plum), skill (teal), status (moss), autocast (violet). Also exports `ESSENCE_ACCENTS: Record<SlotKey, EssenceAccent>` — nine colour entries for the Essence tab, using the seven existing accents plus two new Earthtone tokens (`--sec-essence-a`, `--sec-essence-b`) registered in `globals.css`.
- `src/components/App.tsx` — tabbed shell + state (build, compare A/B, presets, URL import). Six tabs: calculator, damage, compare, planner, essence, reference.
- `src/components/StanceBadge.tsx` — `StanceBadge` (compact badge) + `StanceTable` (Reference row); both read from `getStance()`.
- `src/components/SectionCard.tsx` — reusable collapsible section with optional `summary`, `accent` (colored left border + tinted header), `headerRight` slot for controls rendered outside the collapse button, and `dimmed` to grey out a switched-off body.
- `src/components/TotalAttackSection.tsx` — three attack tiles + weapon/stance/attribute/gear inputs (accent-aware, no outer Card; wrapped by SectionCard in Calculator).
- `src/components/SpeedSection.tsx` — hits/sec tiles, cast time/CTR, multistrike explainer, speed inputs (accent-aware).
- `src/components/CriticalSection.tsx` — crit chance/damage/multiplier tiles, overcap warning, crit inputs, `critSectionSummary()`.
- `src/components/DamageTab.tsx` — the Damage tab. Sub-components: `SharedBanner`, `DurationControl`, `TargetBlock`, `SourceSwitch`, `AABlock`, `SkillRow`, `SkillsBlock`, `StatusBlock`, `AutocastBlock`, `CombinedBlock`. Reads `build.damage: DamageConfig`. Owns the only inputs for attack element, the enemy target, and `StatusDamagepct` outside `BuildForm`.
- `src/components/MultiplierList.tsx` — reusable list of named `DamageMultiplier` entries; shows combined product readout. Exported `multiplierProduct()` helper.
- `src/components/BuildForm.tsx` — inputs for a `Build` (attributes, gear flat/percent, target). Rendered only by `Compare.tsx` (twice). Do not add it back to the Calculator.
- `Calculator.tsx` / `Compare.tsx` / `Planner.tsx` / `Essence.tsx` / `Reference.tsx` — the five non-Damage tabs. `Essence.tsx` is read-only (no props) and reads only `essenceData.ts`.
- `src/data/essenceData.ts` — nine item substat pools (34 rows, 78 options), `BASE_STAT_ROW`, substat counts, and `buildReverseIndex()`. Lives in its own file (not `gameData.ts`) because it is a large self-contained table. `EssenceOption.min` is optional; add minimums here once confirmed.
- `CreditFooter.tsx` — KRUN-KID credit + links (do not remove).
- `src/components/ui.tsx` — primitives (Card, NumberInput, TextInput, Select, Button, Toggle, SharedStatBadge). `NumberInput`/`TextInput` take `compact` for dense inline rows; `NumberInput` skips its header row when unlabelled and renders `suffix` inside the field instead. `Toggle` supports `disabled`/`title`.
- `src/app/globals.css` — Earthtone theme tokens (light/dark via `.dark`) + per-element accent colors + sec-damage/skill/status/autocast tokens.
- `mechanics/speed-and-multistrike.md` — ASPD cap (193 = 7.14 hits/sec, raisable), Multistrike%, CTR formula decision.
- `mechanics/skill-delay.md` — skill delay = `(200 - CastSpeed) / 50`, why that number is both seconds and a multiplier, and the global casts/sec ceiling.
- `mechanics/damage-estimate.md` — all four damage type formulas, multiplicative multiplier rule, rotation vs skill overlap, target chain assumptions.

## DamageConfig structure
`Build.damage: DamageConfig` is persisted with presets and share links. `normalizeDamage()` in `storage.ts` deep-merges it, defaults every `enabled` to true, and migrates the legacy singular `skill` object into `skills.entries`. Defaults are `DEFAULT_DAMAGE` / `DEFAULT_SKILL` in `gameData.ts`.

```ts
DamageConfig {
  aa:       { enabled, multipliers: DamageMultiplier[] }
  skills:   { enabled, entries: SkillEntry[] }
  status:   { enabled, stacks, critApplies, multipliers }
  autocast: { enabled, name, damagePct, chancePct, critApplies, multipliers }
}
SkillEntry { id, name, damagePct, hits, critApplies, baseCastTime, cooldownSec, enabled, multipliers }
```

Every source can be switched off (some classes have no autocast). **Autocast is coupled to AA**: `autocastOn = autocast.enabled && aa.enabled`, because `formulas.md` says only autoattacks trigger autocasts. `computeDamageBreakdown` exposes `autocastSuppressedByAa` for the UI to explain it.

## Rotation model
Skills form a real timeline. Each has `cycle = max(actualCastTime + cooldownSec, skillDelaySec)` (cooldown starts when the cast completes) and claims `castFraction = actualCastTime / cycle` of the timeline. Two limits apply and the tighter wins: the timeline (`isCastBound`, skills want over 100% of the time) and skill delay (`isDelayBound`, combined casts/sec exceed `1 / skillDelaySec`). `aaUptime` is whatever the resolved cast rates leave free; AA and autocast scale by it while status ticks regardless. Full detail in `mechanics/damage-estimate.md`.

## Confirmed mechanics
- **Autocast + Multistrike**: dev-confirmed that Multistrike extra hits do NOT trigger autocast (`formulas.md`: "Multihits don't increase autocast chances, they are counted as one hit"). Procs scale on base attacks/sec, not effective hits/sec. Do not reintroduce a proc-basis toggle.
- **Skill delay**: the in-game stat window's "Skill delay — time between skill casts" is `(200 - CastSpeed) / 50`, the twin of `AttackDelay = (200 - ASPD) / 50`. It is the SAME number as the cast time multiplier, because CastSpeed has no per-skill base term where ASPD has `BAD`. Never hard-code it (it is derived, never persisted) and never "fix" the multiplier/seconds duplication — see `mechanics/skill-delay.md`. Open assumption recorded there: the delay gates skills only, not autoattacks.
- **Stance bonus**: only Two-Handed (empty off-hand) grants a stance bonus, +25% ATK/MATK. One-Handed (shield) grants NO bonus (`mult: 1.0`) — the previously-used +15% figure came from community guides and was disproven by an in-game check, Jul 2026. Do not restore +15% for One-Handed.

## Conventions
- Theme: CSS variables in `globals.css`, exposed to Tailwind via `@theme inline`. Dark mode = `.dark` on `<html>` (set pre-paint in `layout.tsx`, toggled in `ThemeToggle.tsx`).
- Keep formula functions pure and return values usable by both UI and comparison.
- Builds are plain serializable objects so presets/share links keep working.

## Do-not-touch
- KRUN-KID credit + YouTube channel (`https://www.youtube.com/@KRUN-KID`), membership link
  (`https://www.youtube.com/channel/UCrREEp9fyOoCBiLn3LjW5OA/join`), and Discord community
  (`https://discord.gg/qw4NMz8sfC`) in `CreditFooter.tsx`.
- Keep the app free and client-only.
