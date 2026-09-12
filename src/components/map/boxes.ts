import { distance, distanceUnit, speedRun } from "../../data/format.ts";
import type { Units } from "../../data/format.ts";
import type { Geometry } from "../../data/geometry.ts";
import { normalAt, pointAt } from "../../data/geometry.ts";
import type { CircuitData, CircuitFacts, Copy, LayerState } from "../../data/types.ts";
import type { LabelBox } from "./layout.ts";
import { PIT_IN, PIT_OUT } from "./PitLane.tsx";
import { plateWidth } from "./place.ts";
import { turnTs } from "./points.ts";
import { SCENERY_H, SCENERY_PAD, START_FINISH, straightId, tunnelId } from "./Scenery.tsx";
import { badgeSpan, LABEL_PX, NOTE_H, noteId, noteWidth, plateId } from "./ticks.ts";

/** Scenery labels share one shape, so the solver treats a tunnel name and a pit gate alike. */
const SCENERY_REACH = 38;

/*
 * How far a label may stand off its anchor, as a multiple of the drawing unit. Offsets are authored
 * in screen px and scaled up as the map shrinks, which keeps a leader the same length to the eye.
 * On a phone that fans the badges past the frame faster than padding can grow to hold them, so the
 * leash is capped: labels crowd closer to the track rather than off the drawing. Above this scale
 * nothing changes, so desktop placement is untouched.
 */
const MAX_LEASH = 2.1;
/** Compact keeps the badges tighter to the track, which buys the lap a smaller gutter to sit in. */
const COMPACT_LEASH = 1.45;

/**
 * Every label the map is about to draw, as one list for the solver. A label that does not enter
 * the contest cannot lose it, so anything with a position arrives here.
 */
export function labelBoxes(data: CircuitData, geometry: Geometry, state: LayerState, options: Options) {
    const { counter, upright, compact, units } = options;
    const leash = Math.min(counter, compact ? COMPACT_LEASH : MAX_LEASH);
    const boxes: LabelBox[] = [];

    /* One line of type stood off the track by its own normal, whichever side the caller asks for. */
    const scenery = (id: string, text: string, t: number, side: number) => {
        const [cx, cy] = pointAt(geometry, t);
        const [nx, ny] = normalAt(geometry, t);
        const reach = SCENERY_REACH * leash * side;
        const box = footprint(plateWidth(text, LABEL_PX, SCENERY_PAD), SCENERY_H, counter, upright);
        return { id, cx, cy, dx: nx * reach, dy: ny * reach, ...box };
    };

    for (const turn of data.turns) {
        const [cx, cy] = pointAt(geometry, turn.t);
        const at = { cx, cy, dx: turn.label.dx * leash, dy: turn.label.dy * leash };
        /*
         * A compact map lets a crowded badge go, in either orientation: T16 and T17 are a few px
         * apart on a phone and cannot both be read, so the earlier corner keeps the spot. Only a
         * collision drops one, never a reach past the frame. The corner itself stays reachable:
         * `TurnTicks` leaves a labelled target on the track wherever a badge went undrawn.
         */
        const span = badgeSpan(compact);
        const box = footprint(span, span, counter, upright);
        boxes.push({ ...at, id: plateId(turn.n), ...box, optional: compact });

        /* A compact map has no room for a second plate per corner, so none is reserved or drawn. */
        const showNotes = state.notes && !compact;
        const note = showNotes ? speedRun(turn.speed.entryKmh, turn.speed.apexKmh, units) : undefined;
        if (note) {
            boxes.push({ ...at, id: noteId(turn.n), ...footprint(noteWidth(note), NOTE_H, counter, upright) });
        }
    }

    if (state.paddock) {
        const { entryT, exitT, lane } = data.facts.pitPaddock;
        // Both gates stand off on the far side from the lane, so neither sits on the pit road.
        const away = -Math.sign(lane.offsetPx);
        /* The lane itself shows where it joins; its two names are labels like any other. */
        boxes.push({ ...scenery(PIT_IN, data.copy["map.pitIn"] ?? "", entryT, away), optional: true });
        boxes.push({ ...scenery(PIT_OUT, data.copy["map.pitOut"] ?? "", exitT, away), optional: true });
    }

    if (state.startfinish) {
        /* The chequer marks the line whether or not its name finds room beside it. */
        boxes.push({ ...scenery(START_FINISH, data.copy["map.startFinish"] ?? "", 0, 1), optional: true });
    }

    /*
     * Portrait keeps the marks and drops the long names. A tunnel name, a straight name and a
     * section name are each wider than a phone can spare beside the lap, and rule 4 cuts a label
     * rather than shrinking it. The gate, the kerb and the lap itself still say where they are.
     */
    if (state.tunnels && !compact) {
        for (const tunnel of data.facts.tunnels) {
            boxes.push({ ...scenery(tunnelId(tunnel.id), tunnel.label, tunnel.t, -1), optional: true });
        }
    }

    if (state.straights && !compact) {
        const tByTurn = turnTs(data.turns);
        for (const straight of data.facts.straights) {
            const mid = midpointT(tByTurn, straight.from, straight.to);
            if (mid === undefined) {
                continue;
            }

            const text = straightText(straight, data.copy, units);
            const box = scenery(straightId(straight.name), text, mid, sideOf(straight));
            boxes.push({ ...box, optional: true });
        }
    }

    return boxes;
}

/** Drawing-unit footprint of a screen-px box. Portrait counter-rotates a label, so its box turns too. */
export function footprint(w: number, h: number, counter: number, upright: boolean) {
    return upright ? { w: h * counter, h: w * counter } : { w: w * counter, h: h * counter };
}

/** A straight is a run between two corners, so its label belongs at the middle of that run. */
export function midpointT(tByTurn: Map<number, number>, from: number, to: number) {
    const start = tByTurn.get(from);
    const finish = tByTurn.get(to);
    if (start === undefined || finish === undefined) {
        return undefined;
    }

    return ((((start + (finish >= start ? finish : finish + 1)) / 2) % 1) + 1) % 1;
}

export function straightText(straight: Straight, copy: Copy, units: Units) {
    const run = `${distance(straight.lengthM, units)} ${distanceUnit(units, copy)}`;
    return `${straight.name}${copy["turn.separator"] ?? " "}${run}`;
}

const sideOf = (straight: Straight) => Math.sign(straight.labelOffsetPx) || 1;

type Straight = CircuitFacts["straights"][number];

interface Options {
    /** Whether the lap is turned a quarter, which turns every label's footprint with it. */
    upright: boolean;
    /** Whether the drawing is too small to carry its long names and its full-size badges. */
    compact: boolean;
    counter: number;
    units: Units;
}
