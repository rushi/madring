import type { Geometry } from "../../data/geometry.ts";
import { pointAt, tangentAt } from "../../data/geometry.ts";
import type { Turn } from "../../data/types.ts";

export interface TurnPoint {
    x: number;
    y: number;
    /** Track direction at the turn, radians. Tick stems run perpendicular to it. */
    angle: number;
}

/** Where each turn sits along the lap, for anything that needs a run between two of them. */
export function turnTs(turns: Turn[]) {
    return new Map(turns.map((turn) => [turn.n, turn.t]));
}

/** Position and heading for every turn, resolved once so no component re-derives them. */
export function turnPoints(geometry: Geometry, turns: Turn[]) {
    return new Map<number, TurnPoint>(
        turns.map((turn) => {
            const [x, y] = pointAt(geometry, turn.t);
            return [turn.n, { x, y, angle: tangentAt(geometry, turn.t) }];
        }),
    );
}
