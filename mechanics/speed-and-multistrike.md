# Attack Speed, Cast Speed & Multistrike

Source of truth for `src/lib/formulas.ts` → `computeSpeed()`.

---

## ASPD & Hits per second

```
ASPD = 200 - (50 × BAD × (1 - (AGI/250 + DEX/1000))) / (1 + AtkSpd%) + 0.5 × FLOOR(AGI/10)
AttackDelay = (200 - ASPD) / 50   (seconds)
Hits/sec    = 1 / AttackDelay
```

Where **BAD** (Base Attack Delay) comes from the equipped weapon(s):
- Single weapon: `BAD = weapon.bad`
- Dual Wield: `BAD = (main.bad + off.bad) × 0.8`

### ASPD cap

- Default cap: **193** → exactly **7.14 hits/sec** (validates the formula).
- This cap is raisable via the Shoes **"Atk Spd Limit +1"** enchant and the **Frenzy** buff.
- The `AspdLimit` gear field in `GearMods` stores the player's current cap (default 193).
- The effective limit is clamped below 199 in code so `AttackDelay` stays positive.

---

## Cast Speed & Cast Time Reduction (CTR)

```
CastSpeed  = 200 - (50 × (1 - (DEX + INT/2)/400)) / (1 + CastSpd%) + 0.5 × FLOOR(DEX/10)
CastTime   = max(0, (200 - CastSpeed) / 50)   ← multiplier on a skill's listed cast time
SkillDelay = same number, read as SECONDS     ← the game's "time between skill casts"
CTR exact  = min(100, (1 - CastTime) × 100)   ← for display (one decimal)
CTR        = ROUND(CTR exact)                  ← dev formula, used in the stat sheet
```

**`CastTime` is both a multiplier and a duration**, and that is not a bug. It scales a skill's
listed cast time, and the identical number is what the game's stat window reports as **Skill
delay** in seconds. The reason is that CastSpeed has no per-skill base term where ASPD has `BAD`,
so its reference skill is exactly 1 second. Full explanation and the rotation consequences are in
`skill-delay.md`.

- At CastSpeed 173.75: `CastTime = (200 - 173.75) / 50 = 0.525`
- This means every skill takes **52.5%** of its listed duration → 47.5% faster.
- A 2s sniper skill becomes `2 × 0.525 = 1.05s`, saving `2 - 1.05 = 0.95s`.
- `ctrExact = 47.5%` → displayed on the tile; `ctr = ROUND(47.5) = 48%` in the stat sheet.

**The reduction percentage is fixed for a given build**; only the seconds saved scale with the
skill's base cast time. Use the "Skill cast time" input in the Speed section to test any skill.

The `CastTime` value is clamped to `max(0, …)` so that a CastSpeed above 200 (theoretically
possible via very high DEX/INT + gear) cannot produce a negative multiplier.

The formula in older notes used incorrect parenthesisation (`ROUND(1 - CastTime × 100)`); the
correct grouping `ROUND((1 - CastTime) × 100)` is used everywhere in this codebase.

---

## Multistrike%

- Source: gear enchants (e.g. `Multistrike +25%`), weapons (Flintlock Pistol / Piercer: `+50%`),
  and passive skills (`+5%/Lv`). Older guides call this "Double Attack".
- **Average hits per attack** = `1 + Multistrike / 100`
  - `FLOOR(Multistrike / 100)` guaranteed extra hits
  - `Multistrike % 100` percent chance for one additional hit on top
- **Effective hits/sec** = `Hits/sec × (1 + Multistrike / 100)`

Examples:
| Multistrike% | Guaranteed extra | Chance extra | Avg hits |
|-------------|-----------------|--------------|---------|
| 0%          | 0               | —            | 1.00    |
| 50%         | 0               | 50%          | 1.50    |
| 100%        | 1               | —            | 2.00    |
| 150%        | 1               | 50%          | 2.50    |
| 200%        | 2               | —            | 3.00    |
