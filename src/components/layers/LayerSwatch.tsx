import type { Layer } from "../../data/types.ts";
import { dyeStyle } from "../map/place.ts";

/** The pattern chip that keys a layer wherever the layer is listed. */
export function LayerSwatch({ layer }: { layer: Layer }) {
    return (
        <span
            aria-hidden="true"
            data-fill={layer.fill ?? "solid"}
            style={dyeStyle(layer.livery)}
            className="legend-swatch"
        />
    );
}
