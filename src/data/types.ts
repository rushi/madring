import type { z } from "zod";
import type { CircuitFacts, Fill, Layer, LayerGroup, segmentSchema, turnSchema } from "../../content/schema/index.ts";

export type { CircuitFacts, Fill, Layer, LayerGroup };

/** A turn as the runtime sees it: the authored fields plus what `pnpm ingest` derived. */
export type Turn = z.infer<typeof turnSchema> & {
    /** Metres from the start line. */
    s: number;
    /** Reconstructed from the two published heights and two gradients, never surveyed. */
    altitudeReconM: number;
    /** Reconstructed gradient at this turn, percent. Positive is uphill. */
    gradePct: number;
};

export type Segment = z.infer<typeof segmentSchema> & { s0: number; s1: number; lengthM: number };

export interface CircuitData {
    schemaVersion: number;
    generatedAt: string;
    canvas: { w: number; h: number };
    /** Drawn extent of the lap inside the canvas. The map frames this, not the whole canvas. */
    bbox: { x: number; y: number; w: number; h: number };
    pathD: string;
    /** Total arc length of the lap in px. Dash maths for zone floods works from this. */
    totalPx: number;
    lengthM: number;
    pxPerM: number;
    /** Cumulative arc length in px at each vertex, base64 Float32Array. */
    cumB64: string;
    elevation: { reconstructed: true; sB64: string; altB64: string };
    turns: Turn[];
    /** Names grouped into the runs of corners that share them. Derived by `pnpm ingest`. */
    namedRuns: NamedRun[];
    segments: Segment[];
    /** Layout values from content/theme.json. The CSS reads the same numbers as generated tokens. */
    layout: Record<string, number | string>;
    layerGroups: LayerGroup[];
    copy: Record<string, string>;
    sources: Source[];
    facts: CircuitFacts;
}

export interface NamedRun {
    name: string;
    from: number;
    to: number;
}

export type Copy = Record<string, string>;
/** Which map layers are on. Every layer in content has an entry, so a lookup is never a guess. */
export type LayerState = Record<string, boolean>;

/** One line of the provenance panel: where a circuit fact came from, and the page it came from. */
export interface Source {
    url: string;
    label: string;
}
