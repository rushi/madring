# Madring

What the page claims, and who it claims it for.

## Stack

Vite + React + TypeScript, static build to GitHub Pages. The 22-turn interaction surface, layer state, and a turn-detail panel all read from one shared store. Deploys as static files.

## Users

Primary: an F1 fan around a Madring race weekend who wants to understand where the racing happens. Curious, not an engineer. Arrives from a broadcast mention, a link, or a search. Reads on a phone as often as a laptop. Has no prior mental model of the layout and cannot be assumed to know turn numbers, sector boundaries, or 2026 aero rules.

Not the primary audience, and not designed for at the primary's expense: sim racers wanting geometry tables, media wanting export tooling.

## Product Purpose

An interactive map of the Madring the visitor reads one thing at a time: where cars pass, where they crash, where the track banks, climbs and falls, and where the 2026 aero modes apply. Success is a visitor who can name two overtaking spots and one danger zone after a minute on the page, without reading a manual.

Racing only. Stands, hospitality, catering, transport, and ticketing are out of scope even where source data mentions them.

## Positioning

Every other Madring page is a static layout drawing plus a press-release fact list. This one is a single readable canvas the visitor reconfigures: a panel of layers over real per-turn data (speeds, gradients, banking, aero-mode zones), each layer a claim about the circuit rather than a decoration on it.

## Operating Context

- One screen, one canvas: full-bleed map, a layer panel that collapses to give the map the full width, and a turn detail panel. No multi-route site, no scrollytelling.
- First use is cold: the visitor has never seen this circuit.
- Mobile viewport is a first-class case, not a fallback. A wide 1800x1180 map fitting a portrait phone is the hard layout problem of this project.
- The circuit is new. Every speed on the page is a promoter projection or an F3-test observation, never a measurement, and the design never lets a projection read as a lap record.

## Capabilities and Constraints

Shipping layers. Each is a switch in the panel, independent of the others, authored in `content/layers.json`. One line at a time cannot answer two questions about the same corner, and T17 is both an overtaking zone and a crash-prone corner, so the layers are independent switches rather than a fixed set of racing lines.

Highlights:

1. **Overtaking and braking.** T1, T5, T13, T17, T20. Entry and exit speeds, what makes each work or fail. The official design spec lists T1/T5/T11/T17 under older numbering; both numbers exist and the discrepancy is a fact the map shows rather than resolves silently.
2. **Danger.** F3 August 2026 test: 19 red flags, 11 wall hits, 10 drivers. Hotspots T5-6 chicane, T7 blind crest, T11 run-off, T17 tunnel walls. T12 had zero incidents at roughly 300 km/h and is never coloured like the others. Driver quotes on hand.
3. **Elevation and speed.** 671 m at T2 to 697 m at T7. 8% climb T6-T7, 5% descent T7-T8. A speed trace around the lap, built from `content/turns.json` and `content/geometry.json`.
4. **Straight and Overtake Mode.** Straight Mode runs on the main straight and after T3 only; the FIA bans it through sectors 2 and 3. Overtake Mode has one detection point before T22 entry and activates at T22 exit. One switch covers both, though they are different mechanisms: Straight Mode is movable aerodynamics, Overtake Mode is electrical boost.
5. **La Monumental banking.** 550 m of 24% banking at T12, entered at 180-200 km/h, roughly 300 km/h mid-corner.

Labels and scenery, each its own switch: corner names (listed in a key beside the map, never drawn on it), speed notes, L/R tags, straight names, pit lane and paddock, tunnels, section names, start/finish, the key itself, and a dot grid.

A pointer resting on a corner raises a plate over its badge carrying the corner's name, its direction, its grade, and its projected speed run where one exists. It is a preview of the detail panel, not a second copy of it, and it draws for pointers only: a touch screen opens the corner outright, so the plate would have nothing to add and nowhere to go.

The map does not carry a departures board or per-turn F3 incident counts as a fixed overlay; both are authored in `content/` and ingested, so either can return as a content edit without new code.

Data on hand: `content/geometry.json` (canvas 1800x1180, a `trackPath` polyline of roughly 2400 points), `content/turns.json` (22 turns with x/y, parametric `t`, direction, label offsets, speed, overtaking/crash/banked flags), `content/segments.json` (highlight segments as t-ranges), `content/circuit.json` (facts, straights, tunnels, elevation, section labels), `content/sources.json` (citations).

Technical constraints:

- The track path is a parametric polyline; `t` is the shared coordinate between the map, the turn list, the highlight segments, and any lap animation or lap strip. It is the spine of the data model.
- A single themed SVG, driven by CSS custom properties, replaces the bundled two-palette source assets.
- No elevation series exists per point, only endpoint altitudes and two gradients; any elevation curve is interpolated from those.
- No backend. Static hosting.

Content layer: no circuit fact, user-visible string, colour, or type token is written in a `.ts` or `.tsx` file. Authoring lives in `content/*.json` under zod schemas; `pnpm ingest` validates and emits the runtime bundle plus the CSS tokens. Re-skinning or re-ingesting the circuit is a JSON edit plus one command.

Hosting: GitHub Pages, deployed from Actions so `ingest` runs before `build`. Vite `base` is `/madring/` in CI. No server rewrites are available, which is why all shareable state lives in search params and no router ships.

Units: every speed, distance and altitude reads in kilometres or miles on a visitor-owned toggle. Gradients are a ratio and never convert. One formatter module owns this; no component formats a number itself.

## Brand Commitments

- The lap draws as dark asphalt with a light edge line; a highlight re-kerbs one stretch of it in its own dye. Red is the crash-prone livery, not the surface colour. Selection inverts the badge rather than borrowing a hue, so it never collides with what a layer is saying.
- "Madring" and "Circuito de Madring" are the real names.
- Type is Anybody (variable width, signage caps and numerals) plus Archivo (prose, panel labels, tabular figures).

## Evidence on Hand

Real, sourced, usable:

- Per-turn speeds and notes for all 22 turns, an overtaking ranking with reasoning, F3 test incident counts, 2026 aero-rule specifics, elevation figures, pit and tunnel facts, and third-party difficulty ratings, each attributed in `content/sources.json`.
- `content/*.json` as listed above.
- Driver quotes (Russell, Verstappen, Vowles, Stella, Gasly, Albon), each attributed in the source notes.

Absent and not to be fabricated: lap records, measured top speeds, per-point elevation, tyre or fuel data, sector times, attendance figures beyond the stated capacity, any quote not in the sourced content.

## Product Principles

1. One layer says one thing. A switch that shows everything shows nothing, and the visitor chooses how many are on.
2. Projections are labelled as projections. This circuit has no lap data and the page never implies otherwise. Reconstructed elevation is the exception: it carries no label, because altitude and grade read as plain figures once endpoint heights and gradients are known.
3. Per-turn truth beats aggregate truth. T12 is not dangerous just because its neighbours are; the page says so.
4. Racing only. Every element on screen exists because it affects how cars go around the lap.
5. The map is legible before it is interactive. Cold arrival on a phone is the design case that governs.

## Accessibility & Inclusion

Colour alone never carries a layer. A highlight is distinguished by form as well as hue: each carries its own fill pattern through the run (overtaking solid, crash-prone stippled, banking hatched), so red-green colour vision deficiency does not erase the primary content. Keyboard navigation reaches all 22 corners, the only route to corner data. On a compact map a badge whose neighbour already holds the spot is not drawn, but the corner keeps a 44px target on the track itself, focusable and labelled, so no corner is ever unreachable. Motion respects `prefers-reduced-motion`.
