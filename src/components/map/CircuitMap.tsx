import { memo, useCallback, useMemo, useRef, useState } from "react";
import type { Units } from "../../data/format.ts";
import { buildGeometry } from "../../data/geometry.ts";
import type { CircuitData, LayerState } from "../../data/types.ts";
import { fitLap, useSvgBox } from "../../hooks/useSvgScale.ts";
import type { Box } from "../../hooks/useSvgScale.ts";
import { litHighlights, segmentsFor } from "../../layers/resolve.ts";
import { labelBoxes } from "./boxes.ts";
import { HighlightGlow, HighlightRuns } from "./HighlightRuns.tsx";
import { placeLabels } from "./layout.ts";
import { PitLane } from "./PitLane.tsx";
import { mapDegrees, screenPoint } from "./place.ts";
import { turnPoints } from "./points.ts";
import { DotGrid, SectionLabels, StartFinish, StraightLabels, TunnelGates } from "./Scenery.tsx";
import { LABEL_PX, plateId } from "./ticks.ts";
import { TrackLine } from "./TrackLine.tsx";
import { TurnTicks } from "./TurnTicks.tsx";
import { TurnTip } from "./TurnTip.tsx";
import type { Room } from "./TurnTip.tsx";

export const CircuitMap = memo(function CircuitMap(props: Props) {
    const { data, state, units, selected, kin, reservePx = 0, focusTurn, onSelect } = props;
    const svg = useRef<SVGSVGElement>(null);
    /* Pointer state, not page state: it is never shared, never linked, and never survives a leave. */
    const [hovered, setHovered] = useState<number>();
    const { bbox, pathD, totalPx, turns, copy, facts } = data;
    const cx = bbox.x + bbox.w / 2;
    const cy = bbox.y + bbox.h / 2;

    const box = useSvgBox(svg);
    /*
     * Compact is about room, not orientation. A phone on its side is as short as it is narrow when
     * upright, so the smaller side decides: either way there is no space for full-size badges and
     * long names. It also buys back the gutter, which is a quarter of a phone's width at desktop
     * size; the solver keeps labels inside the frame now, so a tight gutter crowds rather than clips.
     */
    const shortSide = box.width > 0 ? Math.min(box.width, box.height) : Number.POSITIVE_INFINITY;
    const compact = shortSide < Number(data.layout.compactPx);
    const gutter = Number(compact ? data.layout.compactGutterPx : data.layout.mapGutterPx);

    const { scale, upright, w: frameW, h: frameH } = fitLap(box, bbox.w, bbox.h, gutter);

    const geometry = useMemo(() => buildGeometry(data), [data]);
    const points = useMemo(() => turnPoints(geometry, turns), [geometry, turns]);
    const lit = useMemo(() => litHighlights(data, state), [data, state]);
    const flooded = useMemo(() => lit.map((layer) => ({ layer, segments: segmentsFor(data, layer) })), [data, lit]);
    const labels = useMemo(() => ({ names: !!state.names, notes: !!state.notes, tags: !!state.tags }), [state]);

    const counter = 1 / scale;
    const mapDeg = mapDegrees(upright);

    const focus = focusTurn !== undefined ? points.get(focusTurn) : undefined;
    const framing = { cx, cy, box, bbox, scale, focus, mapDeg, upright, frameW, frameH, reservePx };
    const { x: ox, y: oy } = frameOrigin(framing);
    const viewBox = `${ox} ${oy} ${frameW} ${frameH}`;

    /* How far the pan took the frame from centred: drives the clip flag and the grid's extra pad. */
    const shiftY = oy - (cy - frameH / 2);
    const shifted = shiftY !== 0;

    /* Upright turns the frame with the drawing, so the visible rect swaps its sides too. */
    const halfW = (upright ? frameH : frameW) / 2;
    const halfH = (upright ? frameW : frameH) / 2;
    const bounds = useMemo(() => {
        const centre = screenPoint(ox + frameW / 2, oy + frameH / 2, cx, cy, -mapDeg);
        return { x0: centre.x - halfW, y0: centre.y - halfH, x1: centre.x + halfW, y1: centre.y + halfH };
    }, [ox, oy, frameW, frameH, cx, cy, mapDeg, halfW, halfH]);

    /*
     * One solve for the whole map. A label that places itself cannot lose a contest it never
     * entered, which is how "PIT OUT" ended up printing under turn 3's plate.
     */
    const placed = useMemo(() => {
        return placeLabels(labelBoxes(data, geometry, state, { counter, upright, compact, units }), bounds);
    }, [data, geometry, state, counter, upright, compact, units, bounds]);
    const title = `${copy["map.label"]}. ${copy["site.question"]}`;

    const onHover = useCallback((turn?: number) => setHovered(turn), []);
    const tipTurn = turns.find((candidate) => candidate.n === hovered);
    const tipAt = hovered === undefined ? undefined : (placed.get(plateId(hovered)) ?? points.get(hovered));
    const room = tipAt && tipRoom(tipAt, { cx, cy, ox, oy, frameW, frameH, mapDeg, scale });

    /*
     * No role="img" here. It would flatten the subtree and hide the turn plates, which are the
     * only way to select a turn. A <title> names the drawing without collapsing what is inside it.
     * Shifted for the sheet, the svg clips: labels the pan carried off the map must not print
     * over the masthead through the visible overflow.
     */
    return (
        <svg ref={svg} viewBox={viewBox} data-shifted={shifted || undefined} className="map">
            <title>{title}</title>
            <g transform={upright ? `rotate(90 ${cx} ${cy})` : undefined}>
                {state.grid && (
                    <DotGrid bbox={bbox} pitch={Number(data.layout.gridDotPx)} pad={gutter * counter + shiftY} />
                )}
                {state.sections && <SectionLabels compact={compact} facts={facts} counter={counter} mapDeg={mapDeg} />}
                {state.paddock && (
                    <PitLane
                        compact={compact}
                        geometry={geometry}
                        facts={facts}
                        copy={copy}
                        counter={counter}
                        mapDeg={mapDeg}
                        placed={placed}
                    />
                )}

                <HighlightGlow pathD={pathD} totalPx={totalPx} geometry={geometry} lit={flooded} />
                <TrackLine pathD={pathD} />
                <HighlightRuns pathD={pathD} totalPx={totalPx} geometry={geometry} counter={counter} lit={flooded} />

                {state.straights && (
                    <StraightLabels
                        geometry={geometry}
                        facts={facts}
                        turns={turns}
                        units={units}
                        copy={copy}
                        counter={counter}
                        mapDeg={mapDeg}
                        placed={placed}
                    />
                )}
                {state.startfinish && (
                    <StartFinish geometry={geometry} copy={copy} counter={counter} mapDeg={mapDeg} placed={placed} />
                )}
                {state.tunnels && (
                    <TunnelGates geometry={geometry} facts={facts} counter={counter} mapDeg={mapDeg} placed={placed} />
                )}

                <TurnTicks
                    compact={compact}
                    mapDeg={mapDeg}
                    copy={copy}
                    points={points}
                    turns={turns}
                    lit={lit}
                    labels={labels}
                    units={units}
                    scale={scale}
                    placed={placed}
                    selected={selected}
                    kin={kin}
                    bounds={bounds}
                    onSelect={onSelect}
                    onHover={onHover}
                />

                {tipTurn && tipAt && room && (
                    <TurnTip
                        compact={compact}
                        counter={counter}
                        mapDeg={mapDeg}
                        units={units}
                        copy={copy}
                        turn={tipTurn}
                        at={tipAt}
                        room={room}
                    />
                )}
            </g>
        </svg>
    );
});

