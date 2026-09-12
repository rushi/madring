import type { CSSProperties } from "react";
import type { CircuitData, Copy, LayerState } from "../../data/types.ts";
import { allLayers } from "../../layers/resolve.ts";
import { dyeVar } from "../map/place.ts";

/**
 * The key, and only for what is currently on the map. A legend that lists layers the visitor has
 * switched off is a legend for a different drawing. It sits beside the map rather than over it: a
 * panel floating on the plan covered the corners nearest whichever edge it was pinned to.
 */
export function MapLegend({ data, state, copy }: Props) {
    const shown = allLayers(data).filter((layer) => state[layer.id] && layer.livery);
    if (!shown.length) {
        return null;
    }

    return (
        <aside className="legend" aria-label={copy["map.legendHead"]}>
            <h2 className="panel-head sign">{copy["map.legendHead"]}</h2>
            <ul className="legend-list">
                {shown.map((layer) => {
                    const swatch = { "--dye": dyeVar(layer.livery) } as CSSProperties;

                    return (
                        <li key={layer.id} className="legend-row">
                            <span className="legend-swatch" style={swatch} data-fill={layer.fill ?? "solid"} />
                            {layer.label}
                        </li>
                    );
                })}
            </ul>
        </aside>
    );
}

interface Props {
    data: CircuitData;
    state: LayerState;
    copy: Copy;
}
