# Essence — Item Substat System

**Source:** `mechanics/Modifiers.png` (in-game screenshot, Jul 2026)  
**Status:** Maximums confirmed. Minimums are **pending** — each option shows only `max` for now; `min` will be added later.

---

## Roll rules

1. **First substat is always a base attribute** — one of STR / AGI / VIT / INT / DEX / LUK — rolling **+2 to +3** (confirmed range; same for every slot).
2. **Remaining substats each come from a different row** in that slot's pool. Exactly one option is chosen per row, and an item never repeats a category.
3. **Maximum substat counts:**
   - Weapons → **5** (base stat + all 4 rows)
   - Most gear → **4** (base stat + 3 of the slot's rows)
   - Artifacts → **3** (base stat + both rows)
   - Chest armor has 5 rows to choose **3** from, so no single chest piece ever carries all five modifiers.
4. **Negative values are reductions and are beneficial** (MP Cost –10, Damage From Melee –5, etc.).

---

## Pools (34 rows, 78 options)

Each bullet is one row; options within a row are mutually exclusive.

### Melee Weapon (5 substats)
- ATK% +5 / MATK% +5  
- Melee Damage +5 / Magic Damage +5  
- Crit +10 / Hit +20 / Attack Speed +10 / Flat ATK +5 / Flat MATK +5  
- Crit Damage +10 / Leech +5 / Chain +1 / Double Attack +25  

### Ranged Weapon (5 substats)
- ATK% +5 / MATK% +5  
- Ranged Damage +5 / Magic Damage +5  
- Crit +10 / Hit +20 / Attack Speed +10 / Flat ATK +5 / Flat MATK +5  
- Crit Damage +10 / Leech +5 / Range +1 / Double Attack +25  

### Magic Weapon (5 substats)
- ATK% +5 / MATK% +5  
- Melee Damage +5 / Magic Damage +5  *(not Cast/Magic-only — the image confirms "Melee" on this row)*
- Cast Speed +10 / MP Cost –10 / Attack Speed +10 / Flat ATK +5 / Flat MATK +5  
- Cooldown Recovery +10 / Healing +10 / Cast Range +1  

### Chest Armor (4 substats; 5 rows — pick 3)
- HP% +10 / MP% +10  
- Flat DEF +10 / Flat MDEF +10  
- DEF% +5 / MDEF% +5  
- Damage From Melee –5 / Damage From Magic –5  
- Healing Received +10 / Perfect Dodge +5  

### Feet (4 substats; every row is a single option)
- Attack Speed +10  
- Move Speed +10  
- Cast Speed +10  
- ASPD Limit +1  

### Legs (4 substats)
- HP Regen% +25 / MP Regen% +25  
- Leech +5 / Cast Speed +10  
- Flee +15 / Perfect Dodge +5  
- MP Cost Reduction –10  

### Artifact (3 substats)
- HP% +2 / MP% +2  
- ATK% +2 / MATK% +2  

### Accessory (4 substats)
- HP% +2 / MP% +2  
- ATK% +2 / MATK% +2  
- Crit +5 / Hit +10 / Attack Speed +5  

### Headgear (4 substats)
- HP% +2 / MP% +2  
- ATK% +2 / MATK% +2  
- Flat ATK +3 / Flat MATK +3  
- Flat DEF +5 / Flat MDEF +5  

---

## Implementation notes

- Data lives in `src/data/essenceData.ts` (not `gameData.ts`) because it is a large self-contained table.
- The reverse index (`buildReverseIndex()`) is computed at render time — no hand-written list to maintain.
- The `EssenceOption` type already has an optional `min?: number` field so adding minimums later requires only a number per entry, no structural change.
- The `ESSENCE_ACCENTS` map in `src/lib/sectionAccents.ts` assigns one of nine distinct Earthtone colours per slot, using the seven existing section accents plus two new tokens (`--sec-essence-a`, `--sec-essence-b`) added to `globals.css`.
