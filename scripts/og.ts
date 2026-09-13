import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildGeometry, pxAt } from "../src/data/geometry.ts";
import type { CircuitData, Layer } from "../src/data/types.ts";
import { highlightLayers, segmentsFor } from "../src/layers/resolve.ts";

/**
 * The social share card, drawn from the bundle and tokens so `pnpm og` re-skins it with the page.
 * Chrome rasterises: librsvg (sharp) ignores a data-URI @font-face, and a fallback-sans wordmark is
 * not the brand. The lap carries all five lenses at once, which the page never does: the card
 * exists to show the layers, the page to read them. Runs are cut with HighlightRuns' pxAt dash
 * maths, so they sit in register with the track.
 */

/* The card scrapers crop to. Rendered at 2x so the numerals stay sharp on a retina feed. */
const H = 630;
const W = 1200;
const PAD = 48;
/* The road at its true weights. Must mirror .track-edge and .track-asphalt in map.css. */
const EDGE_W = 20;
const ASPHALT_W = 13;
/* Stations sit on the corner points: the solver that offsets badges on the map does not run here. */
const BADGE_R = 13;
/* The kerb holds 3.5 screen px a side at any zoom, so at card scale it widens in drawing units.
   Mirrors the kerbed formula in HighlightRuns. */
const KERB_PX = 3.5;
/* Room kept below the lap for the wordmark, so badges never slide under it. */
const WORDMARK_RESERVE = 150;
/* The map's own passes (GLOW_PASSES in HighlightRuns.tsx), verbatim: the road is true weight here. */
const GLOW_PASSES = [
    { blur: 14, width: 76, opacity: 0.16 },
    { blur: 5, width: 30, opacity: 0.55 },
];

const root = fileURLToPath(new URL("..", import.meta.url));
const round = (value: number) => Math.round(value * 10) / 10;
const esc = (text: string) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const bundle = readBundle();
const { bbox, copy, facts, pathD, totalPx, turns } = bundle;

const tokens = tokensForCard();
const geometry = buildGeometry(bundle);
const layers = highlightLayers(bundle);
const token = (key: string) => need(tokens.dark, key);

/** The layer's dye token. A highlight with no livery would draw nothing, so it fails loud here. */
function dye(layer: Layer) {
    const { livery } = layer;
    if (!livery) {
        throw new Error(`layer ${layer.id} carries no livery; the card dyes every highlight`);
    }

    return token(livery);
}

const scale = Math.min((W - PAD * 2) / bbox.w, (H - PAD * 2 - WORDMARK_RESERVE) / bbox.h);
const ox = (W - bbox.w * scale) / 2 - bbox.x * scale;
const oy = (H - WORDMARK_RESERVE - bbox.h * scale) / 2 - bbox.y * scale;
const place = `translate(${round(ox)} ${round(oy)}) scale(${scale})`;
const at = (x: number, y: number) => ({ x: round(x * scale + ox), y: round(y * scale + oy) });

/** HighlightRuns.dashFor, string-shaped for attributes. Same pxAt maths, so register holds. */
function dashFor(segment: { t0: number; t1: number }) {
    const startPx = pxAt(geometry, segment.t0);
    const endPx = pxAt(geometry, segment.t1);
    const runPx = endPx > startPx ? endPx - startPx : totalPx - startPx + endPx;

    return runPx > 0 ? `stroke-dasharray="${round(runPx)} ${totalPx}" stroke-dashoffset="${round(-startPx)}"` : "";
}

const runPath = (dash: string, stroke: string, width: number, opacity?: number) => {
    const dim = opacity === undefined ? "" : ` stroke-opacity="${opacity}"`;
    return `<path d="${pathD}" fill="none" stroke="${stroke}"${dim} stroke-width="${width}" ${dash} transform="${place}"/>`;
};

/** A layer whose dye needs its fill pattern over the asphalt; a solid run stops at the kerb. */
const textured = (layer: Layer) => (layer.fill ?? "solid") !== "solid";

/* A highlight re-kerbs one stretch rather than painting the surface: dye on the edge, asphalt back
   over it. */
