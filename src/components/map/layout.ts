import type { Geometry } from "../../data/geometry.ts";

export interface LabelBox {
    id: string;
    /** The point the label belongs to, in drawing units. */
    cx: number;
    cy: number;
    /** Where content wants the label, relative to that point, already in drawing units. */
    dx: number;
    dy: number;
    w: number;
    h: number;
    /** Cut this label rather than print it over another. Only ever true for decoration. */
    optional?: boolean;
}

export interface Spot {
    x: number;
    y: number;
}

/** What every piece of map furniture needs to place itself: where the lap is, and how it is drawn. */
export interface MapContext {
    geometry: Geometry;
    counter: number;
    mapDeg: number;
    placed: Map<string, Spot>;
}

/** How far one nudge moves a label, as a fraction of its own leader. */
const STEP = 0.3;
const MAX_STEPS = 10;
const GAP = 2;
/** One unit past the frame edge costs more than overlapping a neighbour by a unit of area. */
const SPILL_COST = 400;

/**
 * Label placement for the whole map at once, because whether two labels collide is not a question
 * either of them can answer alone. Every label starts where content asks for it and is pushed
 * straight out along its own leader, so a label that moves still points at the thing it names.
 *
 * The given order decides who wins a contest, which makes the result stable: the same map draws the
 * same way every time, and an earlier label never shifts because a later one arrived.
 *
 * Where the map is too crowded for any clear spot, what happens next depends on what the label is.
 * A corner number keeps its least-overlapped try, because two overlapping numbers read badly but a
 * missing number reads wrong. A label marked `optional` is dropped instead: rule 4 of this project
 * cuts a label rather than shrinking it, and a section name is decoration that can afford to go.
 */
export function placeLabels(boxes: LabelBox[], bounds?: Rect) {
    const placed = new Map<string, Spot>();
    const taken: Rect[] = [];

    for (const box of boxes) {
        /*
         * An anchor that has left the frame is off the map, and no label can stand for it: parking
         * one past the edge prints over the page through the svg's visible overflow. Spilling from
         * an anchor still inside stays a nudge. Only the sheet's pan can carry an anchor out.
         */
        if (bounds && !contains(bounds, box.cx, box.cy)) {
            continue;
        }

        const reach = Math.hypot(box.dx, box.dy) || 1;
        const ux = box.dx / reach;
        const uy = box.dy / reach;

        let best: Rect | undefined;
        let worst = Infinity;
        let clash = Infinity;

        for (let step = 0; step <= MAX_STEPS; step += 1) {
            const out = step * STEP * reach;
            const rect = around(box.cx + box.dx + ux * out, box.cy + box.dy + uy * out, box.w, box.h);
            const hit = taken.reduce((sum, other) => sum + overlap(rect, other), 0);
            const cost = hit + (bounds ? outside(rect, bounds) : 0);

            if (cost < worst) {
                worst = cost;
                clash = hit;
                best = rect;
            }

            if (cost === 0) {
                break;
            }
        }

        /*
         * Only a collision with another label is worth dropping a label over. Reaching past the
         * frame is a nudge, not a verdict: a tight gutter leaves the outermost corners slightly
         * proud of the drawing, and cutting them for that lost six of the twenty-two on a phone.
         */
        if (clash > 0 && box.optional) {
            continue;
        }

        const room = best!;
        placed.set(box.id, { x: (room.x0 + room.x1) / 2, y: (room.y0 + room.y1) / 2 });
        taken.push(room);
    }

    return placed;
}

const around = (x: number, y: number, w: number, h: number): Rect => {
    return { x0: x - w / 2, y0: y - h / 2, x1: x + w / 2, y1: y + h / 2 };
};

/** Whether a point sits inside the frame. The solver and the ticks read the same answer. */
export function contains(bounds: Rect, x: number, y: number) {
    return x >= bounds.x0 && x <= bounds.x1 && y >= bounds.y0 && y <= bounds.y1;
}

/**
 * How far a label reaches past the drawing's own edge, weighted heavily: a label outside the frame
 * is clipped by the viewport and reads as a bug, which is worse than sitting near another label.
 */
function outside(rect: Rect, bounds: Rect) {
    const over =
        Math.max(0, bounds.x0 - rect.x0) +
        Math.max(0, rect.x1 - bounds.x1) +
        Math.max(0, bounds.y0 - rect.y0) +
        Math.max(0, rect.y1 - bounds.y1);
    return over * SPILL_COST;
}

/** Area the two share, counting a hair of clearance as contact. Zero means the label is clear. */
function overlap(a: Rect, b: Rect) {
    const wide = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0) + GAP;
    const tall = Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0) + GAP;
    return wide > 0 && tall > 0 ? wide * tall : 0;
}

export interface Rect {
    x0: number;
    y0: number;
    x1: number;
    y1: number;
}
