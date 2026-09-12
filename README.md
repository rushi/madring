# Madring

An interactive map of the Madring, the 2026 Madrid F1 circuit, read as the transport network it physically sits inside.

<!-- screenshot goes here -->

A layer panel switches what the drawing says: overtaking zones, danger zones, La Monumental's banking, the 2026 aero modes (Straight Mode and Overtake Mode), gradient, plus labels and scenery around them. Each layer is a claim about the circuit, not a decoration on it: switch on danger and the map shows where the August 2026 F3 test took its 19 red flags and 11 wall hits; switch on overtaking and it shows the five zones the circuit is built to pass in.

Hover a corner on a pointer device for its name, direction, grade, and speed run. Tap or click a corner to open its detail panel. Units (km/mi) and theme (day/night/auto) are visitor-owned toggles.

## Running it

```
pnpm install
pnpm dev
```

`pnpm dev` and `pnpm build` both run `pnpm ingest` first. Ingest turns the JSON in `content/` into `public/data/circuit.v1.json` (the runtime bundle) and `src/styles/tokens.generated.css` (the CSS tokens). Both are generated and gitignored, so a fresh clone has nothing to read until ingest runs once.

Other scripts, from `package.json`:

```
pnpm build      # ingest, typecheck, vite build
pnpm preview    # serve the production build locally
pnpm typecheck  # tsc --noEmit
pnpm lint       # eslint over content, scripts, src
pnpm format     # prettier over content, scripts, src
pnpm test       # ingest, then vitest run
```

Re-skinning or re-ingesting the circuit is a JSON edit plus one command: no circuit fact, user-visible string, colour, or type token lives in a `.ts`/`.tsx` file.

## Content

Everything the map says is authored in `content/*.json` (corner facts, layer definitions, copy, colours, geometry, segments, sources) and validated against the zod schemas in `content/schema/`. `pnpm ingest` is the only path from that content to the running site.

## Provenance

`content/sources.json` lists where the circuit facts come from. The circuit has not yet been raced: every speed on the map is a promoter projection or an F3-test observation, not a measured lap record. `NOTICE` and the in-app provenance panel say this plainly, and it stays true no matter which layer is on.

## License

MIT license for the code (`LICENSE`).

The track geometry in `content/geometry.json` is traced from "Madring (2026).svg" by GabrielStella, on Wikimedia Commons, licensed CC BY-SA 3.0. The traced geometry is a derivative work and stays under that license; the MIT license does not extend to it.

Anybody and Archivo (the two typefaces) are licensed under the SIL Open Font License 1.1. Full text: `public/fonts/OFL.txt`.

See `NOTICE` for the complete breakdown.

This is an unofficial fan project. It has no affiliation with, and is not endorsed or sponsored by, Formula 1, the FIA, or any other rights holder.
