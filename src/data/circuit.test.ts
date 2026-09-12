import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
    buildGeometry,
    decodeFloat32,
    metresAt,
    normalAt,
    offsetPath,
    offsetPoint,
    pointAt,
    tAtMetres,
} from "./geometry.ts";
import type { CircuitData } from "./types.ts";

const data = JSON.parse(readFileSync(resolve(process.cwd(), "public/data/circuit.v1.json"), "utf8")) as CircuitData;
const geometry = buildGeometry(data);

const pointsIn = (d: string) => {
    const pairs = d.match(/-?\d+\.\d+,-?\d+\.\d+/g) ?? [];
    return pairs.map((pair) => pair.split(",").map(Number) as [number, number]);
};

describe("bundle", () => {
    it("carries 22 turns and a closed lap", () => {
        expect(data.turns).toHaveLength(22);
        expect(data.turns.map((turn) => turn.n)).toEqual(Array.from({ length: 22 }, (_, i) => i + 1));
    });

    it("measures the lap the content declares", () => {
        expect(metresAt(geometry, 1)).toBeCloseTo(data.lengthM, 0);
        expect(data.lengthM).toBe(data.facts.lengthKm * 1000);
    });

    // The one literal in this file. Derived-only assertions would pass happily on a content typo,
    // so the published F1.com figure is pinned here and nowhere else.
    it("still agrees with the published 5.416 km", () => {
        expect(data.facts.lengthKm).toBe(5.416);
    });

    it("closes the polyline back on the start line", () => {
        const [x0, y0] = pointAt(geometry, 0);
        const [x1, y1] = pointAt(geometry, 1);
        expect(Math.hypot(x1 - x0, y1 - y0)).toBeLessThan(2);
    });
});

describe("geometry", () => {
    it("round-trips t through metres", () => {
        for (let i = 0; i < 1000; i += 1) {
            const t = i / 999;
            const back = tAtMetres(geometry, metresAt(geometry, t));
            expect(Math.abs(back - t)).toBeLessThan(1e-3);
        }
    });

    it("puts every turn within 25 px of its published position", () => {
        for (const turn of data.turns) {
            const [x, y] = pointAt(geometry, turn.t);
            expect(Math.hypot(x - turn.x, y - turn.y), `T${turn.n}`).toBeLessThan(25);
        }
    });

    it("orders turns monotonically around the lap", () => {
        const distances = data.turns.map((turn) => turn.s);
        for (let i = 1; i < distances.length; i += 1) {
            expect(distances[i]!, `T${i + 1}`).toBeGreaterThan(distances[i - 1]!);
        }
    });
});

describe("elevation reconstruction", () => {
    const s = decodeFloat32(data.elevation.sB64);
    const alt = decodeFloat32(data.elevation.altB64);

    it("is flagged as reconstructed", () => {
        expect(data.elevation.reconstructed).toBe(true);
    });

    it("spans exactly the published low and high points", () => {
        expect(Math.min(...alt)).toBeCloseTo(data.facts.elevation.lowM, 1);
        expect(Math.max(...alt)).toBeCloseTo(data.facts.elevation.highM, 1);
        expect(s[0]).toBe(0);
        expect(s[s.length - 1]).toBeCloseTo(data.lengthM, 0);
    });

    it("puts the low and the crest at the turns the content names", () => {
        const { lowM, lowTurn, highM, highTurn } = data.facts.elevation;
        const low = data.turns.find((turn) => turn.n === lowTurn)!;
        const high = data.turns.find((turn) => turn.n === highTurn)!;
        expect(low.altitudeReconM).toBeCloseTo(lowM, 0);
        expect(high.altitudeReconM).toBeCloseTo(highM, 0);
    });

    it("climbs about 10 m over the published climb, as the reports describe", () => {
        const { climbFrom, climbTo } = data.facts.elevation;
        const foot = data.turns.find((turn) => turn.n === climbFrom)!;
        const crest = data.turns.find((turn) => turn.n === climbTo)!;
        const climb = crest.altitudeReconM - foot.altitudeReconM;
        expect(climb).toBeGreaterThan(7);
        expect(climb).toBeLessThan(14);
    });

    it("closes around the lap", () => {
        expect(Math.abs(alt[0]! - alt[alt.length - 1]!)).toBeLessThan(0.5);
    });
});

