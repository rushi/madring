import { interpolateParts } from "../src/data/interpolate.ts";
import type { Copy } from "../src/data/types.ts";

/**
 * The lap, simplified far enough to sit inside index.html, so the drawing is on screen before the
 * bundle is fetched. The runtime path is untouched: highlights measure their runs against its exact
 * length, and a shortened copy of it would put every dyed stretch a few metres out of register.
 */

/** Drawing units a simplified vertex may sit from the line it replaces. Half a kerb width. */
const TOLERANCE = 2;
/**
 * The real gutter is screen px over a measured scale, and nothing has been measured at first paint.
 * A fraction of the lap's long side stands in for it: close enough that the map does not jump
 * noticeably when the measured frame replaces this one.
 */
const PAD_RATIO = 0.09;

/**
 * The whole first frame: the masthead the page opens with and the lap under it, in the same
 * elements and classes React will use, so the measured page lands on top of this one rather than
 * beside it. The masthead is here because the largest thing on the page is the standfirst, and a
 * largest paint that waits for two bundles is a page that reads as empty for a second.
 */
export function seedMarkup(bundle: Seedable, base = "/") {
    const { bbox, pathD, copy, facts } = bundle;
    const cx = round(bbox.x + bbox.w / 2);
    const cy = round(bbox.y + bbox.h / 2);
    const pad = Math.round(Math.max(bbox.w, bbox.h) * PAD_RATIO);

    const flat = frame(cx, cy, bbox.w + pad * 2, bbox.h + pad * 2);
    const upright = frame(cx, cy, bbox.h + pad * 2, bbox.w + pad * 2);
    const d = seedPath(pathD);

    /* Real buttons in a real fieldset, because a span is inline and a button is not: stand-ins that
     * measure differently reflow the standfirst beside them, which is the largest thing on the page.
     * They show the openings, kilometres and the OS palette; a visitor who has chosen otherwise sees
     * their own choice a moment later, when the controls that answer to a click arrive. */
    const controls = [
        chip("panel-toggle sign", copy["panel.hide"]),
        group(copy["units.label"], [
            chip("unit is-active sign", copy["units.metric"]),
            chip("unit sign", copy["units.imperial"]),
        ]),
        group(copy["theme.label"], [
            chip("unit is-active sign", copy["theme.system"]),
            chip("unit sign", copy["theme.light"]),
            chip("unit sign", copy["theme.dark"]),
        ]),
    ].join("");

    const masthead = [
        `<header class="masthead-bar">`,
        `<div class="masthead-name">`,
        `<h1 class="sign masthead"><a href="${escape(base)}" title="${escape(copy["site.home"] ?? "")}">${escape(facts.name)}</a></h1>`,
        `<p class="site-question">${escape(copy["site.question"] ?? "")}</p>`,
        `</div>`,
        `<p class="site-headline">${headline(copy)}</p>`,
        `<div class="masthead-controls">${controls}</div>`,
        `</header>`,
    ].join("");

    const plan = [
        `<svg class="map" viewBox="${flat}" data-upright="${upright}" preserveAspectRatio="xMidYMid meet">`,
        `<g id="lap-seed-plan"><path class="track-edge" d="${d}" /><path class="track-asphalt" d="${d}" /></g>`,
        `</svg>`,
    ].join("");

    return [
        `<div id="lap-seed" aria-hidden="true">`,
        `<div class="shell">`,
        masthead,
        `<div class="stage" data-panel="open"><div class="panel"></div><div class="map-frame">${plan}</div></div>`,
        `</div>`,
        `</div>`,
        `<script>`,
        `/* A link can ask for the panel shut at any width. The breakpoint case is left to CSS,`,
        `   because changing the column count from here shifts a stage that is already painted. */`,
        `var stage = document.querySelector("#lap-seed .stage");`,
        `if (new URLSearchParams(location.search).get("panel") === "off") {`,
        `    stage.setAttribute("data-panel", "closed");`,
        `    stage.querySelector(".panel").remove();`,
        `}`,
        `/* fitLap turns the plan when the map frame comes out taller than it is wide. Reading the`,
        `   frame rather than the window matters: the masthead and the panel between them move that`,
        `   crossover by a few hundred pixels, a band of ordinary windows wide enough to spin the`,
        `   lap a quarter the moment the measured map arrives. */`,
        `var frame = stage.querySelector(".map-frame").getBoundingClientRect();`,
        `if (frame.height > frame.width) {`,
        `    var plan = document.querySelector("#lap-seed .map");`,
        `    plan.setAttribute("viewBox", plan.getAttribute("data-upright"));`,
        `    document.getElementById("lap-seed-plan").setAttribute("transform", "rotate(90 ${cx} ${cy})");`,
        `}`,
        `</script>`,
    ].join("\n");
}

