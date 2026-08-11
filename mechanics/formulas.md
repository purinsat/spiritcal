Formulas
Melee Atk: (LV/4 + STR*1.5 + DEX/5 + LUK/5 + MASTERY + ATK * (1 + STR/200)) * (1 + FLOOR(STR/10) / 100) * (1 + ATK%)
# Confirmed Jul 2026: flat ATK scales by STR/200, not DEX/200 (corrected from earlier transcription).

Ranged Atk: (LV/4 + DEX + STR/5 + LUK/5 + MASTERY + ATK * (1 + DEX/200)) * (1 +  FLOOR(DEX/10) / 100) * (1 + ATK%)

Matk: (LV/4 + INT*1.5 + DEX/5 + MASTERY + MATK * (1 + INT/200)) * (1 + FLOOR(INT/10) / 100) * (1 + MATK%)
# Corrected Aug 2026: the flat term is MATK (a separate stat from ATK), not ATK.
# MATK is split into non-weapon MATK, WeaponMATK (main hand), and OffhandMATK (off hand),
# mirroring the three-way ATK split. Melee and ranged formulas continue to use ATK.

[Unique multipliers are applied at the end, e.g. * (1 + DamageMagic%) * (1 + ElementDamage%)]

CastSpeed: 200 - 50 * [1 - (DEX+INT/2)/400] / (1 + CastSpd%) + 0.5*FLOOR(DEX/10) 
CTR: ROUND(1 - [(200 - CastSpeed) / 50] * 100)

ASPD: 200 - 50 * BAD * (1 - (AGI/250 + DEX/1000)) / (1 + AtkSpd%) + 0.5*FLOOR(AGI/10)
AttackDelay: (200 - ASPD) / 50

Def: DEF * (1 + VIT/1000 + Def%)
Mdef: MDEF * (1 + INT/1000 + Mdef%)
# Confirmed Jul 2026: MDEF scales by INT/1000, not VIT/1000 (corrected from earlier transcription).

DamageReduction: 100 / (DEF + 100)

ReflectDamage: (LV + DEF/2 + FlatDEF/2 + ATK/2) * 4 * Reflect%
# Confirmed Jul 2026: DEF is total DEF (FlatDEF * (1 + VIT/1000 + Def%)), FlatDEF is the same raw flat DEF input (not a separate stat), ATK is the full computed attack (melee/ranged/magic) for the equipped weapon type.
Healing: (LV+ INT + VIT) * 2.5 * Healing%
StatusDamage: (LV + STR + AGI + INT) / 10 * Stacks * StatusDamage%

CritRate: (LUK/3 + FLOOR(LUK/10) + CRIT) * (1 + Crit%)
CritDamage: 120 + FLOOR(LUK/10)*2 + CritDamage%
CritDef: LUK/5 + CritDef

Flee: (LV + AGI + LUK/5 + 3*FLOOR(AGI/10) + FLEE) * (1 + Flee%)
Hit: (LV + DEX*2 + HIT + 25) * (1 + Hit%) 
Perfect Dodge: LUK/10 + PerfectDodge
[Flee Penalty: (Attackers - 4) * 10%]

