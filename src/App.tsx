import { useEffect, useMemo, useState } from "react";
import { useShallow } from "zustand/shallow";
import { ProvenanceStamp } from "./components/chrome/ProvenanceStamp.tsx";
import { ThemeToggle } from "./components/chrome/ThemeToggle.tsx";
import { UnitToggle } from "./components/chrome/UnitToggle.tsx";
import { CornerKey } from "./components/layers/CornerKey.tsx";
import { LayerPanel } from "./components/layers/LayerPanel.tsx";
import { MapLegend } from "./components/layers/MapLegend.tsx";
import { CircuitMap } from "./components/map/CircuitMap.tsx";
import { TurnDetail } from "./components/turn/TurnDetail.tsx";
import { interpolateParts } from "./data/interpolate.ts";
import { loadCircuit } from "./data/load.ts";
import { kinOf } from "./data/runs.ts";
import { stampTheme } from "./data/theme.ts";
import type { CircuitData } from "./data/types.ts";
import { useMediaQuery } from "./hooks/useMediaQuery.ts";
import { useUrlSync } from "./hooks/useUrlSync.ts";
import { allLayers, knownOverrides, resolveLayers } from "./layers/resolve.ts";
import { TypeSpecimen } from "./specimen/TypeSpecimen.tsx";
import { PANEL_OVERLAY_MAX, useCircuitStore } from "./store/useCircuitStore.ts";

const isSpecimen = new URLSearchParams(globalThis.location.search).has("specimen");

export function App() {
    const [circuit, setCircuit] = useState<CircuitData>();
    const [error, setError] = useState<string>();

    useEffect(() => {
        let cancelled = false;

        loadCircuit()
            .then((loaded) => {
                if (!cancelled) {
                    setCircuit(loaded);
                }
            })
            .catch((cause: unknown) => {
                if (!cancelled) {
                    setError(cause instanceof Error ? cause.message : String(cause));
                }
            });

        return () => {
            cancelled = true;
        };
    }, []);

    /* index.html draws the masthead and a simplified lap before this bundle lands. Once there is
     * something real to put on screen, whether the map or the failure, the stand-in goes. */
    const settled = !!circuit || !!error;
    useEffect(() => {
        if (settled) {
            document.querySelector("#lap-seed")?.remove();
        }
    }, [settled]);

    if (error) {
        return <p className="error">{error}</p>;
    }

    if (!circuit) {
        return null;
    }

    return isSpecimen ? <TypeSpecimen circuit={circuit} /> : <Shell circuit={circuit} />;
}

function Shell({ circuit }: { circuit: CircuitData }) {
    const store = useCircuitStore(
        useShallow((state) => ({
            turn: state.turn,
            units: state.units,
            theme: state.theme,
            overrides: state.layerOverrides,
            panelOpen: state.panelOpen,
            setUnits: state.setUnits,
            setTheme: state.setTheme,
            togglePanel: state.togglePanel,
            setLayer: state.setLayer,
            resetLayers: state.resetLayers,
            selectTurn: state.selectTurn,
        })),
    );
    const { turn, units, theme, overrides, panelOpen } = store;
    const { setUnits, setTheme, setLayer, resetLayers, selectTurn, togglePanel } = store;

    /* index.html stamps the stored choice before first paint; this keeps it true after a click. */
    useEffect(() => stampTheme(document.documentElement, theme), [theme]);

    const headline = interpolateParts(circuit.copy["site.headline"] ?? "", units, circuit.copy);
    const kin = useMemo(() => kinOf(circuit.namedRuns, turn), [circuit, turn]);
    const state = useMemo(() => resolveLayers(circuit, overrides), [circuit, overrides]);
    const known = useMemo(() => knownOverrides(circuit, overrides), [circuit, overrides]);
    const defaults = useMemo(() => {
        return Object.fromEntries(allLayers(circuit).map((layer) => [layer.id, layer.default]));
    }, [circuit]);
    // A link can name a turn this circuit does not have; the lookup is the bound.
    const detail = turn ? circuit.turns.find((candidate) => candidate.n === turn) : undefined;
    const card = detail && (
        <TurnDetail data={circuit} turn={detail} units={units} onClose={() => selectTurn(undefined)} />
    );

    /* Below the wide breakpoint the panel is a drawer over the map, not a column beside it. */
    const overlay = useMediaQuery(`(max-width: ${PANEL_OVERLAY_MAX}px)`);
    const drawer = overlay && panelOpen;

    useEffect(() => {
        if (!drawer) {
            return;
        }

        const close = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                togglePanel();
            }
        };

        globalThis.addEventListener("keydown", close);
        return () => globalThis.removeEventListener("keydown", close);
    }, [drawer, togglePanel]);

    useUrlSync(known);

    return (
        <div className="shell">
            <header className="masthead-bar">
                <div className="masthead-name">
                    <h1 className="sign masthead">
                        <a href={import.meta.env.BASE_URL} title={circuit.copy["site.home"]}>
                            {circuit.facts.name}
                        </a>
                    </h1>
                    <p className="site-question">{circuit.copy["site.question"]}</p>
                </div>

                <p className="site-headline">
                    {headline.map((part, at) => (part.lead ? <strong key={at}>{part.text}</strong> : part.text))}
                </p>

                <div className="masthead-controls">
                    <button
                        aria-controls="layer-panel"
                        aria-expanded={panelOpen}
                        type="button"
                        className="panel-toggle sign"
                        onClick={togglePanel}
                    >
                        {circuit.copy[panelOpen ? "panel.hide" : "panel.show"]}
                    </button>
                    <UnitToggle units={units} copy={circuit.copy} onChange={setUnits} />
                    <ThemeToggle theme={theme} copy={circuit.copy} onChange={setTheme} />
                </div>
            </header>

            <div className="stage" data-panel={panelOpen ? "open" : "closed"} data-drawer={drawer || undefined}>
                <div
                    hidden={!panelOpen}
                    id="layer-panel"
                    aria-label={circuit.copy["layers.label"]}
                    aria-modal={drawer || undefined}
                    role={drawer ? "dialog" : undefined}
                    className="panel"
                >
                    {!overlay && card}
                    <LayerPanel
                        data={circuit}
                        state={state}
                        copy={circuit.copy}
                        onToggle={(id, on) => setLayer(id, on, defaults[id] === on)}
                        onReset={resetLayers}
                    />
                    {state.legend && <MapLegend data={circuit} state={state} copy={circuit.copy} />}
                    {state.names && (
                        <CornerKey runs={circuit.namedRuns} copy={circuit.copy} selected={turn} onSelect={selectTurn} />
                    )}
                    <ProvenanceStamp data={circuit} />
                </div>

                {drawer && (
                    <button
                        type="button"
                        aria-label={circuit.copy["panel.hide"]}
                        className="scrim"
                        onClick={togglePanel}
                    />
                )}

                {/*
                 * The corner opens beside the map on a wide screen and over it on a narrow one. It
                 * cannot live in the panel there: the panel arrives closed on a phone, so tapping a
                 * badge set the selection and rendered its card inside a hidden container.
                 */}
                {overlay && card && <div className="detail-sheet">{card}</div>}

                <div className="map-frame">
                    <CircuitMap
                        data={circuit}
                        state={state}
                        units={units}
                        selected={turn}
                        kin={kin}
                        onSelect={selectTurn}
                    />
                </div>
            </div>
        </div>
    );
}
