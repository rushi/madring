import type { Geometry } from "../../data/geometry.ts";
import { offsetPoint, tangentAt } from "../../data/geometry.ts";

/**
 * How far the whole plan is turned on screen. Portrait lays the lap on its side, and every label
 * has to undo that or the map reads sideways on a phone.
 */
export const mapDegrees = (upright: boolean) => (upright ? 90 : 0);

/**
 * Anything drawn beside the lap and turned to lie along it. The half-turn keeps a sign readable
 * wherever the lap doubles back, judged against where the sign lands on screen rather than in the
 * drawing, so it stays right way up in portrait too. Wrong for anything that means a direction.
 */
export function alongTrack(geometry: Geometry, t: number, offset: number, mapDeg = 0) {
    const deg = degreesAt(geometry, t);
    const onScreen = normalise(deg + mapDeg);
    // Dead vertical goes to the flipped side on purpose: a spine label reads bottom to top.
    const flipped = onScreen >= 90 || onScreen < -90;
    return placed(geometry, t, offset, normalise(flipped ? deg + 180 : deg));
}

/** Back into (-180, 180], so a half-turn prints as 0 rather than 360 and stays checkable by eye. */
function normalise(deg: number) {
    const wrapped = ((deg % 360) + 360) % 360;
    return wrapped > 180 ? wrapped - 360 : wrapped;
}

/** The same placement without the half-turn: a chevron has to point the way the cars go. */
export function facingTravel(geometry: Geometry, t: number, offset: number) {
    return placed(geometry, t, offset, degreesAt(geometry, t));
}

/**
 * Where a drawing point lands once the plan itself has been turned. Anything measured against the
 * viewport rather than the drawing has to ask this first, or it measures the wrong axis in portrait.
 */
export function screenPoint(x: number, y: number, cx: number, cy: number, mapDeg: number) {
    if (mapDeg === 0) {
        return { x, y };
    }

    const dx = x - cx;
    const dy = y - cy;
    const radians = (mapDeg * Math.PI) / 180;
    const cos = Math.cos(radians);
    const sin = Math.sin(radians);

    return { x: cx + dx * cos - dy * sin, y: cy + dx * sin + dy * cos };
}

/** A label that holds its screen size and its screen angle, wherever the plan has been turned to. */
export function screenLabel(x: number, y: number, counter: number, mapDeg = 0) {
    const turn = mapDeg === 0 ? "" : ` rotate(${-mapDeg})`;
    return `translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${counter})${turn}`;
}

function placed(geometry: Geometry, t: number, offset: number, deg: number) {
    const [x, y] = offsetPoint(geometry, t, offset);
    const transform = `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${deg.toFixed(2)})`;
    return { x, y, deg, transform };
}

const degreesAt = (geometry: Geometry, t: number) => (tangentAt(geometry, t) * 180) / Math.PI;

/** A layer's dye as a custom property. One spelling, so renaming a livery is one edit. */
export const dyeVar = (livery = "ink") => `var(--md-${livery})`;

/**
 * The width a plate needs for a string at a given size. SVG cannot measure text before it paints,
 * and rule 4 forbids shrinking a label to fit, so the plate is sized from the sign face's average
 * advance instead. Erring wide costs a few px of paper; erring narrow clips a corner name.
 */
export function plateWidth(text: string, px: number, padding = 8) {
    return text.length * px * 0.62 + padding * 2;
}
