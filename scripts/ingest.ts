/** Validates content/, derives what the runtime must not compute, and emits the bundle plus the CSS tokens. */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { z } from "zod";
import {
    circuitFileSchema,
    copyFileSchema,
    geometryFileSchema,
    layersFileSchema,
    segmentsFileSchema,
    sourcesFileSchema,
    themeFileSchema,
    turnsFileSchema,
} from "../content/schema/index.ts";
import type { LayerGroup, Theme } from "../content/schema/index.ts";
import { cumulativeLengths, metresAt, parsePolyline } from "../src/data/geometry.ts";
import type { Geometry } from "../src/data/geometry.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const BUNDLE_VERSION = 1;

const readJson = (rel: string): unknown => JSON.parse(readFileSync(resolve(root, rel), "utf8"));

function parseOrDie<T>(schema: z.ZodType<T>, value: unknown, file: string): T {
    const result = schema.safeParse(value);
    if (result.success) {
        return result.data;
    }

    for (const issue of result.error.issues) {
        console.error(`  ${file} · ${issue.path.join(".") || "(root)"} · ${issue.message}`);
    }
    throw new Error(`${file} failed its schema`);
}

const toBase64 = (arr: Float32Array): string => Buffer.from(arr.buffer).toString("base64");

/** The drawn extent of the lap. The source canvas is mostly empty, so the map frames this instead. */
function boundsOf(xs: Float64Array, ys: Float64Array) {
    const x0 = Math.min(...xs);
    const y0 = Math.min(...ys);
    return {
        x: round(x0, 1),
        y: round(y0, 1),
        w: round(Math.max(...xs) - x0, 1),
        h: round(Math.max(...ys) - y0, 1),
    };
}

/**
 * Altitude is reconstructed, never surveyed: four published numbers, monotone interpolation between,
 * closed around the lap. The bundle flags it `reconstructed` rather than stamping the surface.
 */
function reconstructElevation(
    sByTurn: Map<number, number>,
    lengthM: number,
    facts: { elevation: { lowM: number; highM: number; climbPct: number; descentPct: number } },
) {
    const { lowM, highM, climbPct, descentPct } = facts.elevation;
    const s2 = sByTurn.get(2)!;
    const s6 = sByTurn.get(6)!;
    const s7 = sByTurn.get(7)!;
    const s8 = sByTurn.get(8)!;

    const alt6 = highM - (climbPct / 100) * (s7 - s6);
    const alt8 = highM - (descentPct / 100) * (s8 - s7);

    // Control points in lap order, wrapping T8 -> T2 across the far side of the lap.
    const controls: [number, number][] = [
        [s2, lowM],
        [s6, alt6],
        [s7, highM],
        [s8, alt8],
        [s2 + lengthM, lowM],
    ];

    const SAMPLES = 600;
    const s = new Float32Array(SAMPLES);
    const alt = new Float32Array(SAMPLES);
    for (let i = 0; i < SAMPLES; i += 1) {
        const at = (i / (SAMPLES - 1)) * lengthM;
        s[i] = at;
        alt[i] = altitudeAt(controls, at, lengthM);
    }
    return { s, alt, alt6, alt8 };
}

/** Monotone piecewise interpolation over a circular arc-length domain. */
function altitudeAt(controls: [number, number][], at: number, lengthM: number): number {
    const start = controls[0]![0];
    let x = at;
    while (x < start) {
        x += lengthM;
    }
    while (x > start + lengthM) {
        x -= lengthM;
    }
    for (let i = 0; i < controls.length - 1; i += 1) {
        const [x0, y0] = controls[i]!;
        const [x1, y1] = controls[i + 1]!;
        if (x >= x0 && x <= x1) {
            const u = (x - x0) / (x1 - x0);
            const smooth = u * u * (3 - 2 * u); // smoothstep keeps the crest flat, no overshoot
            return y0 + (y1 - y0) * smooth;
        }
    }
    return controls[0]![1];
}

function gradientAt(controls: [number, number][], at: number, lengthM: number): number {
    const h = 5;
    const a = altitudeAt(controls, at - h, lengthM);
    const b = altitudeAt(controls, at + h, lengthM);
    return ((b - a) / (2 * h)) * 100;
}

