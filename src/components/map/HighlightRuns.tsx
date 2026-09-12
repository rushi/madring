import { memo } from "react";
import type { Geometry } from "../../data/geometry.ts";
import { pxAt } from "../../data/geometry.ts";
import type { Fill, Layer, Segment } from "../../data/types.ts";
import { dyeVar } from "./place.ts";

export interface LitLayer {
    layer: Layer;
    segments: Segment[];
}

/**
 * A highlight is the road re-kerbed, not a stripe laid over it: the stretch takes the layer's dye
 * on its edge line and the asphalt is drawn back on top, so the surface stays a surface and the
 * colour reads as a marking beside it. Every run is cut out of the lap's own `d` by dash
 * arithmetic, which is why a dyed stretch can never drift out of register with the track.
 */
export const HighlightRuns = memo(function HighlightRuns({ pathD, totalPx, geometry, lit }: Props) {
    return (
        <g className="runs" aria-hidden="true">
            <defs>
                {lit.map(({ layer }) => {
                    const fill = layer.fill ?? "solid";
                    if (fill === "solid") {
                        return null;
                    }

                    return <Texture key={layer.id} id={textureId(layer)} fill={fill} dye={dyeVar(layer.livery)} />;
                })}
            </defs>

            {lit.map(({ layer, segments }) => (
                <g key={layer.id} data-layer={layer.id}>
                    {segments.map((segment) => {
                        const dash = dashFor(geometry, totalPx, segment);
                        if (!dash) {
                            return null;
                        }

                        return (
                            <g key={segment.id}>
                                <path className="run-edge" d={pathD} stroke={dyeVar(layer.livery)} {...dash} />
                                <path className="run-asphalt" d={pathD} {...dash} />
                                {layer.fill && layer.fill !== "solid" && (
                                    <path
                                        className="run-texture"
                                        d={pathD}
                                        stroke={`url(#${textureId(layer)})`}
                                        {...dash}
                                    />
                                )}
                            </g>
                        );
                    })}
                </g>
            ))}
        </g>
    );
});

/** The same stretch at a heavier weight and blurred, under the road: it says "near here" before the detail does. */
export const HighlightGlow = memo(function HighlightGlow({ pathD, totalPx, geometry, lit }: Props) {
    const glowing = lit.filter(({ layer }) => layer.glow);
    if (!glowing.length) {
        return null;
    }

    return (
        <g className="glow" aria-hidden="true">
            <defs>
                <filter id="run-glow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="7" />
                </filter>
            </defs>

            {glowing.map(({ layer, segments }) => (
                <g key={layer.id} filter="url(#run-glow)">
                    {segments.map((segment) => {
                        const dash = dashFor(geometry, totalPx, segment);
                        return (
                            dash && (
                                <path
                                    key={segment.id}
                                    className="run-glow"
                                    d={pathD}
                                    stroke={dyeVar(layer.livery)}
                                    {...dash}
                                />
                            )
                        );
                    })}
                </g>
            ))}
        </g>
    );
});

/** One stretch of the lap, cut out of the whole path. A run that closes on itself is not a run. */
function dashFor(geometry: Geometry, totalPx: number, segment: Segment) {
    const startPx = pxAt(geometry, segment.t0);
    const endPx = pxAt(geometry, segment.t1);
    const runPx = endPx > startPx ? endPx - startPx : totalPx - startPx + endPx;
    if (runPx <= 0) {
        return undefined;
    }

    return { strokeDasharray: `${runPx} ${totalPx}`, strokeDashoffset: -startPx };
}

const textureId = (layer: Layer) => `run-${layer.id}`;

/** Pattern per fill, sized in user space so a texture keeps its grain at any zoom. */
function Texture({ id, fill, dye }: { id: string; fill: Fill; dye: string }) {
    if (fill === "hatch45") {
        return (
            <pattern id={id} width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <rect width="10" height="10" fill={dye} fillOpacity="0.18" />
                <line x1="0" y1="0" x2="0" y2="10" stroke={dye} strokeWidth="3" strokeOpacity="0.9" />
            </pattern>
        );
    }

    if (fill === "stipple") {
        return (
            <pattern id={id} width="10" height="10" patternUnits="userSpaceOnUse">
                <rect width="10" height="10" fill={dye} fillOpacity="0.16" />
                <circle cx="3" cy="3" r="1.7" fill={dye} />
                <circle cx="8" cy="8" r="1.7" fill={dye} />
            </pattern>
        );
    }

    if (fill === "chevron") {
        return (
            <pattern id={id} width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(90)">
                <rect width="14" height="14" fill={dye} fillOpacity="0.16" />
                <path d="M 0,10 L 7,3 L 14,10" fill="none" stroke={dye} strokeWidth="2.6" />
            </pattern>
        );
    }

    return (
        <pattern id={id} width="16" height="16" patternUnits="userSpaceOnUse">
            <rect width="16" height="16" fill={dye} fillOpacity="0.16" />
            <rect width="8" height="16" fill={dye} fillOpacity="0.85" />
        </pattern>
    );
}

interface Props {
    pathD: string;
    totalPx: number;
    geometry: Geometry;
    lit: LitLayer[];
}
