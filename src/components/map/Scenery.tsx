import { memo } from "react";
import type { Units } from "../../data/format.ts";
import type { CircuitFacts, Copy, Turn } from "../../data/types.ts";
import { midpointT, straightText } from "./boxes.ts";
import type { MapContext } from "./layout.ts";
import { alongTrack, facingTravel, plateWidth, screenLabel } from "./place.ts";
import { turnTs } from "./points.ts";
import { LABEL_PX } from "./ticks.ts";

/** The shape of a one-line scenery plate in screen px. The solver reserves this same box. */
export const SCENERY_H = 17;
export const SCENERY_PAD = 4;
const GATE_W = 54;
const GATE_H = 40;
/** One per side of the lap: two marks say which way round it goes, and a row of them just clutters. */
const CHEVRONS = 2;
const CHEVRON = "M -7,-9 L 5,0 L -7,9";

/**
 * A name on the drawing, on paper of its own. Rule 4: bare type over the asphalt and the pit lane
 * is unreadable at 12 px, and on a compact map the leash is short enough to land it there.
 */
export function SceneryLabel({ kind, text, transform }: LabelProps) {
    const w = plateWidth(text, LABEL_PX, SCENERY_PAD);

    return (
        <g className="scenery-label" transform={transform}>
            <rect x={-w / 2} y={-SCENERY_H / 2} width={w} height={SCENERY_H} rx="2" />
            <text className={kind} dy="0.34em">
                {text}
            </text>
        </g>
    );
}

export const START_FINISH = "start-finish";
export const tunnelId = (id: number) => `tunnel-${id}`;
export const straightId = (name: string) => `straight-${name}`;

/**
 * Survey dots behind everything. The map is a plan, and a plan sits on a grid; the dots give the
 * lap somewhere to sit rather than float, and go away for anyone who finds them noise.
 */
export const DotGrid = memo(function DotGrid({ bbox, pitch, pad }: GridProps) {
    const x0 = Math.floor((bbox.x - pad) / pitch) * pitch;
    const y0 = Math.floor((bbox.y - pad) / pitch) * pitch;
    const columns = Math.ceil((bbox.w + pad * 2) / pitch) + 1;
    const rows = Math.ceil((bbox.h + pad * 2) / pitch) + 1;

    const dots = Array.from({ length: columns * rows }, (_, i) => {
        const x = x0 + (i % columns) * pitch;
        const y = y0 + Math.floor(i / columns) * pitch;
        return `M ${x},${y} h 0.01`;
    });

    return <path className="grid-dots" d={dots.join(" ")} aria-hidden="true" />;
});

/** Where the lap goes underground. The gate straddles the track; its name sits clear of it. */
export const TunnelGates = memo(function TunnelGates({ geometry, facts, counter, mapDeg, placed }: TunnelProps) {
    return (
        <g className="tunnels" aria-hidden="true">
            {facts.tunnels.map((tunnel) => {
                const gate = alongTrack(geometry, tunnel.t, 0, mapDeg);
                const spot = placed.get(tunnelId(tunnel.id));

                return (
                    <g key={tunnel.id}>
                        <g transform={gate.transform}>
                            <rect
                                className="tunnel-gate"
                                x={-GATE_W / 2}
                                y={-GATE_H / 2}
                                width={GATE_W}
                                height={GATE_H}
                                rx="5"
                            />
                        </g>
                        {spot && (
                            <SceneryLabel
                                kind="tunnel-label"
                                text={tunnel.label}
                                transform={screenLabel(spot.x, spot.y, counter, mapDeg)}
                            />
                        )}
                    </g>
                );
            })}
        </g>
    );
});