/**
 * The plate is sized in screen px around a point the whole plan may have been turned a quarter to
 * place, so the room around it is measured after that turn rather than in the drawing's own axes.
 */
export function tipRoom(at: { x: number; y: number }, frame: Frame): Room {
    const { cx, cy, ox, oy, frameW, mapDeg, scale } = frame;
    const { x, y } = screenPoint(at.x, at.y, cx, cy, mapDeg);

    return {
        up: (y - oy) * scale,
        left: (x - ox) * scale,
        right: (ox + frameW - x) * scale,
    };
}

/** Share of the frame the lap keeps however far the sheet pushes it: it never slides off stage. */
const LAP_KEEP = 0.5;
/** Where the pan puts the corner: under the visible band's middle, so its badge stays close. */
const FOLD_TARGET = 0.45;
/** Headroom above the fold that still reads as covered: nearly hidden counts as hidden. */
const FOLD_MARGIN = LABEL_PX * 2;

/**
 * Where the frame's top-left corner sits, in the frame's own post-turn drawing units. Centered on
 * the lap until the sheet covers the corner it describes: then the frame slides, not the lap, and
 * the corner lands just above the sheet's edge. The solver's bounds share this origin, so labels
 * keep placing for exactly what is on screen.
 */
function frameOrigin(args: OriginArgs) {
    const { box, scale, upright, mapDeg, frameW, frameH, cx, cy, bbox, focus, reservePx } = args;
    const ox = cx - frameW / 2;
    const oy = cy - frameH / 2;
    if (!focus || box.width <= 0 || reservePx <= 0) {
        return { x: ox, y: oy };
    }

    /* `meet` letterboxes the frame inside the box on the axis the fit did not bind. */
    const lift = (box.height - frameH * scale) / 2;
    const fold = box.height - reservePx;
    const at = screenPoint(focus.x, focus.y, cx, cy, mapDeg);
    const screenY = lift + (at.y - oy) * scale;
    if (screenY <= fold - FOLD_MARGIN) {
        return { x: ox, y: oy };
    }

    /* The quarter turn lays the lap on its side, so its frame-space height is the drawing's width. */
    const lapTop = upright ? cy - bbox.w / 2 : bbox.y;
    const lapBottom = upright ? cy + bbox.w / 2 : bbox.y + bbox.h;
    const min = lapTop - frameH * (1 - LAP_KEEP);
    const max = lapBottom - frameH * LAP_KEEP;
    const y = Math.min(Math.max(at.y - (fold * FOLD_TARGET - lift) / scale, min), max);

    return { x: ox, y };
}

export interface Frame {
    cx: number;
    cy: number;
    ox: number;
    oy: number;
    scale: number;
    mapDeg: number;
    frameW: number;
    frameH: number;
}

interface OriginArgs {
    cx: number;
    cy: number;
    box: Box;
    scale: number;
    mapDeg: number;
    frameW: number;
    frameH: number;
    bbox: { x: number; y: number; w: number; h: number };
    upright: boolean;
    reservePx: number;
    focus?: { x: number; y: number };
}

interface Props {
    data: CircuitData;
    state: LayerState;
    units: Units;
    selected?: number;
    /** The other corners of the selected corner's named sequence. */
    kin: Set<number>;
    /** Screen px the sheet reserves at the frame's bottom edge. Zero keeps the lap centred. */
    reservePx?: number;
    /** The corner the sheet describes; the frame slides to keep it above the fold. */
    focusTurn?: number;
    onSelect: (turn: number) => void;
}
