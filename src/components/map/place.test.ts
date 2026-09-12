import { describe, expect, it } from "vitest";
import type { Geometry } from "../../data/geometry.ts";
import { alongTrack, facingTravel, mapDegrees, plateWidth, screenLabel } from "./place.ts";

/** A straight run of track. `back` runs the same line the other way, so its tangent is 180 degrees. */
const straight = (back = false): Geometry => {
    const xs = Float64Array.from(back ? [100, 0] : [0, 100]);
    return { xs, ys: Float64Array.from([0, 0]), cum: Float32Array.from([0, 100]), pxPerM: 1, lengthM: 100 };
};

const degreesIn = (transform: string) => Number(/rotate\((-?[\d.]+)\)/.exec(transform)?.[1]);

describe("a sign beside the lap", () => {
    it("lies along the track where the track reads forward", () => {
        expect(degreesIn(alongTrack(straight(), 0.5, 0).transform)).toBeCloseTo(0);
    });

    it("turns the half-turn where the track doubles back, so it never reads upside down", () => {
        expect(degreesIn(alongTrack(straight(true), 0.5, 0).transform)).toBeCloseTo(0);
    });

    /* Portrait lays the plan on its side. The decision has to be made about the screen, not the drawing. */
    it("lands within a quarter turn of level on screen, whichever way the plan is turned", () => {
        const cases = [
            [straight(), 0],
            [straight(true), 0],
            [straight(), 90],
            [straight(true), 90],
        ] as const;

        for (const [geometry, mapDeg] of cases) {
            const onScreen = degreesIn(alongTrack(geometry, 0.5, 0, mapDeg).transform) + mapDeg;
            const level = Math.abs(((((onScreen + 180) % 360) + 360) % 360) - 180);
            expect(level, `map turned ${mapDeg}`).toBeLessThanOrEqual(90);
        }
    });

    it("offsets along the normal, not along the track", () => {
        const { x, y } = alongTrack(straight(), 0.5, 20);
        expect(x).toBeCloseTo(50);
        expect(y).toBeCloseTo(20);
    });
});

describe("a mark that means a direction", () => {
    it("keeps the way the cars go, even where that points it backwards on the page", () => {
        expect(degreesIn(facingTravel(straight(true), 0.5, 0).transform)).toBeCloseTo(180);
    });
});

describe("a label that holds its screen size", () => {
    it("adds no turn while the plan is square on", () => {
        expect(screenLabel(10, 20, 0.5)).toBe("translate(10.0 20.0) scale(0.5)");
    });

    it("undoes the plan's quarter turn so the label still reads across", () => {
        expect(screenLabel(10, 20, 0.5, mapDegrees(true))).toBe("translate(10.0 20.0) scale(0.5) rotate(-90)");
    });
});

describe("a plate sized for its string", () => {
    it("grows with the string, because a label is cut rather than shrunk to fit", () => {
        expect(plateWidth("LONGER NAME", 12)).toBeGreaterThan(plateWidth("T1", 12));
    });

    it("leaves room on both sides of the shortest string there is", () => {
        expect(plateWidth("", 12, 5)).toBe(10);
    });
});
