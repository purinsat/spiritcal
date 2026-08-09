# Potential — Item Modification System

**Source:** Dev-provided text (Aug 2026).  
**Art:** `public/essences/*.png` — five orb images moved from `Orbs - Potential System/` at repo root.

---

## How potential works

- Every item drops with a **random amount of potential (15–25)**.
- Each time an essence is used it **consumes potential** (a range — see below).
- When potential reaches **0 the item can no longer be modified** with essences.
- Essences drop from monsters. Drop chance scales with monster level: **0.1%–0.5%**.

---

## The five essences

| Essence | Cost | Drop chance | Effect |
|---------|------|-------------|--------|
| Rebirth | 2–3 | 30% | Removes all substats and adds 3–4 new ones from the pool |
| Flow | 3–4 | 25% | Rerolls the value of a selected substat |
| Destruction | 4–5 | 20% | Removes a selected substat and adds a new one |
| Growth | 5–6 | 15% | Adds a new substat (requires a free slot) |
| Chaos | All remaining | 10% | Random outcome (see below) |

### Essence of Chaos — four equal-chance outcomes

1. **Do nothing.**
2. **Multiply every substat value by 0.7×–1.3×.** Values may exceed the normal maximum this way.
3. **Add a random substat at minimum value.** Substats can double up; this extends an item's maximum substat count by 1 (weapon 5→6, armor/accessory 4→5).
4. **Rebirth effect** — removes all substats and adds 3–4 new ones. This can ruin a well-rolled item.

Chaos consumes ALL remaining potential in one use. Using it more than once is meaningless.

---

## Substat-count ceilings

| Item type | Normal max | Chaos-extended max |
|-----------|------------|--------------------|
| Weapons | 5 | 6 |
| Armor / Accessories | 4 | 5 |
| Artifacts | 3 | 3 (unconfirmed — to be verified with dev) |

The Loadout editor's hard caps match the Chaos-extended ceiling so players can manually enter
a Chaos-boosted item.

---

## Open questions

- Can Chaos extend Artifact substats past 3? Not yet confirmed by dev.
- Is the potential range truly uniform 15–25, or is it weighted?
