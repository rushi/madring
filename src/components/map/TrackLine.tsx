import { memo } from "react";

/**
 * The lap is a road, drawn as one: a light edge line with the asphalt laid over it, so what reads
 * as two kerbs is a single path stroked twice. Everything a highlight does later is the same trick
 * on one stretch, which is why a dyed run can never drift out of register with the track beneath.
 */
export const TrackLine = memo(function TrackLine({ pathD }: { pathD: string }) {
    return (
        <g className="track">
            <path className="track-edge" d={pathD} />
            <path className="track-asphalt" d={pathD} />
        </g>
    );
});