const runs = layers.flatMap((layer) => {
    const color = dye(layer);
    const kerbed = ASPHALT_W + (2 * KERB_PX) / scale;

    return segmentsFor(bundle, layer).flatMap((segment) => {
        const dash = dashFor(segment);
        const parts = [runPath(dash, color, kerbed, 0.95), runPath(dash, token("asphalt"), ASPHALT_W)];
        if (textured(layer)) {
            parts.push(runPath(dash, `url(#og-${layer.id})`, ASPHALT_W));
        }

        return parts;
    });
});

/* Near here, before the kerb says where: the same blurred twin under the road the map draws. */
const glow = layers
    .filter((layer) => layer.glow)
    .flatMap((layer) => {
        const color = dye(layer);
        const stretches = segmentsFor(bundle, layer);

        return GLOW_PASSES.map((pass, index) => {
            const paths = stretches.map((segment) => runPath(dashFor(segment), color, pass.width, pass.opacity));
            return `<g filter="url(#og-glow-${index})">${paths.join("")}</g>`;
        });
    });

/* The fill patterns of HighlightRuns.Texture, in user space so the grain keeps its drawing units.
   Hue never carries a highlight alone, so every non-solid fill has one. */
function pattern(layer: Layer) {
    const color = dye(layer);
    const id = `og-${layer.id}`;

    if (layer.fill === "hatch45") {
        return `<pattern id="${id}" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="10" height="10" fill="${color}" fill-opacity="0.18"/><line x1="0" y1="0" x2="0" y2="10" stroke="${color}" stroke-width="3" stroke-opacity="0.9"/></pattern>`;
    }

    if (layer.fill === "stipple") {
        return `<pattern id="${id}" width="10" height="10" patternUnits="userSpaceOnUse"><rect width="10" height="10" fill="${color}" fill-opacity="0.16"/><circle cx="3" cy="3" r="1.7" fill="${color}"/><circle cx="8" cy="8" r="1.7" fill="${color}"/></pattern>`;
    }

    if (layer.fill === "chevron") {
        return `<pattern id="${id}" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(90)"><rect width="14" height="14" fill="${color}" fill-opacity="0.16"/><path d="M 0,10 L 7,3 L 14,10" fill="none" stroke="${color}" stroke-width="2.6"/></pattern>`;
    }

    return `<pattern id="${id}" width="16" height="16" patternUnits="userSpaceOnUse"><rect width="16" height="16" fill="${color}" fill-opacity="0.16"/><rect width="8" height="16" fill="${color}" fill-opacity="0.85"/></pattern>`;
}

const stations = turns
    .map((turn) => {
        const { x, y } = at(turn.x, turn.y);
        return [
            `<circle cx="${x}" cy="${y}" r="${BADGE_R}" fill="${token("badge-face")}" stroke="${token("paper")}" stroke-width="2"/>`,
            `<text x="${x}" y="${y}" dy="0.34em" class="numeral" fill="${token("badge-ink")}">${turn.n}</text>`,
        ].join("");
    })
    .join("");

const defs = [
    GLOW_PASSES.map((pass, index) => {
        return `<filter id="og-glow-${index}" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="${pass.blur}"/></filter>`;
    }),
    layers.filter(textured).map(pattern),
].join("");

const { masthead, numeral, section } = tokens.type;
const html = `<!doctype html>
<html><head><meta charset="utf-8"/><style>
${fontFace("Anybody", "anybody-sign.woff2", "100 900", "50% 150%")}
${fontFace("Archivo", "archivo-text.woff2", "100 900")}
* { margin: 0; }
body { width: ${W}px; height: ${H}px; background: ${token("paper")}; position: relative; overflow: hidden; }
.numeral { font-family: ${numeral.family}; font-size: 14px; font-weight: ${numeral.weight}; font-variation-settings: "wdth" ${numeral.wdth}; font-variant-numeric: tabular-nums; text-anchor: middle; }
.wordmark { position: absolute; left: ${PAD}px; bottom: ${PAD - 8}px; }
.wordmark h1 { font-family: ${masthead.family}; font-weight: ${masthead.weight}; font-variation-settings: "wdth" ${masthead.wdth}; font-size: 56px; line-height: 1; color: ${token("ink")}; text-transform: uppercase; }
.wordmark .sub { font-family: ${section.family}; font-weight: ${section.weight}; font-variation-settings: "wdth" ${section.wdth}; font-size: 15px; letter-spacing: ${section.tracking}; text-transform: uppercase; color: ${token("ink-2")}; margin-top: 10px; }
.wordmark .question { font-family: "Archivo"; font-size: 16px; color: ${token("ink-2")}; margin-top: 8px; }
</style></head><body>
<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    <defs>${defs}</defs>
    ${glow.join("")}
    ${runPath("", token("edge"), EDGE_W)}
    ${runPath("", token("asphalt"), ASPHALT_W)}
    ${runs.join("")}
    ${stations}
</svg>
<div class="wordmark">
    <h1>${esc(facts.name)}</h1>
    <p class="sub">${esc(copy["site.subtitle"] ?? "")}</p>
    <p class="question">${esc(copy["site.question"] ?? "")}</p>
</div>
</body></html>`;

