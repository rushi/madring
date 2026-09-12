import type { CircuitData, Copy, LayerState } from "../../data/types.ts";
import { LayerRow } from "./LayerRow.tsx";

/**
 * The primary action. Each switch owns one thing on the map and nothing else: no toggle re-sorts
 * the board, and none of them hides a corner. A highlight going dark takes its dye, its glow and
 * its ring with it, and leaves the numbered plate exactly where it was.
 */
export function LayerPanel({ touched, data, state, copy, onToggle, onReset }: Props) {
    return (
        <form className="switches" aria-label={copy["layers.label"]}>
            {data.layerGroups.map((group) => (
                <fieldset key={group.id} className="panel-group">
                    <legend className="panel-head sign">{group.label}</legend>

                    {group.layers.map((layer) => (
                        <LayerRow key={layer.id} on={state[layer.id] ?? false} layer={layer} onToggle={onToggle} />
                    ))}
                </fieldset>
            ))}

            {touched && (
                <button className="panel-reset" type="button" onClick={onReset}>
                    {copy["layers.reset"]}
                </button>
            )}
        </form>
    );
}

interface Props {
    touched: boolean;
    data: CircuitData;
    state: LayerState;
    copy: Copy;
    onToggle: (id: string, on: boolean) => void;
    onReset: () => void;
}
