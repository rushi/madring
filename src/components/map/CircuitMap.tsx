import { memo, useCallback, useMemo, useRef, useState } from "react";
import type { Units } from "../../data/format.ts";
import { buildGeometry } from "../../data/geometry.ts";
import type { CircuitData, LayerState } from "../../data/types.ts";
import { fitLap, useSvgBox } from "../../hooks/useSvgScale.ts";
import { litHighlights, segmentsFor } from "../../layers/resolve.ts";
import { labelBoxes } from "./boxes.ts";
import { HighlightGlow, HighlightRuns } from "./HighlightRuns.tsx";
import { placeLabels } from "./layout.ts";
import { PitLane } from "./PitLane.tsx";
import { mapDegrees, screenPoint } from "./place.ts";
import { turnPoints } from "./points.ts";
import { DotGrid, SectionLabels, StartFinish, StraightLabels, TunnelGates } from "./Scenery.tsx";
import { plateId } from "./ticks.ts";
import { TrackLine } from "./TrackLine.tsx";
import { TurnTicks } from "./TurnTicks.tsx";
import { TurnTip } from "./TurnTip.tsx";
import type { Room } from "./TurnTip.tsx";

export const CircuitMap = memo(function CircuitMap({ data, state, units, selected, kin, onSelect }: Props) {
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
    const viewBox = `${cx - frameW / 2} ${cy - frameH / 2} ${frameW} ${frameH}`;

    const geometry = useMemo(() => buildGeometry(data), [data]);
    const points = useMemo(() => turnPoints(geometry, turns), [geometry, turns]);
    const lit = useMemo(() => litHighlights(data, state), [data, state]);
    const flooded = useMemo(() => lit.map((layer) => ({ layer, segments: segmentsFor(data, layer) })), [data, lit]);
    const labels = useMemo(() => ({ names: !!state.names, notes: !!state.notes, tags: !!state.tags }), [state]);

    const counter = 1 / scale;
    const mapDeg = mapDegrees(upright);

    /*
     * One solve for the whole map. A label that places itself cannot lose a contest it never
     * entered, which is how "PIT OUT" ended up printing under turn 3's plate.
     */
    /* Upright turns the frame with the drawing, so the visible rect swaps its sides too. */
    const halfW = (upright ? frameH : frameW) / 2;
    const halfH = (upright ? frameW : frameH) / 2;
    const bounds = useMemo(() => {
        return { x0: cx - halfW, y0: cy - halfH, x1: cx + halfW, y1: cy + halfH };
    }, [cx, cy, halfW, halfH]);

    const placed = useMemo(() => {
        return placeLabels(labelBoxes(data, geometry, state, { counter, upright, compact, units }), bounds);
    }, [data, geometry, state, counter, upright, compact, units, bounds]);
    const title = `${copy["map.label"]}. ${copy["site.question"]}`;

    const onHover = useCallback((turn?: number) => setHovered(turn), []);
    const tipTurn = turns.find((candidate) => candidate.n === hovered);
    const tipAt = hovered === undefined ? undefined : (placed.get(plateId(hovered)) ?? points.get(hovered));
    const room = tipAt && tipRoom(tipAt, { cx, cy, frameW, frameH, mapDeg, scale });

    /*
     * No role="img" here. It would flatten the subtree and hide the turn plates, which are the
     * only way to select a turn. A <title> names the drawing without collapsing what is inside it.
     */
    return (
        <svg ref={svg} viewBox={viewBox} className="map">
            <title>{title}</title>
            <g transform={upright ? `rotate(90 ${cx} ${cy})` : undefined}>
                {state.grid && <DotGrid bbox={bbox} pitch={Number(data.layout.gridDotPx)} pad={gutter * counter} />}
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
                <HighlightRuns pathD={pathD} totalPx={totalPx} geometry={geometry} lit={flooded} />

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
    const { cx, cy, frameW, frameH, mapDeg, scale } = frame;
    const { x, y } = screenPoint(at.x, at.y, cx, cy, mapDeg);

    return {
        up: (y - (cy - frameH / 2)) * scale,
        left: (x - (cx - frameW / 2)) * scale,
        right: (cx + frameW / 2 - x) * scale,
    };
}

export interface Frame {
    cx: number;
    cy: number;
    scale: number;
    mapDeg: number;
    frameW: number;
    frameH: number;
}

interface Props {
    data: CircuitData;
    state: LayerState;
    units: Units;
    selected?: number;
    /** The other corners of the selected corner's named sequence. */
    kin: Set<number>;
    onSelect: (turn: number) => void;
}