const dir = join(tmpdir(), "madring-og");
mkdirSync(dir, { recursive: true });
const page = join(dir, "og.html");
const out = join(root, "public", "og.png");
writeFileSync(page, html);

const chrome = chromePath();
const args = [
    "--headless",
    "--disable-gpu",
    "--hide-scrollbars",
    "--no-first-run",
    "--force-device-scale-factor=2",
    `--window-size=${W},${H}`,
    `--screenshot=${out}`,
    page,
];
try {
    /* stderr is piped rather than inherited: headless Chrome logs its display grumbles even on a
       clean run, and they read as a failure when the card wrote fine. A real failure throws with it. */
    execFileSync(chrome, args, { stdio: ["ignore", "ignore", "pipe"] });
} finally {
    rmSync(page, { force: true });
}
console.log(`og: ${out} (${W * 2}x${H * 2})`);

function readBundle() {
    const path = join(root, "public", "data", "circuit.v1.json");

    try {
        return JSON.parse(readFileSync(path, "utf8")) as CircuitData;
    } catch (cause) {
        throw new Error("the card cannot be drawn without the bundle. run pnpm ingest first.", { cause });
    }
}

/**
 * Colour and type come from the generated tokens, so a re-skin in content/theme.json reaches the
 * card. Colours from the dark block (the card is always the dark face), type cuts from the root
 * block. A missing token fails loud here rather than shipping a card in a fallback face.
 */
function tokensForCard() {
    const css = readFileSync(join(root, "src", "styles", "tokens.generated.css"), "utf8");
    const darkBlock = css.match(/:root\[data-theme="dark"]\s*\{([^}]*)\}/)?.[1] ?? "";
    const baseBlock = css.match(/^:root\s*\{([^}]*)\}/m)?.[1] ?? "";
    const dark = vars(darkBlock);
    const base = vars(baseBlock);

    for (const key of ["paper", "edge", "asphalt", "badge-face", "badge-ink", "ink", "ink-2"]) {
        need(dark, key);
    }

    return {
        dark,
        type: {
            masthead: cut(base, "masthead"),
            numeral: cut(base, "map-numeral"),
            section: { ...cut(base, "map-section"), tracking: need(base, "map-section-tracking") },
        },
    };
}

function vars(block: string) {
    return Object.fromEntries([...block.matchAll(/--md-([\w-]+):\s*([^;]+);/g)].map((m) => [m[1]!, m[2]!.trim()]));
}

/** One type cut: family, weight and width share a token prefix, so the card sets what the map sets. */
function cut(base: Record<string, string>, prefix: string) {
    return {
        family: need(base, `${prefix}-family`),
        weight: need(base, `${prefix}-weight`),
        wdth: need(base, `${prefix}-wdth`),
    };
}

function need(table: Record<string, string>, key: string) {
    const value = table[key];
    if (!value) {
        throw new Error(`tokens.generated.css has no --md-${key} where the card expects it; run pnpm ingest`);
    }

    return value;
}

function fontFace(family: string, file: string, weight: string, stretch?: string) {
    const data = readFileSync(join(root, "public", "fonts", file)).toString("base64");
    return `@font-face{font-family:"${family}";src:url(data:font/woff2;base64,${data}) format("woff2");font-weight:${weight};${stretch ? `font-stretch:${stretch};` : ""}}`;
}

function chromePath() {
    const candidates = [
        process.env.CHROME_PATH ?? "",
        "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
        "/usr/bin/google-chrome",
    ];

    for (const path of candidates) {
        if (path && existsSync(path)) {
            return path;
        }
    }

    throw new Error("no Chrome found; set CHROME_PATH to a Chrome or Chromium binary");
}
