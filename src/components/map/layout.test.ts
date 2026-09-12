import { describe, expect, it } from "vitest";
import type { LabelBox } from "./layout.ts";
import { placeLabels } from "./layout.ts";

const box = (id: string, cx: number, cy: number): LabelBox => ({ id, cx, cy, dx: 40, dy: 0, w: 30, h: 20 });

const rectOf = (at: { x: number; y: number }, w = 30, h = 20) => ({
    x0: at.x - w / 2,
    y0: at.y - h / 2,
    x1: at.x + w / 2,
    y1: at.y + h / 2,
});

const clash = (a: ReturnType<typeof rectOf>, b: ReturnType<typeof rectOf>) => {
    return a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;
};

describe("label placement", () => {
    it("leaves a label exactly where content asked when nothing is in the way", () => {
        const placed = placeLabels([box("a", 100, 100)]);
        expect(placed.get("a")).toEqual({ x: 140, y: 100 });
    });

    it("answers for every label it was given", () => {
        const boxes = Array.from({ length: 22 }, (_, i) => box(`t${i}`, 100, 100 + i));
        const placed = placeLabels(boxes);
        expect(placed.size).toBe(22);
    });

    /* The reported bug: corners a few px apart printed their numbers on top of each other. */
    it("separates two labels whose corners nearly coincide", () => {
        const placed = placeLabels([box("a", 100, 100), box("b", 104, 102)]);
        expect(clash(rectOf(placed.get("a")!), rectOf(placed.get("b")!))).toBe(false);
    });

    it("separates a whole cluster, not just the first pair", () => {
        const cluster = [box("a", 100, 100), box("b", 104, 102), box("c", 108, 99), box("d", 96, 103)];
        const placed = placeLabels(cluster);
        const rects = cluster.map((item) => rectOf(placed.get(item.id)!));

        for (const [i, rect] of rects.entries()) {
            for (const other of rects.slice(i + 1)) {
                expect(clash(rect, other)).toBe(false);
            }
        }
    });

    /* A label that moved still has to point at its own corner, or the leader lies. */
    it("pushes a label straight out along its leader, never sideways", () => {
        const placed = placeLabels([box("a", 100, 100), box("b", 100, 104)]);
        const moved = placed.get("b")!;
        expect(moved.y).toBeCloseTo(104);
        expect(moved.x).toBeGreaterThan(140);
    });

    it("places in the order it was given, so the same map draws the same way twice", () => {
        const first = placeLabels([box("a", 100, 100), box("b", 104, 102)]);
        const again = placeLabels([box("a", 100, 100), box("b", 104, 102)]);
        expect(again.get("b")).toEqual(first.get("b"));
        expect(first.get("a")).toEqual({ x: 140, y: 100 });
    });

    it("still answers for a label whose leader has no length", () => {
        const placed = placeLabels([{ id: "a", cx: 10, cy: 10, dx: 0, dy: 0, w: 30, h: 20 }]);
        expect(placed.get("a")).toEqual({ x: 10, y: 10 });
    });
});

/*
 * A dropped label is a design choice for decoration and an accessibility bug for a corner badge,
 * so the solver must report which boxes it could not place. The map turns a missing badge into a
 * bare target at the corner; this is the seam that tells it one is missing.
 */
describe("what the solver could not place", () => {
    /* Wider than the whole travel the leader allows, so no step can clear the one already placed. */
    const wide = (id: string) => ({ ...box(id, 100, 100), w: 400 });

    it("leaves an unplaceable optional label out of the answer", () => {
        const placed = placeLabels([wide("a"), { ...wide("b"), optional: true }]);
        expect(placed.has("a")).toBe(true);
        expect(placed.has("b")).toBe(false);
    });

    it("keeps a mandatory label even where it has to overlap", () => {
        const placed = placeLabels([wide("a"), wide("b")]);
        expect(placed.has("b")).toBe(true);
    });

    it("keeps an optional label that only reaches past the frame, since spill is not a collision", () => {
        const bounds = { x0: 0, y0: 0, x1: 120, y1: 120 };
        const placed = placeLabels([{ ...box("a", 100, 100), optional: true }], bounds);
        expect(placed.has("a")).toBe(true);
    });
});