function buildTokensCss(theme: ReturnType<typeof themeFileSchema.parse>): string {
    const line = (entries: Record<string, string>, indent: string) => {
        return Object.entries(entries)
            .map(([k, v]) => `${indent}--md-${k}: ${v};`)
            .join("\n");
    };

    const roles = Object.entries(theme.type.roles)
        .map(([name, role]) => {
            const stack = role.face === "sign" ? theme.type.sign.stack : theme.type.text.stack;
            const parts = [
                `    --md-${name}-family: ${stack};`,
                `    --md-${name}-size: ${role.px}px;`,
                `    --md-${name}-weight: ${role.wght};`,
            ];
            if (role.wdthFloor !== undefined) {
                parts.push(`    --md-${name}-wdth: ${role.wdthFloor};`);
            }
            if (role.tracking !== undefined) {
                parts.push(`    --md-${name}-tracking: ${role.tracking}em;`);
            }
            if (role.numeric !== undefined) {
                parts.push(`    --md-${name}-numeric: ${role.numeric};`);
            }
            return parts.join("\n");
        })
        .join("\n");

    const motion = Object.entries(theme.motion)
        .map(([k, v]) => `    --md-${k}: ${v}ms;`)
        .join("\n");
    const layout = Object.entries(theme.layout)
        .map(([k, v]) => `    --md-${k}: ${typeof v === "number" ? `${v}px` : v};`)
        .join("\n");
    const space = Object.entries(theme.space)
        .map(([k, v]) => `    --md-space-${k}: ${v}px;`)
        .join("\n");

    const compactPx = Number(theme.layout.compactPx);
    const compact = theme.type.signCompact
        ? `
/* Compact viewports read sign roles in the condensed face; wide keeps the masthead's cut. */
@media (width < ${compactPx}px), (height < ${compactPx}px) {
    :root {
        --md-masthead-family: ${theme.type.signCompact.stack};
        --md-line-label-family: ${theme.type.signCompact.stack};
    }
}
`
        : "";

    return `/* Generated by \`pnpm ingest\` from content/theme.json. Do not edit. */
:root {
${line(theme.color.light, "    ")}
${roles}
${motion}
${layout}
${space}
    --md-type-min: ${theme.type.minPx}px;
}

:root[data-theme="dark"] {
${line(theme.color.dark, "    ")}
}

@media (prefers-color-scheme: dark) {
    :root:not([data-theme="light"]) {
${line(theme.color.dark, "        ")}
    }
}
${compact}`;
}

/**
 * A layer that names a dye no palette holds, or a stretch set no segment belongs to, draws nothing
 * and reports nothing. Ingest is the only place that can see both halves, so it is where that fails.
 */
function checkLayers(groups: LayerGroup[], theme: Theme, sets: Set<string>): void {
    const seen = new Set<string>();

    for (const layer of groups.flatMap((group) => group.layers)) {
        if (seen.has(layer.id)) {
            throw new Error(`content/layers.json · two layers share the id "${layer.id}"`);
        }
        seen.add(layer.id);

        if (layer.livery && !(layer.livery in theme.color.light)) {
            throw new Error(
                `content/layers.json · layer "${layer.id}" dyes with "${layer.livery}", which no colour names`,
            );
        }

        for (const set of layer.segmentSets ?? []) {
            if (!sets.has(set)) {
                throw new Error(`content/layers.json · layer "${layer.id}" dyes "${set}", which no segment belongs to`);
            }
        }
    }
}

/**
 * A name belongs to a sequence of corners, not to one of them. T14, T15 and T16 are all Enlazadas
 * de Valdebebas; printing the name against each corner says it three times and claims three
 * different things. Runs are derived here so no consumer has to notice the difference.
 */
function namedRuns(turns: { n: number; name: string | null }[]) {
    const runs: { name: string; from: number; to: number }[] = [];

    for (const turn of turns) {
        if (!turn.name) {
            continue;
        }

        const open = runs.at(-1);
        if (open && open.name === turn.name && open.to === turn.n - 1) {
            open.to = turn.n;
            continue;
        }

        runs.push({ name: turn.name, from: turn.n, to: turn.n });
    }

    return runs;
}

