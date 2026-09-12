import type { CircuitData, Copy, LayerState } from "../../data/types.ts";
import { activeLiveryLayers } from "../../layers/resolve.ts";
import { LayerSwatch } from "./LayerSwatch.tsx";

/**
 * The key, and only for what is currently on the map. A legend that lists layers the visitor has
 * switched off is a legend for a different drawing. It sits beside the map rather than over it: a
 * panel floating on the plan covered the corners nearest whichever edge it was pinned to.
 *
 * Full labels, and every dyed layer including scenery: a panel of its own has the room. FloatingKey
 * is the same key with neither, because it floats on the drawing. The two are meant to differ.
 */
export function MapLegend({ data, state, copy }: Props) {
    const shown = activeLiveryLayers(data, state);
    if (!shown.length) {
        return null;
    }

    return (
        <aside aria-label={copy["map.legendHead"]} className="legend">
            <h2 className="panel-head sign">{copy["map.legendHead"]}</h2>
            <ul className="legend-list">
                {shown.map((layer) => (
                    <li key={layer.id} className="legend-row">
                        <LayerSwatch layer={layer} />
                        {layer.label}
                    </li>
                ))}
            </ul>
        </aside>
    );
}

interface Props {
    copy: Copy;
    data: CircuitData;
    state: LayerState;
}
