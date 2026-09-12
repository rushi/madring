import type { CSSProperties } from "react";
import type { CircuitData, Copy, LayerState } from "../../data/types.ts";
import { dyeVar } from "../map/place.ts";

/**
 * The primary action. Each switch owns one thing on the map and nothing else: no toggle re-sorts
 * the board, and none of them hides a corner. A highlight going dark takes its dye, its glow and
 * its ring with it, and leaves the numbered plate exactly where it was.
 */
export function LayerPanel({ data, state, copy, onToggle, onReset }: Props) {
    const touched = data.layerGroups.some((group) => group.layers.some((layer) => state[layer.id] !== layer.default));

    return (
        <form className="switches" aria-label={copy["layers.label"]}>
            {data.layerGroups.map((group) => (
                <fieldset key={group.id} className="panel-group">
                    <legend className="panel-head sign">{group.label}</legend>

                    {group.layers.map((layer) => {
                        const dye = { "--dye": dyeVar(layer.livery) } as CSSProperties;

                        return (
                            <label key={layer.id} className="switch" style={dye} data-dyed={Boolean(layer.livery)}>
                                <input
                                    checked={state[layer.id] ?? false}
                                    type="checkbox"
                                    onChange={(event) => onToggle(layer.id, event.target.checked)}
                                />
                                <span className="switch-label">{layer.label}</span>
                            </label>
                        );
                    })}
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
    data: CircuitData;
    state: LayerState;
    copy: Copy;
    onToggle: (id: string, on: boolean) => void;
    onReset: () => void;
}
