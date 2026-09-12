import { useRef, useState } from "react";
import { fill } from "../../data/fill.ts";
import type { Units } from "../../data/format.ts";
import { interpolateParts } from "../../data/interpolate.ts";
import type { CircuitData, Copy, LayerGroup, LayerState } from "../../data/types.ts";
import { useSheetFocus } from "../../hooks/useSheetFocus.ts";
import { ProvenanceStamp } from "../chrome/ProvenanceStamp.tsx";
import { CornerKey } from "./CornerKey.tsx";
import { LayerRow } from "./LayerRow.tsx";

/** Every layer, grouped. Highlights arrive open; labels and scenery wait behind a tap. */
export function LayersSheet({ touched, data, state, copy, turn, units, onToggle, onReset, onSelect }: Props) {
    const sheet = useRef<HTMLElement>(null);
    useSheetFocus(sheet, ".lenschip-more");

    const headline = interpolateParts(copy["site.headline"] ?? "", units, copy);

    return (
        <section
            ref={sheet}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-label={copy["layers.label"]}
            className="sheet layers-sheet"
        >
            <div className="sheet-grip" />
            <div className="sheet-body">
                {data.layerGroups.map((group) => (
                    <SheetGroup
                        key={group.id}
                        data={data}
                        group={group}
                        state={state}
                        copy={copy}
                        turn={turn}
                        onToggle={onToggle}
                        onSelect={onSelect}
                    />
                ))}
                {/* The about group lives here because the sheet is the whole of the page's chrome on a
                    phone: what the circuit is and where its figures come from belong beside the switches
                    that draw them, not behind a second trip to the menu. */}
                <div className="panel-group">
                    <h2 className="panel-head sign">{copy["about.title"]}</h2>
                    {/* Behind a disclosure, not open on the sheet: the paragraph is the longest run of
                        prose on the page and it sat under every switch, so the group read as an essay
                        with a key on top of it. */}
                    <details className="provenance">
                        <summary className="sign">{copy["about.what"]}</summary>
                        <p className="menu-headline">
                            {headline.map((part, at) =>
                                part.lead ? <strong key={at}>{part.text}</strong> : part.text,
                            )}
                        </p>
                    </details>
                    <ProvenanceStamp data={data} />
                    <p className="menu-note">{copy["stamp.projection.full"]}</p>
                </div>

                {/* Never unmounted: a button that vanishes on click drops focus to body inside an aria-modal dialog. */}
                <button disabled={!touched} type="button" className="panel-reset" onClick={onReset}>
                    {copy["layers.reset"]}
                </button>
            </div>
        </section>
    );
}

function SheetGroup({ data, group, state, copy, turn, onToggle, onSelect }: GroupProps) {
    const [open, setOpen] = useState(group.id === "highlights");
    const on = group.layers.filter((layer) => state[layer.id]).length;
    const counter = fill(copy["layers.groupState"] ?? "", { on, total: group.layers.length });

    return (
        <div className="panel-group">
            <div className="grouphead">
                <button
                    type="button"
                    aria-expanded={open}
                    className="panel-head sign grouphead-button"
                    onClick={() => setOpen(!open)}
                >
                    <span className="grouphead-label">{group.label}</span>
                    <span className="grouphead-state">{counter}</span>
                </button>
            </div>
            {open &&
                group.layers.map((layer) => (
                    <LayerRow key={layer.id} swatch on={!!state[layer.id]} layer={layer} onToggle={onToggle} />
                ))}
            {open && group.id === "labels" && state.names && (
                <CornerKey runs={data.namedRuns} copy={copy} selected={turn} onSelect={onSelect} />
            )}
        </div>
    );
}

interface Props {
    touched: boolean;
    data: CircuitData;
    state: LayerState;
    copy: Copy;
    turn?: number;
    units: Units;
    onToggle: (id: string, on: boolean) => void;
    onReset: () => void;
    onSelect: (turn: number) => void;
}

interface GroupProps {
    data: CircuitData;
    group: LayerGroup;
    state: LayerState;
    copy: Copy;
    turn?: number;
    onToggle: (id: string, on: boolean) => void;
    onSelect: (turn: number) => void;
}
