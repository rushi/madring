import { useMemo } from "react";
import { fieldAt } from "../../data/fields.ts";
import { fill } from "../../data/fill.ts";
import type { CircuitData, Layer, LayerState } from "../../data/types.ts";
import { highlightLayers, shortLabel } from "../../layers/resolve.ts";
import { dyeStyle } from "../map/place.ts";
import { LayerSwatch } from "./LayerSwatch.tsx";

/** The highlight layers as thumb-sized chips; toggling updates the map with nothing opened. */
export function LensRail({ data, state, onToggle, onMore }: Props) {
    const layers = highlightLayers(data);
    /* Counting walks every corner per layer, so the tally runs again only when the content does. */
    const counts = useMemo(() => {
        const entries = highlightLayers(data).map((layer) => [layer.id, countFor(data, layer)] as const);
        return new Map(entries);
    }, [data]);

    return (
        <nav aria-label={data.copy["rail.label"]} className="lensrail">
            <p className="lensrail-hint sign">{data.copy["rail.hint"]}</p>
            <div className="lensrail-chips">
                {layers.map((layer) => {
                    const on = !!state[layer.id];
                    const count = counts.get(layer.id);
                    /* The chip shows the short name and a bare tally, so the full name and what the
                       tally counts both belong to the accessible name instead. */
                    const chipCopy = data.copy[count === 1 ? "rail.chipOne" : "rail.chip"] ?? "";
                    const named = count === undefined ? layer.label : fill(chipCopy, { label: layer.label, count });

                    return (
                        <button
                            key={layer.id}
                            type="button"
                            aria-pressed={on}
                            aria-label={named}
                            style={dyeStyle(layer.livery)}
                            data-on={on || undefined}
                            className="lenschip"
                            onClick={() => onToggle(layer.id, !on)}
                        >
                            <LayerSwatch layer={layer} />
                            {/* The chip wears the short label; the full one still names the switch in the sheet. */}
                            <span className="lenschip-label">{shortLabel(layer)}</span>
                            {count !== undefined && <span className="lenschip-count">{count}</span>}
                        </button>
                    );
                })}
                <button type="button" className="lenschip lenschip-more" onClick={onMore}>
                    {data.copy["rail.more"]}
                </button>
            </div>
        </nav>
    );
}

/** Corners a highlight rings. Layers without a turn flag carry no count. */
function countFor(data: CircuitData, layer: Layer) {
    const flag = layer.turnFlag;
    return flag ? data.turns.filter((turn) => fieldAt(turn, flag) === true).length : undefined;
}

interface Props {
    data: CircuitData;
    state: LayerState;
    onToggle: (id: string, on: boolean) => void;
    onMore: () => void;
}
