import { describe, expect, it } from "vitest";
import { kinOf, runContaining } from "./runs.ts";
import type { NamedRun } from "./types.ts";

const runs: NamedRun[] = [
    { name: "Hortaleza", from: 3, to: 3 },
    { name: "Subida de las Cárcavas", from: 6, to: 7 },
    { name: "Enlazadas de Valdebebas", from: 14, to: 16 },
];

describe("the sequence a corner belongs to", () => {
    it("finds the run from any corner inside it, not just the first", () => {
        expect(runContaining(runs, 14)?.name).toBe("Enlazadas de Valdebebas");
        expect(runContaining(runs, 15)?.name).toBe("Enlazadas de Valdebebas");
        expect(runContaining(runs, 16)?.name).toBe("Enlazadas de Valdebebas");
    });

    it("finds nothing for a corner no name covers", () => {
        expect(runContaining(runs, 5)).toBeUndefined();
        expect(runContaining(runs, 17)).toBeUndefined();
    });

    it("finds nothing when no corner is selected", () => {
        expect(runContaining(runs, undefined)).toBeUndefined();
    });
});

describe("the rest of the sequence", () => {
    /* Picking "14-16" out of the key marks the whole range, not just the corner clicked. */
    it("marks the other corners of the run, whichever one was picked", () => {
        expect(kinOf(runs, 14)).toEqual(new Set([15, 16]));
        expect(kinOf(runs, 15)).toEqual(new Set([14, 16]));
        expect(kinOf(runs, 16)).toEqual(new Set([14, 15]));
    });

    it("never includes the selected corner, which is marked as the selection instead", () => {
        expect(kinOf(runs, 15).has(15)).toBe(false);
    });

    it("marks nothing for a corner that is its own whole sequence", () => {
        expect(kinOf(runs, 3)).toEqual(new Set());
    });

    it("marks nothing for a corner with no name at all", () => {
        expect(kinOf(runs, 5)).toEqual(new Set());
        expect(kinOf(runs, undefined)).toEqual(new Set());
    });
});
