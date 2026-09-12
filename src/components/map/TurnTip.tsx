import { gradient, speedRun, turnDirection } from "../../data/format.ts";
import type { Units } from "../../data/format.ts";
import type { Copy, Turn } from "../../data/types.ts";
import { plateWidth, screenLabel } from "./place.ts";
import { badgeSpan, LABEL_PX } from "./ticks.ts";

/** Screen-px geometry of the tip plate. The title sits a step above the 12 px floor, the rest on it. */
const TITLE_PX = 13;
const LINE_H = 16;
const PAD_X = 8;
const PAD_Y = 7;
/** Paper between the badge's outer edge and the plate hanging over it. */
const GAP = 6;

/**
 * What a corner says before you commit to opening it: its name, which way it goes, its grade, and
 * the speed run when the projection carries one. It hangs over the badge rather than beside it, so
 * the plate never lands on the corner it describes, and it is drawn last so nothing prints through.
 */
export function TurnTip({ turn, copy, units, at, room, counter, mapDeg, compact }: Props) {
    const title = turn.name ? `${copy["turn.prefix"]} ${turn.n} ${turn.name}` : `${copy["turn.prefix"]} ${turn.n}`;
    const detail = detailLine(turn, copy, units);

    const h = LINE_H * 2 + PAD_Y * 2;
    const clear = badgeSpan(compact) / 2 + GAP;
    const w = Math.max(plateWidth(title, TITLE_PX, PAD_X), plateWidth(detail, LABEL_PX, PAD_X));

    /* The top corners of the lap have no room over them, so the plate drops under the badge there. */
    const above = room.up >= clear + h;
    const dx = slide(w, room);
    const dy = above ? -(clear + h) : clear;

    return (
        <g className="turn-tip" transform={screenLabel(at.x, at.y, counter, mapDeg)} aria-hidden="true">
            <g transform={`translate(${dx} ${dy})`}>
                <rect x={-w / 2} y={0} width={w} height={h} rx="3" />
                <text className="sign" x={0} y={PAD_Y + LINE_H / 2} dy="0.34em" fontSize={TITLE_PX}>
                    {title}
                </text>
                <text className="turn-tip-detail" x={0} y={PAD_Y + LINE_H * 1.5} dy="0.34em" fontSize={LABEL_PX}>
                    {detail}
                </text>
            </g>
        </g>
    );
}

/**
 * The plate centres on its corner until that would put it past the edge of the frame, then it
 * slides in far enough to fit. A corner near a corner of the map has room on one side only.
 */
export function slide(w: number, room: Room) {
    const atMost = room.right - w / 2;
    const atLeast = w / 2 - room.left;
    return Math.max(Math.min(0, atMost), atLeast);
}

function detailLine(turn: Turn, copy: Copy, units: Units) {
    const direction = turnDirection(turn.dir, copy);
    const run = speedRun(turn.speed.entryKmh, turn.speed.apexKmh, units);
    /* Only four corners carry a projected speed and five an angle, so the grade is what every
     * corner can always say beyond which way it goes. */
    const parts = [direction, turn.angleDeg === null ? undefined : `${turn.angleDeg}°`, gradient(turn.gradePct), run];

    return parts.filter(Boolean).join(copy["turn.separator"]);
}

interface Props {
    compact: boolean;
    counter: number;
    mapDeg: number;
    units: Units;
    copy: Copy;
    turn: Turn;
    at: { x: number; y: number };
    room: Room;
}

/** Screen px between the anchor and each edge of the frame it has to stay inside. */
export interface Room {
    up: number;
    left: number;
    right: number;
}
