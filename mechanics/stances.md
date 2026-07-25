# SpiritVale Stances

Stances are determined by what occupies the **off-hand slot**.
They apply a final multiplier to ATK and MATK (both physical and magic attack power).

| Stance        | Off-hand slot           | ATK & MATK multiplier |
|---------------|-------------------------|-----------------------|
| Two-Handed    | Empty (no off-hand)     | × 1.25 (+25%)         |
| One-Handed    | Shield                  | × 1.00 (no bonus)     |
| Dual Wield    | A second weapon         | × 1.00 (no bonus)     |

## Notes
- The stance multiplier is a **final/end** multiplier, applied after the base ATK/MATK formula
  (consistent with formulas.md: "Unique multipliers are applied at the end").
- Dual Wield gets its own advantage: the second weapon adds stats, and attack delay uses
  the dual-wield formula `(BAD1 + BAD2) × 0.8` instead of the single-weapon BAD.
- Shield does NOT change attack delay (only the offhand weapon slot triggers dual-wield BAD).

## Sources
- Confirmed by player (KRUN-KID), Jul 2026.
- Corroborated by community guides (gameplay.tips Priest/Summoner guides, Jul 2026).
- **Correction (Jul 2026)**: a further in-game check confirmed One-Handed (shield) does NOT
  grant +15% ATK/MATK — it grants no bonus at all. The community guides above were wrong on
  this point; the in-game check overrides them. Do not restore the +15% figure.
