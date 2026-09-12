import { memo, useMemo } from "react";
import type { CSSProperties } from "react";
import { speedRun, turnDirection } from "../../data/format.ts";
import type { Units } from "../../data/format.ts";
import type { Copy, Layer, Turn } from "../../data/types.ts";
import { highlightsAtTurn } from "../../layers/resolve.ts";
import { contains } from "./layout.ts";
import type { Rect, Spot } from "./layout.ts";
import { dyeVar, screenLabel } from "./place.ts";
import type { TurnPoint } from "./points.ts";
import { badgeRing, LABEL_PX, NOTE_H, noteId, noteWidth, plateId, TAG_OFFSET, TAG_R } from "./ticks.ts";

/** Paper between one claim's arc and the next, so two dyes never touch on the ring. */
const RING_GAP = 2.5;

/** Screen-px radius of a corner's tap target, badge or no badge. Comfortably past the 44px floor. */
const HIT_R = 22;

/* The aureole a claimed badge carries, in the badge's own screen-px space: wider than the ring and
 * blurred, so a lit corner reads from across the map the way its run on the road does. */
const HALO_EXTRA = 4;
const HALO_BLUR = 2.5;

/** Shared empty claims, so an unclaimed corner keeps one stable reference across renders. */
const EMPTY: Layer[] = [];

export interface TickLabels {
    notes: boolean;
    tags: boolean;
}

/**
 * Station badges. A badge is sized in screen px, so its numeral holds its size at any viewport.
 * The ring carries whichever highlight claims the corner and the face never changes, so the map
 * reads as one set of stations wearing marks rather than several competing families of dot.
 *
 * Memoised as a whole, not only per tick: hover now lives in the parent, so a pointer crossing the
 * map re-renders it on every badge, and an unmemoised body rebuilds all 22 elements each time.
 */
export const TurnTicks = memo(function TurnTicks(props: Props) {
    const { mapDeg, scale, compact, copy, units, labels } = props;
    const { points, turns, lit, placed, selected, kin, bounds, onSelect, onHover } = props;
    const counter = 1 / scale;

    /* One array per turn, rebuilt only when the lit layers change. Built inline, it was a new
     * reference every render, which failed `Tick`'s shallow compare and re-rendered all 22. */
    const claimsByTurn = useMemo(() => {
        return new Map(turns.map((turn) => [turn.n, highlightsAtTurn(lit, turn)]));
    }, [lit, turns]);

    return (
        <g className="ticks">
            <defs>
                <filter id="badge-halo" x="-60%" y="-60%" width="220%" height="220%">
                    <feGaussianBlur stdDeviation={HALO_BLUR} />
                </filter>
            </defs>
            {turns.map((turn) => (
                <Tick
                    key={turn.n}
                    tag={labels.tags && !compact}
                    compact={compact}
                    selected={selected === turn.n}
                    kin={kin.has(turn.n)}
                    mapDeg={mapDeg}
                    counter={counter}
                    claims={claimsByTurn.get(turn.n) ?? EMPTY}
                    copy={copy}
                    turn={turn}
                    point={points.get(turn.n)}
                    badge={placed.get(plateId(turn.n))}
                    note={noteFor(turn, labels, units)}
                    notePlate={placed.get(noteId(turn.n))}
                    inFrame={!bounds || inRect(points.get(turn.n), bounds)}
                    onSelect={onSelect}
                    onHover={onHover}
                />
            ))}
        </g>
    );
});

/** Memoised per turn: selecting one badge must not re-render the other 21. */
const Tick = memo(function Tick(props: TickProps) {
    const { tag, selected, kin, compact, mapDeg, counter } = props;
    const { claims, copy, turn, point, badge, note, notePlate, inFrame, onSelect, onHover } = props;
    if (!point) {
        return null;
    }

    const { x, y } = point;
    const pick = (event: { key?: string; preventDefault: () => void }) => {
        if (!event.key || event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onSelect(turn.n);
        }
    };

    /* A finger's "hover" is the tap that already opened the corner, so the tip is for mice only. */
    const enter = (event: { pointerType: string }) => {
        if (event.pointerType === "mouse") {
            onHover(turn.n);
        }
    };
    const leave = () => onHover(undefined);

    /*
     * A corner whose badge lost its spot on a crowded map still has to be reachable: the badges are
     * the only route to corner data, so cutting one silently would put that corner out of reach of
     * a keyboard entirely. It keeps a target on the corner itself, invisible until focused.
     * Off the frame there is no corner to point at, so it keeps nothing.
     */
    if (!badge) {
        if (inFrame === false) {
            return null;
        }

        return (
            <g className={tickClass(selected, kin)}>
                <circle
                    role="button"
                    tabIndex={0}
                    aria-label={badgeLabel(turn, copy)}
                    aria-current={selected}
                    data-turn={turn.n}
                    className="tick-hit"
                    cx={x}
                    cy={y}
                    r={HIT_R * counter}
                    onClick={pick}
                    onKeyDown={pick}
                    onPointerEnter={enter}
                    onPointerLeave={leave}
                />
            </g>
        );
    }

    const claimed = claims[0];
    /* Solved once for the pair: the halo is the ring's blurred twin and has to trace the same arcs. */
    const arcs = ringArcs(claims, compact);
    /* The dye rides a custom property: a presentation attribute would lose to the stylesheet. */
    const ring = badgeRing(compact);
    const dye = claimed ? ({ "--dye": dyeVar(claimed.livery) } as CSSProperties) : undefined;

    return (
        <g className={tickClass(selected, kin)} style={dye} data-compact={compact} data-marked={Boolean(claimed)}>
            <line className="tick-stem" x1={x} y1={y} x2={badge.x} y2={badge.y} />
            {note && notePlate && <line className="tick-stem" x1={x} y1={y} x2={notePlate.x} y2={notePlate.y} />}

            <g
                role="button"
                tabIndex={0}
                aria-label={badgeLabel(turn, copy)}
                aria-current={selected}
                data-turn={turn.n}
                transform={screenLabel(badge.x, badge.y, counter, mapDeg)}
                className="tick-badge"
                onClick={pick}
                onKeyDown={pick}
                onPointerEnter={enter}
                onPointerLeave={leave}
            >
                {/* The finger's target is wider than the badge it carries. First child, so the
                 * ring and numeral paint over it; a transparent fill still takes the pointer. */}
                <circle className="badge-hit" r={HIT_R} />
                {arcs.length > 0 && <Halo compact={compact} arcs={arcs} />}
                <Ring compact={compact} arcs={arcs} />
                <circle className="badge-face" r={ring.face} />
                <text className="badge-numeral" dy="0.34em">
                    {turn.n}
                </text>
                {tag && <Tag dir={turn.dir} />}
            </g>

            {note && notePlate && (
                <g className="tick-note" transform={screenLabel(notePlate.x, notePlate.y, counter, mapDeg)}>
                    <rect x={-noteWidth(note) / 2} y={-NOTE_H / 2} width={noteWidth(note)} height={NOTE_H} rx="2" />
                    <text dy="0.34em" fontSize={LABEL_PX}>
                        {note}
                    </text>
                </g>
            )}
        </g>
    );
});

