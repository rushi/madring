import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useShallow } from "zustand/shallow";
import { Colophon } from "./components/chrome/Colophon.tsx";
import { MenuSheet } from "./components/chrome/MenuSheet.tsx";
import { ProvenanceStamp } from "./components/chrome/ProvenanceStamp.tsx";
import { ThemeToggle } from "./components/chrome/ThemeToggle.tsx";
import { TopBar } from "./components/chrome/TopBar.tsx";
import { UnitToggle } from "./components/chrome/UnitToggle.tsx";
import { CornerKey } from "./components/layers/CornerKey.tsx";
import { LayerPanel } from "./components/layers/LayerPanel.tsx";
import { LayersSheet } from "./components/layers/LayersSheet.tsx";
import { LensRail } from "./components/layers/LensRail.tsx";
import { MapLegend } from "./components/layers/MapLegend.tsx";
import { CircuitMap } from "./components/map/CircuitMap.tsx";
import { FloatingKey } from "./components/map/FloatingKey.tsx";
import { CornerSheet } from "./components/turn/CornerSheet.tsx";
import { TurnDetail } from "./components/turn/TurnDetail.tsx";
import type { Units } from "./data/format.ts";
import { interpolateParts } from "./data/interpolate.ts";
import { loadCircuit } from "./data/load.ts";
import { kinOf } from "./data/runs.ts";
import { stampTheme } from "./data/theme.ts";
import type { Theme } from "./data/theme.ts";
import type { CircuitData, Layer, LayerState, Turn } from "./data/types.ts";
import { useMediaQuery } from "./hooks/useMediaQuery.ts";
import { useUrlSync } from "./hooks/useUrlSync.ts";
import {
    highlightsAtTurn,
    knownOverrides,
    layerDefaults,
    layersTouched,
    litHighlights,
    resolveLayers,
} from "./layers/resolve.ts";
import { TypeSpecimen } from "./specimen/TypeSpecimen.tsx";
import { PANEL_OVERLAY_MAX, useCircuitStore } from "./store/useCircuitStore.ts";
import type { SheetKind } from "./store/useCircuitStore.ts";

const isSpecimen = new URLSearchParams(globalThis.location.search).has("specimen");

