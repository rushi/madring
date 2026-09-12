import { beforeEach, describe, expect, it } from "vitest";
import { useCircuitStore } from "./useCircuitStore.ts";

beforeEach(() => useCircuitStore.setState({ sheet: undefined, turn: undefined }));

describe("the sheet", () => {
    it("opens and closes", () => {
        useCircuitStore.getState().openSheet("layers");
        expect(useCircuitStore.getState().sheet).toBe("layers");
        useCircuitStore.getState().closeSheet();
        expect(useCircuitStore.getState().sheet).toBeUndefined();
    });

    it("switching kind replaces rather than stacks", () => {
        useCircuitStore.getState().openSheet("layers");
        useCircuitStore.getState().openSheet("menu");
        expect(useCircuitStore.getState().sheet).toBe("menu");
    });

    it("opening over a corner clears the corner", () => {
        useCircuitStore.setState({ turn: 4 });
        useCircuitStore.getState().openSheet("menu");
        expect(useCircuitStore.getState().turn).toBeUndefined();
    });

    it("picking a corner closes the sheet", () => {
        useCircuitStore.setState({ sheet: "layers" });
        useCircuitStore.getState().selectTurn(4);
        expect(useCircuitStore.getState().sheet).toBeUndefined();
        expect(useCircuitStore.getState().turn).toBe(4);
    });

    it("walking from a corner keeps the new corner and clears the sheet", () => {
        useCircuitStore.setState({ turn: 4, sheet: "layers" });
        useCircuitStore.getState().walkTurn(5);
        expect(useCircuitStore.getState().turn).toBe(5);
        expect(useCircuitStore.getState().sheet).toBeUndefined();
    });
});