const chip = (className: string, label = "") => `<button type="button" class="${className}">${escape(label)}</button>`;

function group(legend = "", chips: string[]) {
    return `<fieldset class="units"><legend class="visually-hidden">${escape(legend)}</legend>${chips.join("")}</fieldset>`;
}

const escape = (text: string) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** The standfirst with its figures marked, matching what React renders once the bundle lands. */
function headline(copy: Copy) {
    const parts = interpolateParts(copy["site.headline"] ?? "", "metric", copy);
    return parts.map((part) => (part.lead ? `<strong>${escape(part.text)}</strong>` : escape(part.text))).join("");
}

/**
 * The lap as points, thinned, then written back at whole units and closed. The ingest repeats the
 * start as the last point and closes the ring anyway, so the repeat is dropped and Z draws the
 * join: thinning a run whose two ends sit on top of each other collapses the corner they share.
 */
export function seedPath(pathD: string) {
    const points = openRing(parsePath(pathD));
    const kept = simplify(points, TOLERANCE);
    const steps = kept.map((point, index) => {
        return `${index === 0 ? "M" : "L"}${Math.round(point.x)} ${Math.round(point.y)}`;
    });

    return `${steps.join("")}Z`;
}

/** Drops the repeated closing point, leaving a run from the start to the last distinct point. */
function openRing(points: Point[]) {
    const first = points[0];
    const last = points[points.length - 1];
    const closed = points.length > 1 && first!.x === last!.x && first!.y === last!.y;

    return closed ? points.slice(0, -1) : points;
}

export function parsePath(pathD: string) {
    const points: Point[] = [];

    /* Z carries no coordinates, and left in place it makes the point before it unreadable. */
    for (const chunk of pathD.replace(/[Zz]/g, "").split(/[ML]/)) {
        const [x, y] = chunk.trim().split(",").map(Number);
        if (Number.isFinite(x) && Number.isFinite(y)) {
            points.push({ x: x!, y: y! });
        }
    }

    return points;
}

/**
 * Ramer-Douglas-Peucker. Iterative rather than recursive: the lap is roughly 1600 points and a
 * nearly straight run recurses once per point, which is enough to blow the stack on a bad split.
 */
export function simplify(points: Point[], tolerance: number) {
    if (points.length < 3) {
        return points;
    }

    const keep = new Array<boolean>(points.length).fill(false);
    keep[0] = true;
    keep[points.length - 1] = true;

    const stack: Array<[number, number]> = [[0, points.length - 1]];
    while (stack.length > 0) {
        const [first, last] = stack.pop()!;

        let far = -1;
        let worst = tolerance;
        for (let index = first + 1; index < last; index += 1) {
            const away = distanceToSegment(points[index]!, points[first]!, points[last]!);
            if (away > worst) {
                worst = away;
                far = index;
            }
        }

        if (far > -1) {
            keep[far] = true;
            stack.push([first, far], [far, last]);
        }
    }

    return points.filter((_, index) => keep[index]);
}

function distanceToSegment(point: Point, from: Point, to: Point) {
    const runX = to.x - from.x;
    const runY = to.y - from.y;
    const span = runX * runX + runY * runY;
    if (span === 0) {
        return Math.hypot(point.x - from.x, point.y - from.y);
    }

    const along = Math.min(1, Math.max(0, ((point.x - from.x) * runX + (point.y - from.y) * runY) / span));
    return Math.hypot(point.x - (from.x + along * runX), point.y - (from.y + along * runY));
}

const round = (value: number) => Math.round(value * 10) / 10;
const frame = (cx: number, cy: number, w: number, h: number) => `${round(cx - w / 2)} ${round(cy - h / 2)} ${w} ${h}`;

interface Point {
    x: number;
    y: number;
}

export interface Seedable {
    pathD: string;
    copy: Copy;
    facts: { name: string };
    bbox: { x: number; y: number; w: number; h: number };
}
