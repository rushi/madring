import type { Units } from "../../data/format.ts";
import type { Copy } from "../../data/types.ts";

/** Two states, both always visible. A unit system is a preference, not a setting to go hunting for. */
export function UnitToggle({ units, copy, onChange }: Props) {
    return (
        <fieldset className="units">
            <legend className="visually-hidden">{copy["units.label"]}</legend>
            {(["metric", "imperial"] as const).map((option) => (
                <button
                    key={option}
                    type="button"
                    aria-current={units === option}
                    className={units === option ? "unit is-active sign" : "unit sign"}
                    onClick={() => onChange(option)}
                >
                    {copy[`units.${option}`]}
                </button>
            ))}
        </fieldset>
    );
}

interface Props {
    units: Units;
    copy: Copy;
    onChange: (units: Units) => void;
}
