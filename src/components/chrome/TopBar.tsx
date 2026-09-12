import type { Units } from "../../data/format.ts";
import type { Copy } from "../../data/types.ts";
import { UnitToggle } from "./UnitToggle.tsx";

/** The overlay shell's chrome; wide viewports keep the masthead. */
export function TopBar({ inert, name, copy, units, onUnits, onMenu }: Props) {
    return (
        <header inert={inert} className="topbar">
            <span className="topbar-name sign">{name}</span>
            <span className="topbar-gap" />
            <UnitToggle units={units} copy={copy} onChange={onUnits} />
            <button type="button" aria-label={copy["menu.label"]} className="topbar-menu sign" onClick={onMenu}>
                <span aria-hidden="true">☰</span>
            </button>
        </header>
    );
}

interface Props {
    inert?: boolean;
    name: string;
    copy: Copy;
    units: Units;
    onUnits: (units: Units) => void;
    onMenu: () => void;
}