function main(): void {
    const copyFile = parseOrDie(copyFileSchema, readJson("content/copy.json"), "content/copy.json");
    const theme = parseOrDie(themeFileSchema, readJson("content/theme.json"), "content/theme.json");
    const turnsFile = parseOrDie(turnsFileSchema, readJson("content/turns.json"), "content/turns.json");
    const facts = parseOrDie(circuitFileSchema, readJson("content/circuit.json"), "content/circuit.json");
    const layersFile = parseOrDie(layersFileSchema, readJson("content/layers.json"), "content/layers.json");
    const sourcesFile = parseOrDie(sourcesFileSchema, readJson("content/sources.json"), "content/sources.json");
    const segmentsFile = parseOrDie(segmentsFileSchema, readJson("content/segments.json"), "content/segments.json");

    const geometryFile = parseOrDie(geometryFileSchema, readJson("content/geometry.json"), "content/geometry.json");
    const { xs, ys } = parsePolyline(geometryFile.trackPath);
    const cum = cumulativeLengths(xs, ys);
    const lengthM = facts.lengthKm * 1000;
    const totalPx = cum[cum.length - 1]!;
    const pxPerM = totalPx / lengthM;
    const geometry: Geometry = { xs, ys, cum, pxPerM, lengthM };
    const bbox = boundsOf(xs, ys);

    const sByTurn = new Map(turnsFile.turns.map((turn) => [turn.n, metresAt(geometry, turn.t)]));
    const elevation = reconstructElevation(sByTurn, lengthM, facts);
    const controls: [number, number][] = [
        [sByTurn.get(2)!, facts.elevation.lowM],
        [sByTurn.get(6)!, elevation.alt6],
        [sByTurn.get(7)!, facts.elevation.highM],
        [sByTurn.get(8)!, elevation.alt8],
        [sByTurn.get(2)! + lengthM, facts.elevation.lowM],
    ];

    const turns = turnsFile.turns.map((turn) => {
        const s = sByTurn.get(turn.n)!;
        return {
            ...turn,
            s: round(s, 1),
            altitudeReconM: round(altitudeAt(controls, s, lengthM), 1),
            gradePct: round(gradientAt(controls, s, lengthM), 2),
        };
    });

    const segments = segmentsFile.segments.map((segment) => {
        const s0 = metresAt(geometry, segment.t0);
        const s1 = metresAt(geometry, segment.t1);
        return {
            ...segment,
            s0: round(s0, 1),
            s1: round(s1, 1),
            lengthM: round(s1 >= s0 ? s1 - s0 : lengthM - s0 + s1, 1),
        };
    });

    const bundle = {
        schemaVersion: BUNDLE_VERSION,
        generatedAt: new Date().toISOString(),
        canvas: { w: geometryFile.canvas.width, h: geometryFile.canvas.height },
        bbox,
        totalPx: round(totalPx, 2),
        pathD: geometryFile.trackPath,
        lengthM,
        pxPerM: round(pxPerM, 6),
        cumB64: toBase64(Float32Array.from(cum)),
        elevation: {
            reconstructed: true as const,
            sB64: toBase64(elevation.s),
            altB64: toBase64(elevation.alt),
        },
        turns,
        namedRuns: namedRuns(turns),
        segments,
        layout: theme.layout,
        layerGroups: layersFile.groups,
        copy: copyFile.copy,
        sources: sourcesFile.sources,
        facts,
    };

    for (const key of ["breakpointMid", "breakpointWide", "panelPx", "mapGutterPx", "compactGutterPx", "compactPx"]) {
        if (typeof theme.layout[key] !== "number") {
            throw new Error(`content/theme.json · layout.${key} is read as a number, so it cannot carry a unit`);
        }
    }

    checkLayers(layersFile.groups, theme, new Set(segments.map((segment) => segment.set)));

    mkdirSync(resolve(root, "public/data"), { recursive: true });
    writeFileSync(resolve(root, "public/data/circuit.v1.json"), JSON.stringify(bundle));
    mkdirSync(resolve(root, "src/styles"), { recursive: true });
    writeFileSync(resolve(root, "src/styles/tokens.generated.css"), buildTokensCss(theme));

    const kb = (JSON.stringify(bundle).length / 1024).toFixed(0);
    const summary = `ingest ok · ${turns.length} turns · ${segments.length} segments · lap ${round(totalPx / pxPerM, 1)} m · bundle ${kb} KB`;
    console.log(summary);
}

const round = (value: number, places: number): number => Number(value.toFixed(places));

main();