describe("what sits beside the lap", () => {
    it("keeps the normal a unit vector, so an offset in px really is that many px", () => {
        for (let i = 0; i < 200; i += 1) {
            const [nx, ny] = normalAt(geometry, i / 199);
            expect(Math.hypot(nx, ny)).toBeCloseTo(1, 6);
        }
    });

    it("puts an offset point exactly that far off the track", () => {
        const t = 0.42;
        const [x, y] = pointAt(geometry, t);
        const [ox, oy] = offsetPoint(geometry, t, 40);
        expect(Math.hypot(ox - x, oy - y)).toBeCloseTo(40, 6);
    });

    it("reverses with the sign, so the two sides of the lap are one number apart", () => {
        const [ax, ay] = offsetPoint(geometry, 0.42, 40);
        const [bx, by] = offsetPoint(geometry, 0.42, -40);
        expect(Math.hypot(bx - ax, by - ay)).toBeCloseTo(80, 6);
    });

    /* The pit lane leaves the track before the start line and rejoins after it. */
    it("runs a wrapped offset the short way round, not back across the whole lap", () => {
        const points = pointsIn(offsetPath(geometry, 0.99, 0.02, 44, 8));
        const hops = points.slice(1).map(([x, y], i) => Math.hypot(x - points[i]![0], y - points[i]![1]));
        expect(Math.max(...hops)).toBeLessThan(data.totalPx / 8);
    });

    /*
     * Offsetting a curve tighter than the offset folds the copy back through itself, and the fold
     * prints as a knot. It showed up as a tangle of pit lane over turns 1 to 3.
     */
    it("drops the samples that fold back, rather than drawing the knot", () => {
        const hairpin = pointsIn(offsetPath(geometry, 0.46, 0.54, 120, 40));
        const straight = pointsIn(offsetPath(geometry, 0.02, 0.09, 120, 40));

        expect(hairpin.length).toBeLessThan(straight.length);
        expect(hairpin.length).toBeGreaterThan(1);
    });

    it("keeps every sample where the lap is straight enough to offset cleanly", () => {
        expect(pointsIn(offsetPath(geometry, 0.02, 0.09, 44, 12))).toHaveLength(13);
    });
});

describe("segments", () => {
    it("stay inside the lap parameter", () => {
        for (const segment of data.segments) {
            expect(segment.t0, segment.id).toBeGreaterThanOrEqual(0);
            expect(segment.t1, segment.id).toBeLessThanOrEqual(1);
            expect(segment.lengthM, segment.id).toBeGreaterThan(0);
        }
    });

    it("gives every highlight at least one segment to flood", () => {
        const highlights = data.layerGroups.flatMap((group) => group.layers).filter((layer) => layer.segmentSets);
        for (const layer of highlights) {
            const matching = data.segments.filter((segment) => layer.segmentSets!.includes(segment.set));
            expect(matching.length, layer.id).toBeGreaterThan(0);
        }
    });
});

describe("F3 incident log", () => {
    it("reconciles per-turn contacts with the published total", () => {
        const located = data.turns.reduce((sum, turn) => sum + turn.f3.contacts, 0);
        expect(located + data.facts.f3Test.unlocatedContacts).toBe(data.facts.f3Test.wallHits);
    });

    it("keeps the red-flag breakdown adding up", () => {
        const { contacts, mechanical, spins, unspecified } = data.facts.f3Test.breakdown;
        expect(contacts + mechanical + spins + unspecified).toBe(data.facts.f3Test.redFlags);
    });

    it("records T7 as the worst corner and T12 as clean", () => {
        const worst = [...data.turns].sort((a, b) => b.f3.contacts - a.f3.contacts)[0]!;
        expect(worst.n).toBe(data.facts.f3Test.worstTurn);
        expect(data.turns.find((turn) => turn.n === 12)!.f3.contacts).toBe(0);
    });
});

describe("provenance", () => {
    it("marks every speed as a projection until a race happens", () => {
        for (const turn of data.turns) {
            expect(["projection", "observed"]).toContain(turn.speed.source);
        }
    });

    it("carries its sources", () => {
        expect(data.sources.length).toBeGreaterThan(5);
    });
});