/** The chequer, and the direction the lap is read in. Without the arrows the plan has no sense of travel. */
export const StartFinish = memo(function StartFinish({ geometry, copy, counter, mapDeg, placed }: StartProps) {
    const line = alongTrack(geometry, 0, 0, mapDeg);
    const spot = placed.get(START_FINISH);

    return (
        <g className="startfinish" aria-hidden="true">
            <g transform={line.transform}>
                <rect className="chequer" x="-7" y="-26" width="14" height="52" />
            </g>

            {Array.from({ length: CHEVRONS }, (_, i) => {
                const at = (i + 0.5) / CHEVRONS;
                const { transform } = facingTravel(geometry, at, 0);

                return (
                    <g key={at} transform={transform}>
                        <path className="chevron chevron-back" d={CHEVRON} />
                        <path className="chevron chevron-mark" d={CHEVRON} />
                    </g>
                );
            })}

            {spot && (
                <SceneryLabel
                    kind="startfinish-label"
                    text={copy["map.startFinish"] ?? ""}
                    transform={screenLabel(spot.x, spot.y, counter, mapDeg)}
                />
            )}
        </g>
    );
});

/*
 * The two halves the lap is made of, set as a background wash behind everything else. They take no
 * part in label placement on purpose: each is a long phrase naming a whole region rather than a
 * point, so there is no clear spot to push it to, and pushing one only drove it somewhere worse.
 * A numbered badge crossing a faint region name is ordinary cartography and reads fine.
 */
export const SectionLabels = memo(function SectionLabels({ compact, facts, counter, mapDeg }: SectionProps) {
    /* A phrase naming a whole half of the circuit needs room this drawing does not have. */
    if (compact) {
        return null;
    }

    return (
        <g className="sections" aria-hidden="true">
            {facts.sectionLabels.map((section) => (
                <text
                    key={section.id}
                    className="section-label"
                    transform={screenLabel(section.x, section.y, counter, mapDeg)}
                    dy="0.34em"
                >
                    {section.label}
                </text>
            ))}
        </g>
    );
});

/**
 * A straight reads as a run between two corners, so its label is placed at the midpoint of that run
 * and turned to lie along it. The one that crosses the start line wraps, like the pit lane.
 */
export const StraightLabels = memo(function StraightLabels(props: StraightProps) {
    const { geometry, facts, turns, units, copy, counter, mapDeg, placed } = props;
    const tByTurn = turnTs(turns);

    return (
        <g className="straights" aria-hidden="true">
            {facts.straights.map((straight) => {
                const mid = midpointT(tByTurn, straight.from, straight.to);
                const spot = placed.get(straightId(straight.name));
                if (mid === undefined || !spot) {
                    return null;
                }

                /* The solver reserves an upright box for a plate that is about to be turned along
                 * the straight, so a diagonal one reaches a little past what it was given. Both
                 * straights here run close to an axis, and the sweep finds no pair; a straight at
                 * 45 degrees is where to look if one ever prints over a neighbour. */
                const { deg } = alongTrack(geometry, mid, straight.labelOffsetPx, mapDeg);

                return (
                    <g key={straight.name} transform={`translate(${spot.x} ${spot.y}) rotate(${deg.toFixed(2)})`}>
                        <SceneryLabel
                            kind="straight-label"
                            text={straightText(straight, copy, units)}
                            transform={`scale(${counter})`}
                        />
                    </g>
                );
            })}
        </g>
    );
});

interface LabelProps {
    /** Class on the type itself, which is what carries the label's colour. */
    kind: string;
    text: string;
    transform: string;
}

interface GridProps {
    bbox: { x: number; y: number; w: number; h: number };
    pitch: number;
    pad: number;
}

interface TunnelProps extends MapContext {
    facts: CircuitFacts;
}

interface StartProps extends MapContext {
    copy: Copy;
}

interface SectionProps {
    compact: boolean;
    mapDeg: number;
    counter: number;
    facts: CircuitFacts;
}

interface StraightProps extends MapContext {
    facts: CircuitFacts;
    turns: Turn[];
    units: Units;
    copy: Copy;
}