Chance to hit: 100 + Attacker Hit - Defender Flee
Average Monster Hit/Flee: LV * 2
[This is what's used for displayed hit/flee % in the stat screen]

HealthMax: [(90 + LV*10 + LSUM * Archetype%) * (1 + VIT/100) + HP] * (1 + Hp%)
ManaMax: [(45 + LV*5) * (1 + INT/100) + MP] * (1 + Mp%)

[LSUM = LV * (LV + 1) / 2] 
(The bonus HP from this part of the formula stops at LV130)

HealthRegen: (MaxHP/100 + VIT/5 + FlatRegen) * (1 + VIT/100 + Regen%) + MaxHP * MaxHPRegen%
ManaRegen: (MaxMP/100 + INT/5 + FlatRegen) * (1 + INT/100 + Regen%) + MaxMP * MaxMPRegen%

Leech & Siphon
[Siphon does extra damage and recovers your hp/mp with autoattacks]
SiphonHp: Siphon * (LV + STR) / 50
SiphonMp: Siphon * (LV + INT) / 50

[Leech recovers your hp/mp over time based on damage dealt, capped to 20% of max hp/mp per second]
Leech Amount: Leech% * damage dealt / 3

[Correction, Jul 2026: "Siphon" above is really two separate gear stats, SiphonHp and
SiphonMp — each feeds only its own formula (the shared "Siphon" name was a modeling error
in the app, not a game mechanic; Blood Lust's "+25 HP Siphon" only makes sense if MP Siphon
is separate). Siphon pays out per hit, flat, not scaled by damage like Leech. Every hit
siphons, including multistrike extra hits, so siphon-per-second scales with attack speed —
this is the OPPOSITE of the autocast rule, where multihits count as one hit.]

Base Attack Delay (BAD)
Unarmed: 0.9
Dagger: 1
Twinblade: 1
Sword: 1.1
Book: 1.1
Mace: 1.15
Instrument: 1.15
Spear: 1.2
Wand: 1.2
Scythe: 1.2
Axe: 1.3
Bow: 1.4
Pistol: 1.2
Gatling Gun: 1.4
Rifle: 1.5
Shotgun: 2.0
Launcher: 2.0

Dual Wield: (BAD1 + BAD2) * 0.8

HealthMax Archetype%
Warrior: 130%
Knight: 100%
Rogue: 85%
Scout: 75%
Acolyte: 75%
Summoner: 70%
Mage: 50%
Weaver: 50%

Autocast Level
Autocast Level = SkillMaxLevel * 0.3 rounded up
Heal Autocast (max 1) = Lv1
Soulstrike Autocast (max 5) = Lv2
Thunderbolt Autocast (max 10) = Lv3

Having a higher learned skill level will increase the autocast level
Multihits don't increase autocast chances, they are counted as one hit
Only autoattacks will trigger autocasts

Status Resist
What is Status Resist?
Status resist reduces chance and also duration
E.g. 100% chance to silence for 5s vs. 50% resist 
= 50% chance to silence for 2.5s

Attributes grant 0.66% resist per point to certain status effects
Str: Bleed/Stagger
Agi: Slow/Freeze
Vit: Stun/Decay
Int: Silence/Burn
Dex: Poison/Blind
Luk: Curse/Weaken





Status Effects
Stagger: Disable Block, -25% def
Curse: Reverse Healing, -25% mdef
Burning: Stacking dmg, 3% hp dmg per second
Bleeding: Stacking dmg, Disable health recovery
Poison: Stacking dmg, Disable mana recovery
Decay: Stacking dmg, -1% healing received per stack
Slow: -50% Cast/Attack/Move speed
Blind: -25% Hit/Flee/Crit 
Weaken: -25% Final Damage
Vulnerability: +1% Physical damage taken (max 25 stacks)
Magic Exposure: +1% Magical damage taken (max 25 stacks)
Might: +1% Melee/Magic/Ranged damage (max 25 stacks)
Frenzy: +25% Attack speed, +1 Attack speed limit
Focus: +25% Cast speed
Haste: +25% Move speed, +10 Agi
Fury: +20% Crit
Vitality: +20% Health, +10 Vit
Regeneration: Stacking recovery, +1% healing received (max 25 stacks)
Protection: +25% Block
Defiance: +10% Final Damage Reduction
Stability: No Flinch, No Knockback
Blood Lust: +25 HP Siphon
Grace: +100% HP/MP recovery rate
Benediction: +10 Str/Int/Dex/Luk, +20 Hit
Zeal: +15 Atk/Matk
Guardian Spirit: Immune to ranged damage
Aegis: Immune to all damage

---
## Confirmed answers (Jul 2026)

**Leech stats are separate pools (confirmed Jul 2026)**: HP Leech% and MP Leech% are two different gear stats, each computing its own raw value (Leech% * damage / 3) and capped independently at 20% of max HP/MP per second. MP Leech% does not yet appear on any in-game gear as of Jul 2026.

**Magic damage reduction**: Uses the same curve as physical — 100 / (MDEF + 100). Already matched by app.

**Reflect formula terms**:
- DEF = total DEF = FlatDEF * (1 + VIT/1000 + Def%)  (already computed as c.def in the app)
- FlatDEF in the formula = the same flat DEF gear input, not a separate stat — "FlatDEF (reflect)" field removed
- ATK = full computed attack (melee/ranged/magic) depending on main weapon, not raw gear ATK

**Multistrike rename**: "Double Attack" was renamed to "Multistrike" by the dev. Same stat, same formula. Updated in essenceData and all references.