type RingArc = ReturnType<typeof ringArcs>[number];

/** One arc per claiming highlight. The ring and its halo share this math, so the two never drift. */
function ringArcs(claims: Layer[], compact: boolean) {
    const { mid, circumference } = badgeRing(compact);
    const share = circumference / claims.length;
    const gap = claims.length > 1 ? RING_GAP : 0;

    return claims.map((layer, index) => ({
        layer,
        r: mid,
        strokeDashoffset: -index * share,
        strokeDasharray: `${share - gap} ${circumference - share + gap}`,
    }));
}

/**
 * One arc per highlight that claims the corner. T17 is an overtaking zone AND a crash-prone
 * corner; a single-colour ring had to pick one and drop the other silently. Claimed by nobody,
 * the ring closes into one quiet circle and the stylesheet's fallback colours it.
 */
function Ring({ compact, arcs }: { compact: boolean; arcs: RingArc[] }) {
    const { mid, weight } = badgeRing(compact);
    if (!arcs.length) {
        return <circle className="badge-ring" r={mid} strokeWidth={weight} />;
    }

    return (
        <>
            {arcs.map(({ layer, ...arc }) => (
                <circle
                    key={layer.id}
                    className="badge-ring"
                    stroke={dyeVar(layer.livery)}
                    strokeWidth={weight}
                    {...arc}
                />
            ))}
        </>
    );
}

/** The ring's blurred twin, painted under it, so a claimed corner reads from across the map. */
function Halo({ compact, arcs }: { compact: boolean; arcs: RingArc[] }) {
    const { weight } = badgeRing(compact);

    return (
        <>
            {arcs.map(({ layer, ...arc }) => (
                <circle
                    key={layer.id}
                    className="badge-halo"
                    stroke={dyeVar(layer.livery)}
                    strokeWidth={weight + HALO_EXTRA * 2}
                    {...arc}
                />
            ))}
        </>
    );
}

/** Which way the corner goes, riding the badge's shoulder rather than standing beside it as a second box. */
function Tag({ dir }: { dir: string }) {
    return (
        <g className="badge-tag" transform={`translate(${TAG_OFFSET} ${-TAG_OFFSET})`}>
            <circle r={TAG_R} />
            <text dy="0.34em">{dir}</text>
        </g>
    );
}

function noteFor(turn: Turn, labels: TickLabels, units: Units) {
    if (!labels.notes) {
        return undefined;
    }

    return speedRun(turn.speed.entryKmh, turn.speed.apexKmh, units);
}

function badgeLabel(turn: Turn, copy: Copy) {
    const direction = turnDirection(turn.dir, copy);
    const prefix = `${copy["turn.prefix"]} ${turn.n}`;
    return turn.name ? `${prefix}, ${turn.name}, ${direction}` : `${prefix}, ${direction}`;
}

/** Whether the corner's point sits inside the visible frame. Undefined point reads as outside. */
const inRect = (point: TurnPoint | undefined, bounds: Rect) => !!point && contains(bounds, point.x, point.y);

/** Selected is the corner you asked for; kin are the rest of the sequence it belongs to. */
function tickClass(selected: boolean, kin: boolean) {
    if (selected) {
        return "tick is-selected";
    }

    return kin ? "tick is-kin" : "tick";
}

interface TickProps {
    tag: boolean;
    compact: boolean;
    selected: boolean;
    kin: boolean;
    mapDeg: number;
    counter: number;
    claims: Layer[];
    copy: Copy;
    turn: Turn;
    point?: TurnPoint;
    badge?: Spot;
    note?: string;
    notePlate?: Spot;
    /** False when the sheet's pan carried this corner off the map. */
    inFrame?: boolean;
    onSelect: (turn: number) => void;
    onHover: (turn?: number) => void;
}

interface Props {
    compact: boolean;
    mapDeg: number;
    copy: Copy;
    placed: Map<string, Spot>;
    points: Map<number, TurnPoint>;
    turns: Turn[];
    lit: Layer[];
    labels: TickLabels;
    units: Units;
    scale: number;
    selected?: number;
    kin: Set<number>;
    /** The visible frame in drawing units; an off-frame corner renders no fallback target. */
    bounds?: Rect;
    onSelect: (turn: number) => void;
    onHover: (turn?: number) => void;
}