/** No corner open means no tags, and one stable reference keeps the card from re-rendering on it. */
const EMPTY_TAGS: Layer[] = [];

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
            sheet: state.sheet,
            units: state.units,
            theme: state.theme,
            overrides: state.layerOverrides,
            panelOpen: state.panelOpen,
            setUnits: state.setUnits,
            setTheme: state.setTheme,
            openSheet: state.openSheet,
            closeSheet: state.closeSheet,
            togglePanel: state.togglePanel,
            setLayer: state.setLayer,
            resetLayers: state.resetLayers,
            selectTurn: state.selectTurn,
        })),
    );
    const { turn, sheet, units, theme, overrides, panelOpen } = store;
    const { setUnits, setTheme, openSheet, closeSheet, togglePanel, setLayer, resetLayers, selectTurn } = store;

    /* index.html stamps the stored choice before first paint; this keeps it true after a click. */
    useEffect(() => stampTheme(document.documentElement, theme), [theme]);

    /* Below the wide breakpoint the panel gives way to the overlay shell: top bar, rail, sheets. */
    const overlay = useMediaQuery(`(max-width: ${PANEL_OVERLAY_MAX}px)`);
    /* Range syntax: CircuitMap decides compact on fractional px with `< compactPx`; agree with it. */
    const compactPx = Number(circuit.layout.compactPx);
    const compact = useMediaQuery(`(width < ${compactPx}px), (height < ${compactPx}px)`);
    /* Compact defaults belong to the overlay shell: a wide-but-short window keeps desktop defaults
     * even though its height alone reads compact. CircuitMap's own box compact is untouched. */
    const compactLayers = overlay && compact;

    const kin = useMemo(() => kinOf(circuit.namedRuns, turn), [circuit, turn]);
    const defaults = useMemo(() => layerDefaults(circuit, compactLayers), [circuit, compactLayers]);
    const known = useMemo(() => knownOverrides(circuit, overrides), [circuit, overrides]);
    // A link can name a turn this circuit does not have; the lookup is the bound.
    const detail = turn ? circuit.turns.find((candidate) => candidate.n === turn) : undefined;
    const headline = interpolateParts(circuit.copy["site.headline"] ?? "", units, circuit.copy);
    const state = useMemo(() => resolveLayers(circuit, overrides, compactLayers), [circuit, overrides, compactLayers]);
    /* Any switch sitting off its compact-aware default: the sheets offer reset only then. */
    const touched = useMemo(() => layersTouched(circuit.layerGroups, state, defaults), [circuit, state, defaults]);
    /* Which lit highlights claim the open corner. Derived here, where the layer state already is,
       so the card takes the answer rather than the whole switchboard to work it out from. */
    const tags = useMemo(() => {
        return detail ? highlightsAtTurn(litHighlights(circuit, state), detail) : EMPTY_TAGS;
    }, [circuit, state, detail]);

    const toggleLayer = (id: string, on: boolean) => setLayer(id, on, defaults[id] === on);

    useUrlSync(known, overlay);

    if (overlay) {
        return (
            <OverlayShell
                touched={touched}
                circuit={circuit}
                detail={detail}
                kin={kin}
                sheet={sheet}
                state={state}
                tags={tags}
                theme={theme}
                turn={turn}
                units={units}
                onCloseSheet={closeSheet}
                onOpenSheet={openSheet}
                onReset={resetLayers}
                onSelect={selectTurn}
                onTheme={setTheme}
                onToggle={toggleLayer}
                onUnits={setUnits}
            />
        );
    }

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
                    <Colophon copy={circuit.copy} />
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

            <div className="stage" data-panel={panelOpen ? "open" : "closed"}>
                <div
                    hidden={!panelOpen}
                    id="layer-panel"
                    aria-label={circuit.copy["layers.label"]}
                    role="region"
                    className="panel"
                >
                    {/* The corner opens at the top of the panel, where the eye already is. */}
                    {detail && (
                        <TurnDetail
                            data={circuit}
                            turn={detail}
                            tags={tags}
                            units={units}
                            onClose={() => selectTurn(undefined)}
                        />
                    )}
                    <LayerPanel
                        touched={touched}
                        data={circuit}
                        state={state}
                        copy={circuit.copy}
                        onToggle={toggleLayer}
                        onReset={resetLayers}
                    />
                    {state.legend && <MapLegend data={circuit} state={state} copy={circuit.copy} />}
                    {state.names && (
                        <CornerKey runs={circuit.namedRuns} copy={circuit.copy} selected={turn} onSelect={selectTurn} />
                    )}
                    <ProvenanceStamp data={circuit} />
                </div>

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

/*
 * The phone and tablet shell: a top bar over the full-bleed map, with the lens rail, at most one
 * sheet, and the corner card stacking over the stage. The corner wins structurally: rail, sheets,
 * and the scrim render only while no corner is open, and the store keeps turn and sheet mutually
 * exclusive so the render guard can never be caught out by an ordering of events.
 */
