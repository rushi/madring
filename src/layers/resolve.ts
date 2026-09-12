import { fieldAt } from "../data/fields.ts";
import type { CircuitData, Layer, LayerGroup, LayerState, Segment, Turn } from "../data/types.ts";

/** Every layer in content, flattened out of its group. Group order is authoring order. */
export function allLayers(data: CircuitData) {
    return data.layerGroups.flatMap((group) => group.layers);
}

/** What content asks for on this viewport class, with the visitor's switches over the top. */
export function resolveLayers(data: CircuitData, overrides: LayerState, compact = false): LayerState {
    return Object.fromEntries(
        allLayers(data).map((layer) => [layer.id, overrides[layer.id] ?? defaultOf(layer, compact)]),
    );
}

/** The switches' resting state, so "back to default" can drop an override from the link. */
export function layerDefaults(data: CircuitData, compact = false): LayerState {
    return resolveLayers(data, {}, compact);
}

const defaultOf = (layer: Layer, compact: boolean) => {
    return compact ? (layer.compactDefault ?? layer.default) : layer.default;
};

/** The visitor's switches, minus any naming a layer this content no longer has. */
export function knownOverrides(data: CircuitData, overrides: LayerState): LayerState {
    const ids = new Set(allLayers(data).map((layer) => layer.id));
    return Object.fromEntries(Object.entries(overrides).filter(([id]) => ids.has(id)));
}

/** Whether any switch sits off the given defaults: the reset control exists only then. */
export function layersTouched(groups: LayerGroup[], state: LayerState, defaults: LayerState) {
    return groups.some((group) => group.layers.some((layer) => state[layer.id] !== defaults[layer.id]));
}

/** The layers a key lists: switched on and carrying a dye worth keying. */
export function activeLiveryLayers(data: CircuitData, state: LayerState) {
    return allLayers(data).filter((layer) => state[layer.id] && layer.livery);
}

/**
 * The chip-sized name where content authored one. The key floats over the svg and cannot enter the
 * label solver, so a full-length label reaches far enough to print over a numeral. Rule 4 holds.
 */
export const shortLabel = (layer: Layer) => layer.short ?? layer.label;

export function highlightLayers(data: CircuitData) {
    return data.layerGroups.find((candidate) => candidate.id === "highlights")?.layers ?? [];
}

/** The highlight layers currently painting, in authoring order so their ink stacks predictably. */
export function litHighlights(data: CircuitData, state: LayerState) {
    return highlightLayers(data).filter((layer) => state[layer.id]);
}

/** The stretches of track one highlight dyes. Empty for a highlight that only rings corners. */
export function segmentsFor(data: CircuitData, layer: Layer): Segment[] {
    const sets = layer.segmentSets;
    if (!sets?.length) {
        return [];
    }

    return data.segments.filter((segment) => sets.includes(segment.set));
}

/** Which highlights ring a corner, in authoring order. A corner can answer to more than one. */
export function highlightsAtTurn(lit: Layer[], turn: Turn) {
    return lit.filter((layer) => layer.turnFlag !== undefined && fieldAt(turn, layer.turnFlag) === true);
}
