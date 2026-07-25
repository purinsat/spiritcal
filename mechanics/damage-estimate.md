# Damage Estimate — App Methodology

> **Important:** No official damage formula exists in `formulas.md`. All values on the Damage tab are app-level estimates that compose the dev-provided attack, crit, and speed stats.

## Data flow

All damage sources read the same shared values from the active build:

- **ATK (primary)** — `computeCore(build).attackByType` — respects weapon type and stance multiplier
- **Avg crit multiplier** — `computeCrit(build).critMultiplier` — `(1-p) + p × (critDmg%/100)`
- **Base hits/sec** — `computeSpeed(build).hitsPerSec` — `1 / attackDelay`
- **Effective hits/sec** — `computeSpeed(build).effectiveHitsPerSec` — `hitsPerSec × (1 + Multistrike/100)`
- **Cast time multiplier** — `computeSpeed(build).castTime` — applied to each skill's listed cast time

## Multiplicative multipliers

Each user-added multiplier is its own bracket and combines multiplicatively:

```
Combined = Π (1 + pct_i / 100)  for all enabled entries i
```

Example: `+20%` and `+30%` → `1.20 × 1.30 = 1.56×`, **not** `1.50×`.

This matches the dev formula pattern: `× (1 + DamageMagic%) × (1 + ElementDamage%)`.

## Per-source switches

Every source has an `enabled` flag, so builds that lack one can switch it off:

```
aaOn       = damage.aa.enabled
skillsOn   = damage.skills.enabled
statusOn   = damage.status.enabled
autocastOn = damage.autocast.enabled && aaOn
```

**Autocast is coupled to Auto Attack.** `formulas.md` states `Only autoattacks will trigger autocasts`, so turning AA off forces autocast to zero regardless of its own flag. The result exposes `autocastSuppressedByAa` so the UI can explain the zero rather than looking broken.

A disabled source contributes 0 to the rotation but its own per-hit and per-cast figures stay visible in its section, so you can still see what it would do.

## The four damage sources

### 1. Auto Attack (AA)

```
AAPerHit = ATK × critMultiplier × Π(multipliers)
AADps    = AAPerHit × effectiveHitsPerSec        // full rate, while actually autoattacking
```

Multistrike applies here — extra hits raise effective hits/sec.

### 2. Skills (rotation)

Skills are a list. Each entry has its own `baseCastTime` and `cooldownSec`, independent of the `Build.skillCastTime` used by the Calculator's Speed section.

```
actualCast_i   = baseCastTime_i × castTimeMultiplier
cycle_i        = max(actualCast_i + cooldownSec_i, skillDelaySec)
perCast_i      = ATK × (damagePct_i/100) × hits_i × (critApplies_i ? critMult : 1) × Π(multipliers_i)
castFraction_i = actualCast_i / cycle_i           // share of the timeline spent casting this skill
```

Cooldown starts when the cast completes. `skillDelaySec = (200 - CastSpeed) / 50` floors the cycle
because a skill cannot repeat faster than the game's gap between casts — see `skill-delay.md`.

Two limits then apply to the rotation and the tighter one wins:

```
totalCastFraction = Σ castFraction_i               // 1. timeline: can't cast more than 100% of the time
desiredRate       = Σ (1 / cycle_i)                // 2. skill delay: global casts/sec ceiling
maxCastsPerSec    = 1 / skillDelaySec

isCastBound  = totalCastFraction > 1
isDelayBound = desiredRate > maxCastsPerSec

castScale  = isCastBound  ? 1 / totalCastFraction        : 1
delayScale = isDelayBound ? maxCastsPerSec / desiredRate : 1
scale      = min(castScale, delayScale)

castsPerSec_i = scale / cycle_i
skillDps      = Σ (perCast_i × castsPerSec_i)
aaUptime      = clamp(1 - Σ (castsPerSec_i × actualCast_i), 0, 1)
```

Uptime is derived from the resolved cast rates, so whichever limit bound above is automatically
respected.

The model degrades gracefully at both extremes. A single skill with 0 cooldown and a long cast gives
`castFraction = 1`, `aaUptime = 0`, and `skillDps = perCast / actualCast` — the same answer as a
simple cast-time-only calculation. A skill with no cast time and no cooldown lands on the delay
ceiling at `1 / skillDelaySec` casts/sec with `aaUptime = 1`, instead of the divide-by-zero that
previously reported 0 DPS.

### 3. Status Damage

```
StatusBase    = (LV + STR + AGI + INT) / 10 × stacks × StatusDamage%
StatusPerTick = StatusBase × (critApplies ? critMult : 1) × Π(multipliers)
StatusDps     = StatusPerTick × 1 tick/sec  [assumed]
```

- `StatusDamage%` comes from the gear stat in the Calculator.
- `stacks` is a user input for how many stacks are on the enemy.
- **Tick rate assumed 1/sec** (consistent with Burning being "per second"). Adjust your duration window if the real tick rate differs.

### 4. Autocast

```
ACPerProc   = ATK × (damagePct/100) × (critApplies ? critMult : 1) × Π(multipliers)
ProcsPerSec = baseHitsPerSec × (chancePct/100)
ACDps       = ACPerProc × ProcsPerSec            // full rate
```

Procs scale on **base attacks/sec**, not effective hits/sec. `formulas.md`: `Multihits don't increase autocast chances, they are counted as one hit`. This is dev-confirmed, so stacking Multistrike raises AA damage but not autocast rate.

## Rotation model

Casting a skill means you are not autoattacking, so AA and autocast only run during the time skills leave free. Status is a damage-over-time effect and keeps ticking regardless:

```
aaDpsInRotation     = aaOn       ? aaDps     × aaUptime : 0
acDpsInRotation     = autocastOn ? acDps     × aaUptime : 0
statusDpsInRotation = statusOn   ? statusDps            : 0     // not scaled by uptime

totalRotationDps    = skillDps + aaDpsInRotation + acDpsInRotation + statusDpsInRotation
totalRotationDamage = totalRotationDps × durationSec
```

The Combined Overview breaks this out by all four sources with each one's share of the total, and itemises the individual skills underneath. Because autocast is scaled by uptime, casting more skills visibly lowers autocast DPS — a direct consequence of the dev-confirmed autoattack-only proc rule.

## Target chain

When Vs Target is enabled:

```
TargetMult = elementMultiplier(attacker, target) / 100
DefMult    = 100 / (DEF + 100)         // or MDEF for magic
HitChance  = clamp(0, (HIT - FLEE + 100) / 100, 1)
```

Element and DEF apply to all four sources. **Hit chance applies to AA only** — autocast is treated as an independent proc, and status is assumed to keep ticking once inflicted.

Assumptions are displayed in the UI rather than hidden.
