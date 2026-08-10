# Skill Delay

Source of truth for the skill-cast ceiling in `computeSpeed()` and `computeDamageBreakdown()`.

---

## What the game says

The in-game character stat window lists **Skill delay** and describes it as
*"the time between skill casts"* — the exact counterpart to attack delay being the time between
autoattacks. Players commonly see values around `0.3s`.

---

## Which stat drives it

**Skill delay tracks ASPD, not Cast Speed.**

The earlier model assumed skill delay was `(200 - CastSpeed) / 50` (the same number as the cast
time multiplier). That turned out to be wrong. The dev has not published the formula, so the app
now takes skill delay as a **manual input** read directly from the in-game stat window rather than
deriving it from a formula.

Cast Speed only drives **Cast Time Reduction (CTR)** — how long each skill takes to cast:

```
castTime multiplier = (200 - CastSpeed) / 50    →  drives CTR
CTR = ROUND((1 - castTime) × 100)               →  e.g. 70% at CastSpeed 185
```

The cast time multiplier and skill delay are **separate numbers** that happen to read similarly at
typical stats. Do not conflate them.

---

## How it is modeled

`computeSpeed()` reads `build.skillDelaySec` (default 0.3) and exposes:

```
skillDelaySec  = build.skillDelaySec           (manual input)
maxCastsPerSec = 1 / skillDelaySec             (global ceiling)
```

---

## How the rotation cycle works

Per skill, the repeat interval is:

```
cycleSec = actualCastTime + skillDelaySec + max(0, cooldownSec)
```

All three terms are **additive** — cast the skill, then wait out the delay, then wait any remaining
cooldown. A zero guard (`cycleSec > 0 ? 1 / cycleSec : 0`) prevents division by zero when all
three are 0.

The delay is also a **global** gate: `desiredCastsPerSec` summed across all skills is capped at
`maxCastsPerSec`, keeping `isDelayBound` meaningful when several skills compete.

---

## Historical note

The app previously derived skill delay as `(200 - CastSpeed) / 50` under the assumption that the
two CastSpeed readings (cast time multiplier and skill delay in seconds) were the same number. This
is documented in the original `skill-delay.md`. That analysis was correct for the cast time
multiplier but wrong for skill delay, which depends on ASPD. The old explainer text in
`SpeedSection` and `DamageTab` has been rewritten to reflect this correction.

---

## Open assumption

**The delay gates skills only.** Autoattacks and autocast procs are assumed to continue during it,
so only the actual casting animation (`castsPerSec × actualCast`) is subtracted from autoattack
uptime. This follows the in-game wording, which talks about the time between *skill casts*.

If it turns out the delay freezes autoattacks too, the fix is to subtract the full delay window from
`aaUptime` in `computeDamageBreakdown()` instead of just the cast time.
