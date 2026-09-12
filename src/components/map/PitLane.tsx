import { memo, useMemo } from "react";
import type { Geometry } from "../../data/geometry.ts";
import { offsetPath, offsetPoint, pointAt } from "../../data/geometry.ts";
import type { CircuitFacts, Copy } from "../../data/types.ts";
import type { MapContext } from "./layout.ts";
import { alongTrack, plateWidth, screenLabel } from "./place.ts";
import { SceneryLabel } from "./Scenery.tsx";
import { LABEL_PX } from "./ticks.ts";

/**
 * Screen-px type inside the two slabs, so a name holds its size the way every other map label does.
 * Set in user space it rode the viewport down past the 12px floor and rule 4 cut it, which is how
 * the garages ended up an unlabelled blue box. What can still fail here is width, not size: a name
 * longer than the slab it names is cut rather than allowed to run out over the drawing.
 */
const BUILDING_PX = 13;
const BLOCK_PX = 15;

export const PIT_IN = "pit-in";
export const PIT_OUT = "pit-out";

/**
 * The pit lane is the main straight offset sideways. It is drawn over the straight alone and tied
 * back to the track by two stubs, because offsetting on through T1 and T2 folds the copy back
 * through itself: those corners turn tighter than the lane is wide, and the fold prints as a knot.
 * The building and the paddock sit further in again, turned to lie along the straight they line.
 */
export const PitLane = memo(function PitLane({ geometry, facts, copy, counter, mapDeg, placed, compact }: Props) {
    const { lane, building, block, entryT, exitT } = facts.pitPaddock;
    const { buildingLabel, buildingLabelShort, paddockLabel, paddockNote } = facts.pitPaddock;

    /* The lane and its two stubs are shaped by the lap alone, but counter and mapDeg change on
     * every resize tick and defeat the memo above, so each would re-walk 48 samples of trig to
     * return the string it just returned. */
    const laneD = useMemo(() => offsetPath(geometry, lane.t0, lane.t1, lane.offsetPx), [geometry, lane]);
    const enter = useMemo(() => merge(geometry, entryT, lane.t0, lane.offsetPx), [geometry, entryT, lane]);
    const leave = useMemo(() => merge(geometry, exitT, lane.t1, lane.offsetPx), [geometry, exitT, lane]);

    const paddock = alongTrack(geometry, block.anchorT, block.offsetPx, mapDeg);
    const garage = alongTrack(geometry, building.anchorT, building.offsetPx, mapDeg);

    const gateIn = placed.get(PIT_IN);
    const gateOut = placed.get(PIT_OUT);
    const fits = (text: string, px: number, slab: number) => !compact && plateWidth(text, px, 6) <= slab / counter;

    /*
     * The garages keep a name on a compact map. "14 GARAGES" at 13 px wants 93 screen px against
     * the 91 the slab has, so the count goes and the word stays on the 12 px floor. Without it the
     * largest object beside the lap is an unlabelled blue box.
     */
    const garagePx = compact ? LABEL_PX : BUILDING_PX;
    const garageText = compact ? buildingLabelShort : buildingLabel;
    const garageFits = plateWidth(garageText, garagePx, 6) <= building.lengthPx / counter;

    return (
        <g className="pit" aria-hidden="true">
            <path className="pit-lane" d={enter} />
            <path className="pit-lane" d={laneD} />
            <path className="pit-lane" d={leave} />

            <g transform={garage.transform}>
                <rect
                    className="pit-building"
                    x={-building.lengthPx / 2}
                    y={-building.widthPx / 2}
                    width={building.lengthPx}
                    height={building.widthPx}
                    rx="4"
                />
                {garageFits && (
                    <text
                        className="pit-building-label"
                        transform={`scale(${counter})`}
                        fontSize={garagePx}
                        dy="0.34em"
                    >
                        {garageText}
                    </text>
                )}
            </g>

            <g transform={paddock.transform}>
                <rect
                    className="pit-block"
                    x={-block.lengthPx / 2}
                    y={-block.widthPx / 2}
                    width={block.lengthPx}
                    height={block.widthPx}
                    rx="4"
                />
                {fits(paddockLabel, BLOCK_PX, block.lengthPx) && (
                    <text
                        className="pit-block-label"
                        transform={`scale(${counter})`}
                        fontSize={BLOCK_PX}
                        dy={fits(paddockNote, LABEL_PX, block.lengthPx) ? "-0.2em" : "0.34em"}
                    >
                        {paddockLabel}
                    </text>
                )}
                {fits(paddockNote, LABEL_PX, block.lengthPx) && (
                    <text className="pit-block-note" transform={`scale(${counter})`} fontSize={LABEL_PX} dy="1.5em">
                        {paddockNote}
                    </text>
                )}
            </g>

            {gateIn && (
                <SceneryLabel
                    kind="pit-gate"
                    text={copy["map.pitIn"] ?? ""}
                    transform={screenLabel(gateIn.x, gateIn.y, counter, mapDeg)}
                />
            )}
            {gateOut && (
                <SceneryLabel
                    kind="pit-gate"
                    text={copy["map.pitOut"] ?? ""}
                    transform={screenLabel(gateOut.x, gateOut.y, counter, mapDeg)}
                />
            )}
        </g>
    );
});

/** The taper between the track and the lane. A merge is a straight run, so it is drawn as one. */
function merge(geometry: Geometry, trackT: number, laneT: number, offset: number) {
    const [ax, ay] = pointAt(geometry, trackT);
    const [bx, by] = offsetPoint(geometry, laneT, offset);
    return `M ${ax.toFixed(1)},${ay.toFixed(1)} L ${bx.toFixed(1)},${by.toFixed(1)}`;
}

interface Props extends MapContext {
    compact: boolean;
    facts: CircuitFacts;
    copy: Copy;
}
