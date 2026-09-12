import { fieldAt } from "../data/fields.ts";
import type { CircuitData, Layer, LayerState, Segment, Turn } from "../data/types.ts";

/** Every layer in content, flattened out of its group. Group order is authoring order. */
export function allLayers(data: CircuitData) {
    return data.layerGroups.flatMap((group) => group.layers);
}

/** What content asks for, with the visitor's own switches laid over the top. */
export function resolveLayers(data: CircuitData, overrides: LayerState): LayerState {
    const state: LayerState = {};
    for (const layer of allLayers(data)) {
        state[layer.id] = overrides[layer.id] ?? layer.default;
    }

    return state;
}

/** The visitor's switches, minus any naming a layer this content no longer has. */
export function knownOverrides(data: CircuitData, overrides: LayerState): LayerState {
    const ids = new Set(allLayers(data).map((layer) => layer.id));
    return Object.fromEntries(Object.entries(overrides).filter(([id]) => ids.has(id)));
}

/** The highlight layers currently painting, in authoring order so their ink stacks predictably. */
export function litHighlights(data: CircuitData, state: LayerState) {
    const group = data.layerGroups.find((candidate) => candidate.id === "highlights");
    return (group?.layers ?? []).filter((layer) => state[layer.id]);
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