function OverlayShell(props: OverlayProps) {
    const { circuit, detail, kin, sheet, state, tags, theme, touched, turn, units } = props;
    const { onCloseSheet, onOpenSheet, onReset, onSelect, onTheme, onToggle, onUnits } = props;

    /* A short viewport docks the corner card in its own column instead of sheeting it over the map. */
    const shortDock = useMediaQuery(`(height < 600px)`);
    /* Mirrors the floating-card query in detail.css: a roomy tablet gets a card, not a full sheet. */
    const floatCard = useMediaQuery(`(min-width: 760px) and (min-height: 600px)`);
    const walkTurn = useCircuitStore((state) => state.walkTurn);

    const showDock = !!detail && shortDock;
    /* Only the full-width sheet covers enough of the lap to earn the pan: the dock takes its own
       column and the tablet's card is 520px of a wider frame, so both leave the corner in view. */
    const sheetPan = !!detail && !showDock && !floatCard;

    /* A sheet and the corner card both answer Escape; the sheet is on top, so it wins the key. */
    useEffect(() => {
        if (!sheet && !detail) {
            return;
        }

        const close = (event: KeyboardEvent) => {
            if (event.key !== "Escape") {
                return;
            }

            if (sheet) {
                onCloseSheet();
            } else {
                onSelect(undefined);
            }
        };

        globalThis.addEventListener("keydown", close);
        return () => globalThis.removeEventListener("keydown", close);
    }, [sheet, detail, onCloseSheet, onSelect]);

    /* The frame slides the lap clear of the sheet, so it has to know how tall the sheet grew. */
    const sheetRef = useRef<HTMLDivElement>(null);
    const [sheetPx, setSheetPx] = useState(0);
    /*
     * Measured in the commit, not from the observer: the observer reports after paint, which costs
     * the frame one painted frame at reserve 0 before the real height lands, and the lap jumps
     * against the sheet's own slide. The arrival animates transform alone, so the height is final.
     */
    useLayoutEffect(() => {
        const sheetEl = sheetRef.current;
        if (!sheetPan || !sheetEl) {
            setSheetPx(0);
            return;
        }

        /* Border box, not the entry's content box: the sheet's safe-area padding is coverable too. */
        const measure = () => setSheetPx(Math.round(sheetEl.getBoundingClientRect().height));
        measure();

        const observer = new ResizeObserver(measure);
        observer.observe(sheetEl);
        return () => observer.disconnect();
    }, [sheetPan]);

    return (
        <div className="shell">
            <TopBar
                inert={!!sheet || undefined}
                name={circuit.facts.name}
                copy={circuit.copy}
                units={units}
                onUnits={onUnits}
                onMenu={() => onOpenSheet("menu")}
            />
            <div className="stage" data-dock={showDock || undefined}>
                <div inert={!!sheet || undefined} className="map-frame">
                    <CircuitMap
                        data={circuit}
                        state={state}
                        units={units}
                        selected={turn}
                        kin={kin}
                        reservePx={sheetPan ? sheetPx : 0}
                        focusTurn={sheetPan ? turn : undefined}
                        onSelect={onSelect}
                    />
                    {state.legend && <FloatingKey data={circuit} state={state} copy={circuit.copy} />}
                </div>
                {!detail && !sheet && (
                    <LensRail data={circuit} state={state} onToggle={onToggle} onMore={() => onOpenSheet("layers")} />
                )}
                {!detail && sheet === "layers" && (
                    <LayersSheet
                        touched={touched}
                        data={circuit}
                        state={state}
                        copy={circuit.copy}
                        turn={turn}
                        units={units}
                        onToggle={onToggle}
                        onReset={onReset}
                        onSelect={onSelect}
                    />
                )}
                {!detail && sheet === "menu" && (
                    <MenuSheet data={circuit} theme={theme} onTheme={onTheme} onClose={onCloseSheet} />
                )}
                {detail && (
                    <CornerSheet
                        ref={sheetRef}
                        data={circuit}
                        turn={detail}
                        tags={tags}
                        units={units}
                        onClose={() => onSelect(undefined)}
                        onWalk={walkTurn}
                    />
                )}
                {!detail && sheet && (
                    <button
                        type="button"
                        tabIndex={-1}
                        aria-label={circuit.copy["sheet.close"]}
                        className="scrim"
                        onClick={onCloseSheet}
                    />
                )}
            </div>
        </div>
    );
}

interface OverlayProps {
    touched: boolean;
    circuit: CircuitData;
    detail?: Turn;
    kin: Set<number>;
    sheet?: SheetKind;
    state: LayerState;
    tags: Layer[];
    theme: Theme;
    turn?: number;
    units: Units;
    onCloseSheet: () => void;
    onOpenSheet: (sheet: SheetKind) => void;
    onReset: () => void;
    onSelect: (turn?: number) => void;
    onTheme: (theme: Theme) => void;
    onToggle: (id: string, on: boolean) => void;
    onUnits: (units: Units) => void;
}
