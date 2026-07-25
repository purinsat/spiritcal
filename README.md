# SpiritCal

A free, Earthtone-themed **character stat calculator** for the game **SpiritVale**, made by [KRUN-KID](https://www.youtube.com/@KRUN-KID).

Compute your full derived stat sheet, plan damage rotations, compare builds side by side, save presets, and browse reference tables — all in the browser with a light/dark theme, no account needed.

## Features

- **Calculator** — three focused sections: Total Attack (melee/ranged/magic with automatic stance detection), Attack & Cast Speed (attack delay, skill delay, hits/sec, multistrike), and Critical.
- **Damage** — four independently toggleable damage sources (Auto Attack, Skills, Status, Autocast), each with named multiplicative multipliers. Skills are a list with per-skill cast time and cooldown driving a full rotation model. Includes the target and element panel.
- **Compare** — two builds side by side with per-stat deltas. Also holds the full input form and the complete stat sheet, where each stat expands to show its exact formula.
- **Planner** — save, rename, duplicate, delete, and share build presets (stored in your browser).
- **Essence** — item substat reference: nine equipment pools, the roll rules, and a reverse lookup for finding which slot grants a given modifier.
- **Reference** — element effectiveness chart, stances, weapon Base Attack Delay, archetype HP%, status resist, and the status-effect glossary.

## Development

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build
```

## Where the game data lives

All SpiritVale math is ported from `mechanics/` into three files:

- `src/data/gameData.ts` — constants + element matrix
- `src/data/essenceData.ts` — item substat pools (nine slots, 34 rows)
- `src/lib/formulas.ts` — the stat formulas

Edit those to update the numbers. See [`AGENTS.md`](AGENTS.md) for a full map.

## Credits

- App by **KRUN-KID** — [YouTube](https://www.youtube.com/@KRUN-KID) · [Join membership](https://www.youtube.com/channel/UCrREEp9fyOoCBiLn3LjW5OA/join) · [Discord](https://discord.gg/qw4NMz8sfC)
- Formulas by the SpiritVale dev · element chart art by Brilett

This is a free fan-made tool.
