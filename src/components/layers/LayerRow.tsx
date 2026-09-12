import type { Layer } from "../../data/types.ts";
import { dyeStyle } from "../map/place.ts";
import { LayerSwatch } from "./LayerSwatch.tsx";

/** In the sheet the pattern swatch is the key, so key and switch are one element. */
export function LayerRow({ swatch = false, on, layer, onToggle }: Props) {
    return (
        <label data-dyed={Boolean(layer.livery)} style={dyeStyle(layer.livery)} className="switch">
            <input checked={on} type="checkbox" onChange={(event) => onToggle(layer.id, event.target.checked)} />
            {swatch && layer.livery && <LayerSwatch layer={layer} />}
            <span className="switch-label">{layer.label}</span>
        </label>
    );
}

interface Props {
    on: boolean;
    swatch?: boolean;
    layer: Layer;
    onToggle: (id: string, on: boolean) => void;
}
