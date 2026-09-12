import { beforeEach, describe, expect, it } from "vitest";
import type { CircuitData, Layer, Turn } from "../data/types.ts";
import { formatLayerParam, parseLayerParam, useCircuitStore } from "../store/useCircuitStore.ts";
import { allLayers, highlightsAtTurn, knownOverrides, litHighlights, resolveLayers, segmentsFor } from "./resolve.ts";

const overtake = {
    id: "overtake",
    label: "Overtaking",
    default: true,
    livery: "a",
    turnFlag: "flags.overtaking",
    segmentSets: ["braking"],
};
const crash = {
    id: "crash",
    label: "Crash",
    default: false,
    livery: "b",
    turnFlag: "flags.crashProne",
    segmentSets: ["hazard"],
};
const grid = { id: "grid", label: "Grid", default: false };

const data = {
    layerGroups: [
        { id: "highlights", label: "Highlights", layers: [overtake, crash] },
        { id: "scenery", label: "Scenery", layers: [grid] },
    ],
    segments: [
        { id: "braking.t1", set: "braking" },
        { id: "hazard.t7", set: "hazard" },
    ],
} as unknown as CircuitData;

const turn = { n: 1, flags: { overtaking: true, crashProne: false, banked: false } } as unknown as Turn;

describe("layer state", () => {
    it("gives every layer in content an answer", () => {
        expect(resolveLayers(data, {})).toEqual({ overtake: true, crash: false, grid: false });
    });

    it("lets a visitor's switch beat the authored default in both directions", () => {
        expect(resolveLayers(data, { overtake: false, grid: true })).toEqual({
            overtake: false,
            crash: false,
            grid: true,
        });
    });

    it("ignores an override for a layer content no longer has", () => {
        expect(resolveLayers(data, { retired: true }).retired).toBeUndefined();
    });

    it("flattens groups in authoring order, so stacked ink is predictable", () => {
        expect(allLayers(data).map((layer) => layer.id)).toEqual(["overtake", "crash", "grid"]);
    });
});

describe("switches a link should still carry", () => {
    it("keeps the ones naming a layer content still has", () => {
        expect(knownOverrides(data, { grid: true, crash: false })).toEqual({ grid: true, crash: false });
    });

    /* A retired id was ignored when resolving but rode every link the page wrote afterwards. */
    it("drops one naming a layer content has retired", () => {
        expect(knownOverrides(data, { retired: true, grid: true })).toEqual({ grid: true });
    });

    it("survives having nothing to keep", () => {
        expect(knownOverrides(data, {})).toEqual({});
    });
});

describe("what a lit highlight paints", () => {
    it("counts only highlights, never a scenery switch", () => {
        const lit = litHighlights(data, { overtake: true, crash: true, grid: true });
        expect(lit.map((layer) => layer.id)).toEqual(["overtake", "crash"]);
    });

    it("takes the stretches of its own sets and no others", () => {
        expect(segmentsFor(data, overtake as Layer).map((segment) => segment.id)).toEqual(["braking.t1"]);
    });

    it("floods nothing for a layer that only rings corners", () => {
        expect(segmentsFor(data, grid as Layer)).toEqual([]);
    });

    it("rings a corner only for the flags that corner actually carries", () => {
        const claims = highlightsAtTurn([overtake, crash] as Layer[], turn);
        expect(claims.map((layer) => layer.id)).toEqual(["overtake"]);
    });
});

describe("the layers a link carries", () => {
    it("round-trips a signed list", () => {
        expect(parseLayerParam("+aero,-grid")).toEqual({ aero: true, grid: false });
        expect(formatLayerParam({ grid: false, aero: true })).toBe("+aero,-grid");
    });

    it("writes nothing when the visitor has touched nothing", () => {
        expect(formatLayerParam({})).toBe("");
    });

    it("drops a token with no sign rather than guessing which way it meant", () => {
        expect(parseLayerParam("aero,+grid")).toEqual({ grid: true });
    });

    it("survives an empty or absent parameter", () => {
        expect(parseLayerParam(null)).toEqual({});
        expect(parseLayerParam("")).toEqual({});
    });
});

describe("what a link remembers", () => {
    const store = () => useCircuitStore.getState();
    beforeEach(() => store().resetLayers());

    it("records a switch that disagrees with content", () => {
        store().setLayer("grid", true, false);
        expect(store().layerOverrides).toEqual({ grid: true });
    });

    /* Toggling a layer out and back left a token behind, so a link grew every time it was touched. */
    it("forgets a switch put back to what content asks for", () => {
        store().setLayer("grid", true, false);
        store().setLayer("grid", false, true);
        expect(store().layerOverrides).toEqual({});
    });

    it("keeps the others while one is forgotten", () => {
        store().setLayer("grid", true, false);
        store().setLayer("aero", true, false);
        store().setLayer("grid", false, true);
        expect(store().layerOverrides).toEqual({ aero: true });
    });

    it("drops the lot on reset", () => {
        store().setLayer("grid", true, false);
        store().resetLayers();
        expect(store().layerOverrides).toEqual({});
    });
});

describe("picking a corner", () => {
    const store = () => useCircuitStore.getState();
    beforeEach(() => store().selectTurn(undefined));

    it("opens the corner that was picked", () => {
        store().selectTurn(7);
        expect(store().turn).toBe(7);
    });

    it("closes it again when the same corner is picked twice", () => {
        store().selectTurn(7);
        store().selectTurn(7);
        expect(store().turn).toBeUndefined();
    });

    it("moves straight to another corner rather than closing first", () => {
        store().selectTurn(7);
        store().selectTurn(9);
        expect(store().turn).toBe(9);
    });

    it("still closes when the panel asks outright", () => {
        store().selectTurn(7);
        store().selectTurn(undefined);
        expect(store().turn).toBeUndefined();
    });
});
