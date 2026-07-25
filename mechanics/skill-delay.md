# Skill Delay

Source of truth for the skill-cast ceiling in `computeSpeed()` and `computeDamageBreakdown()`.

---

## What the game says

The in-game character stat window lists **Skill delay** and describes it as
*"the time between skill casts"* — the exact counterpart to attack delay being the time between
autoattacks. Players commonly see values around `0.3s`.

The dev's `formulas.md` never names this stat. It is not a separate mechanic though: it is the
Cast Speed side of the same encoding the dev used twice.

```
AttackDelay = (200 - ASPD)      / 50   (seconds between autoattacks)
SkillDelay  = (200 - CastSpeed) / 50   (seconds between skill casts)
```

---

## Why the same number is both seconds and a multiplier

`(200 - CastSpeed) / 50` is simultaneously the skill delay in seconds **and** the multiplier applied
to a skill's listed cast time (the basis of CTR). This looks like a bug and is not. Both speed
formulas share the shape `Speed = 200 - 50 × K + decileBonus`, so `(200 - Speed) / 50` recovers `K`.
The difference is what supplies `K`'s unit:

- **ASPD** multiplies by `BAD`, the weapon's Base Attack Delay, which is already in seconds
  (Dagger 1.0, Bow 1.4, Shotgun 2.0). So the result is an absolute duration tied to your weapon.
- **CastSpeed** has a bare `1` where `BAD` would be, and nothing in the formula knows which skill
  you are casting. Its reference skill is therefore exactly 1 second, which makes the result
  readable both as seconds of delay and as the fraction of any skill's listed cast time you pay.

Sanity checks at the baseline (all zero stats, no gear):

- ASPD `150` with a 1.0 BAD weapon gives `1.00s` per swing.
- CastSpeed `150` gives `1.00`, i.e. 0% CTR — you pay a skill's full listed cast time.

At CastSpeed `185` both come out at `0.30`: a 0.30s gap between casts, and 70% CTR.

`CTR = ROUND((1 - K) × 100)`. Note the grouping — `ROUND(1 - K × 100)` would give -99% at the
baseline, so the dev's line is parsed as `(1 - K) × 100`.

---

## How it is modeled

`computeSpeed()` exposes it as a named field rather than making callers read a multiplier as a
duration:

```
skillDelaySec  = max(0, (200 - CastSpeed) / 50)
maxCastsPerSec = 1 / skillDelaySec
```

The delay is a **global** gate, not a per-skill charge. In `computeDamageBreakdown()` two separate
limits apply to the rotation and the tighter one wins:

1. **Timeline** — you cannot spend more than 100% of your time casting (`isCastBound`).
2. **Skill delay** — every skill combined cannot exceed `1 / skillDelaySec` casts per second
   (`isDelayBound`).

```
cycle_i        = max(actualCast_i + cooldown_i, skillDelaySec)
desiredRate    = sum(1 / cycle_i)
castScale      = totalCastFraction > 1        ? 1 / totalCastFraction        : 1
delayScale     = desiredRate > maxCastsPerSec ? maxCastsPerSec / desiredRate : 1
castsPerSec_i  = (1 / cycle_i) × min(castScale, delayScale)
aaUptime       = 1 - sum(castsPerSec_i × actualCast_i)
```

The delay also floors each individual skill's cycle, since consecutive casts of the *same* skill are
still skill casts. That floor is what keeps an instant, no-cooldown skill finite — it resolves to
`1 / skillDelaySec` casts/sec instead of dividing by zero and silently reporting 0 DPS.

Nothing about the delay is persisted. It is derived from the build, so it responds to DEX, INT, and
CastSpd% exactly as the game does, and old presets and share links need no migration.

---

## Open assumption

**The delay gates skills only.** Autoattacks and autocast procs are assumed to continue during it,
so only the actual casting animation (`castsPerSec × actualCast`) is subtracted from autoattack
uptime. This follows the in-game wording, which talks about the time between *skill casts* and says
nothing about attacking.

If it turns out the delay freezes autoattacks too, the fix is to subtract the full delay window from
`aaUptime` in `computeDamageBreakdown()` instead of just the cast time.
