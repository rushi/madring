import { create } from "zustand";
import type { Units } from "../data/format.ts";
import { readTheme, THEME_KEY } from "../data/theme.ts";
import type { Theme } from "../data/theme.ts";
import type { LayerState } from "../data/types.ts";

export interface CircuitState {
    /**
     * Only the layers the visitor has touched. Everything else follows the default in content, so
     * re-authoring a default moves the page without invalidating a link somebody already shared.
     */
    layerOverrides: LayerState;
    turn?: number;
    units: Units;
    theme: Theme;
    /** Closed gives the whole stage to the map. */
    panelOpen: boolean;
    setUnits: (units: Units) => void;
    setTheme: (theme: Theme) => void;
    togglePanel: () => void;
    setLayer: (id: string, on: boolean, matchesDefault: boolean) => void;
    resetLayers: () => void;
    selectTurn: (turn?: number) => void;
}

/**
 * The shared link is read once, here, as the store's opening state. Hydrating in an effect instead
 * would race the writer in `useUrlSync`: the first write lands before the effect's state arrives,
 * and the page rewrites a shared link to its own defaults.
 */
const arrival = new URLSearchParams(globalThis.location?.search ?? "");

/** Mirrors `layout.breakpointWide`. The store runs before content loads; `breakpoints.test.ts` keeps them equal. */
export const PANEL_OVERLAY_MAX = 1100;

/**
 * The panel covers the map below the wide breakpoint, so it arrives closed there: principle 5 says
 * the map is legible before it is interactive, and a cold phone arrival must land on the drawing.
 */
function openingPanel(wide: number) {
    const asked = arrival.get("panel");
    if (asked) {
        return asked !== "off";
    }

    return !globalThis.matchMedia?.(`(max-width: ${wide}px)`).matches;
}

/**
 * The palette is the visitor's, not the link's: it says nothing about the circuit, so it stays out
 * of the query string and lives with the browser that made the choice.
 */
function openingTheme() {
    try {
        return readTheme(globalThis.localStorage?.getItem(THEME_KEY));
    } catch {
        /* Storage can throw outright in a locked-down browser; following the OS is the safe read. */
        return readTheme(undefined);
    }
}

/** Kilometres unless the link asks otherwise: every figure here is published in metric. */
const openingUnits = (): Units => (arrival.get("units") === "mi" ? "imperial" : "metric");

/** Bounds are checked against the loaded circuit in `App`, which is the only place that knows them. */
function openingTurn() {
    const at = Number(arrival.get("turn"));
    return Number.isInteger(at) && at >= 1 ? at : undefined;
}

/** `layers=+aero,-grid`: a signed list of the switches that disagree with content. */
export function parseLayerParam(raw: string | null): LayerState {
    if (!raw) {
        return {};
    }

    const overrides: LayerState = {};
    for (const part of raw.split(",")) {
        /* A literal "+" in a hand-typed link decodes as a space, which would drop the token. */
        const token = part.trim();
        const id = token.slice(1);
        if (id && (token.startsWith("+") || token.startsWith("-"))) {
            overrides[id] = token.startsWith("+");
        }
    }

    return overrides;
}

export function formatLayerParam(overrides: LayerState) {
    const entries = Object.entries(overrides).sort(([a], [b]) => a.localeCompare(b));
    return entries.map(([id, on]) => `${on ? "+" : "-"}${id}`).join(",");
}

export const useCircuitStore = create<CircuitState>((set) => ({
    layerOverrides: parseLayerParam(arrival.get("layers")),
    turn: openingTurn(),
    units: openingUnits(),
    theme: openingTheme(),
    panelOpen: openingPanel(PANEL_OVERLAY_MAX),
    setUnits: (units) => set({ units }),
    setTheme: (theme) => {
        try {
            globalThis.localStorage?.setItem(THEME_KEY, theme);
        } catch {
            /* A choice that cannot be stored still has to apply for this visit. */
        }

        set({ theme });
    },
    togglePanel: () => set((state) => ({ panelOpen: !state.panelOpen })),
    setLayer: (id, on, matchesDefault) =>
        set((state) => {
            /* Switching a layer back to what content asks for drops it from the link entirely. */
            const kept = Object.entries(state.layerOverrides).filter(([key]) => key !== id);
            const overrides = Object.fromEntries(matchesDefault ? kept : [...kept, [id, on]]);
            return { layerOverrides: overrides };
        }),
    resetLayers: () => set({ layerOverrides: {} }),
    /* Picking the corner that is already open closes it: the badge is the switch for its own panel. */
    selectTurn: (turn) => set((state) => ({ turn: state.turn === turn ? undefined : turn })),
}));
