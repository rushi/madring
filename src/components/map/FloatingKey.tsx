import type { CircuitData, Copy, LayerState } from "../../data/types.ts";
import { litHighlights, shortLabel } from "../../layers/resolve.ts";
import { LayerSwatch } from "../layers/LayerSwatch.tsx";

/**
 * The key, floating over the map's top-left, listing the highlights that are on. Scenery liveries
 * stay out of it: pit lane and tunnels name themselves on the drawing, and keying them grew the
 * plate to five rows on a tablet. Wide viewports keep MapLegend.
 */
export function FloatingKey({ data, state, copy }: Props) {
    const shown = litHighlights(data, state);
    if (!shown.length) {
        return null;
    }

    return (
        <ul aria-label={copy["map.legendHead"]} className="floatkey">
            {shown.map((layer) => (
                <li key={layer.id} className="floatkey-row">
                    <LayerSwatch layer={layer} />
                    {shortLabel(layer)}
                </li>
            ))}
        </ul>
    );
}

interface Props {
    copy: Copy;
    data: CircuitData;
    state: LayerState;
}
