import type { CircuitData } from "./types.ts";

export interface Geometry {
    xs: Float64Array;
    ys: Float64Array;
    /** Cumulative arc length in px at each vertex. Float64 at build time, Float32 once decoded. */
    cum: Float32Array | Float64Array;
    pxPerM: number;
    lengthM: number;
}

/** Cumulative arc length in px at each vertex. Build time only; the runtime decodes the result. */
export function cumulativeLengths(xs: Float64Array, ys: Float64Array) {
    const cum = new Float64Array(xs.length);
    for (let i = 1; i < xs.length; i += 1) {
        cum[i] = cum[i - 1]! + Math.hypot(xs[i]! - xs[i - 1]!, ys[i]! - ys[i - 1]!);
    }
    return cum;
}

export function decodeFloat32(base64: string) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
        bytes[i] = binary.charCodeAt(i);
    }
    return new Float32Array(bytes.buffer);
}

/** "M x,y L x,y ..." to coordinate arrays. The path is a polyline, so no curve handling is needed. */
export function parsePolyline(d: string) {
    const nums = d.match(/-?\d+(?:\.\d+)?/g);
    if (!nums) {
        throw new Error("track path has no coordinates");
    }

    const count = nums.length / 2;
    const xs = new Float64Array(count);
    const ys = new Float64Array(count);
    for (let i = 0; i < count; i += 1) {
        xs[i] = Number(nums[i * 2]);
        ys[i] = Number(nums[i * 2 + 1]);
    }

    return { xs, ys };
}

export function buildGeometry(data: CircuitData): Geometry {
    const { xs, ys } = parsePolyline(data.pathD);
    return { xs, ys, cum: decodeFloat32(data.cumB64), pxPerM: data.pxPerM, lengthM: data.lengthM };
}

const clamp01 = (t: number) => (t < 0 ? 0 : t > 1 ? 1 : t);

/** Position on the track at parameter t. t is the spine: 0 is the start line. */
export function pointAt(geometry: Geometry, t: number): [number, number] {
    const { xs, ys } = geometry;
    const last = xs.length - 1;
    const pos = clamp01(t) * last;
    const i = Math.floor(pos);
    if (i >= last) {
        return [xs[last]!, ys[last]!];
    }

    const u = pos - i;
    return [xs[i]! + (xs[i + 1]! - xs[i]!) * u, ys[i]! + (ys[i + 1]! - ys[i]!) * u];
}

/** Track direction at t, in radians. Used for tick stems and direction chevrons. */
export function tangentAt(geometry: Geometry, t: number) {
    const { xs, ys } = geometry;
    const last = xs.length - 1;
    const i = Math.min(Math.max(Math.round(clamp01(t) * last), 0), last - 1);
    return Math.atan2(ys[i + 1]! - ys[i]!, xs[i + 1]! - xs[i]!);
}

/**
 * The unit normal at t, pointing to the left of travel in screen coordinates. Everything that sits
 * beside the lap rather than on it (pit lane, buildings, straight labels) is placed along this.
 */
export function normalAt(geometry: Geometry, t: number): [number, number] {
    const angle = tangentAt(geometry, t);
    return [-Math.sin(angle), Math.cos(angle)];
}

/** A point a signed distance out from the lap at t. Negative reaches the other side. */
export function offsetPoint(geometry: Geometry, t: number, offset: number): [number, number] {
    const [x, y] = pointAt(geometry, t);
    const [nx, ny] = normalAt(geometry, t);
    return [x + nx * offset, y + ny * offset];
}

/**
 * A polyline running beside the lap from t0 to t1, `offset` px out. t1 below t0 wraps across the
 * start line, which is how a run sitting either side of it is drawn in one piece.
 *
 * Offsetting a curve tighter than the offset itself folds the copy back through its own path, and
 * the fold prints as a knot. Samples that reverse against the lap are dropped rather than drawn:
 * the outside of a hairpin is simply shorter than the inside, and a shorter line is the truth.
 */
export function offsetPath(geometry: Geometry, t0: number, t1: number, offset: number, steps = 48) {
    const span = t1 >= t0 ? t1 - t0 : 1 - t0 + t1;
    const kept: Point[] = [];
    let lastSource: Point | undefined;
    let lastOffset: Point | undefined;

    for (let i = 0; i <= steps; i += 1) {
        const at = (t0 + (span * i) / steps) % 1;
        const source = pointAt(geometry, at);
        const here = offsetPoint(geometry, at, offset);

        if (lastSource && lastOffset && !advances(lastSource, source, lastOffset, here)) {
            continue;
        }

        kept.push(here);
        lastSource = source;
        lastOffset = here;
    }

    return `M ${kept.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" L ")}`;
}

/** True while the offset copy still travels the way the lap does. A fold reverses it. */
function advances(fromSource: Point, toSource: Point, fromOffset: Point, toOffset: Point) {
    const sx = toSource[0] - fromSource[0];
    const sy = toSource[1] - fromSource[1];
    return sx * (toOffset[0] - fromOffset[0]) + sy * (toOffset[1] - fromOffset[1]) > 0;
}

type Point = [number, number];

/** Arc length in px from the start line at t. Dash maths works in px, so it reads the table directly. */
export function pxAt(geometry: Geometry, t: number) {
    const { cum } = geometry;
    const last = cum.length - 1;
    const pos = clamp01(t) * last;
    const i = Math.floor(pos);
    if (i >= last) {
        return cum[last]!;
    }

    return cum[i]! + (cum[i + 1]! - cum[i]!) * (pos - i);
}

/** Metres from the start line at t. */
export function metresAt(geometry: Geometry, t: number) {
    return pxAt(geometry, t) / geometry.pxPerM;
}

/** Inverse of `metresAt`. Binary search over the cumulative length table. */
export function tAtMetres(geometry: Geometry, metres: number) {
    const { cum, pxPerM, lengthM } = geometry;
    const target = (((metres % lengthM) + lengthM) % lengthM) * pxPerM;

    let lo = 0;
    let hi = cum.length - 1;
    while (hi - lo > 1) {
        const mid = (lo + hi) >> 1;
        if (cum[mid]! <= target) {
            lo = mid;
        } else {
            hi = mid;
        }
    }

    const span = cum[hi]! - cum[lo]!;
    const u = span === 0 ? 0 : (target - cum[lo]!) / span;
    return (lo + u) / (cum.length - 1);
}
