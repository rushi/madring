import { useEffect } from "react";
import { useShallow } from "zustand/shallow";
import type { LayerState } from "../data/types.ts";
import type { CircuitState } from "../store/useCircuitStore.ts";
import { formatLayerParam, useCircuitStore } from "../store/useCircuitStore.ts";

/**
 * Every piece of state worth sharing is a link. Pages serves no rewrites, so this rides the query
 * string, and replaces rather than pushes: flicking a layer is not a navigation the back button
 * should have to unwind one step at a time. Reading happens in the store; this only writes.
 */
export function useUrlSync(known: LayerState, overlay: boolean) {
    const { turn, units, panelOpen } = useCircuitStore(
        useShallow((state: CircuitState) => ({ turn: state.turn, units: state.units, panelOpen: state.panelOpen })),
    );

    useEffect(() => {
        const params = new URLSearchParams();
        // Only the switches that disagree with content, so a link stays short and keeps following it.
        const layers = formatLayerParam(known);
        if (layers) {
            params.set("layers", layers);
        }
        if (turn) {
            params.set("turn", String(turn));
        }
        /* The panel exists only on wide viewports; below that the param would describe nothing. */
        if (!overlay && !panelOpen) {
            params.set("panel", "off");
        }
        params.set("units", units === "imperial" ? "mi" : "km");

        globalThis.history.replaceState(null, "", `?${params}`);
    }, [known, turn, units, panelOpen, overlay]);
}
