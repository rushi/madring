import { describe, expect, it } from "vitest";
import { parsePath, seedMarkup, seedPath, simplify } from "./seed.ts";

const bbox = { x: 0, y: 0, w: 200, h: 100 };
const facts = { name: "Madring" };
const copy = {
    "panel.hide": "Hide panel",
    "units.metric": "KM",
    "units.imperial": "MI",
    "theme.system": "AUTO",
    "theme.light": "DAY",
    "theme.dark": "NIGHT",
    "units.label": "Units",
    "theme.label": "Theme",
    "units.long.metric": "km",
    "site.question": "What does one lap of the Madring hold?",
    "site.headline": "Twenty-two corners over {long:5.416}.",
};

describe("parsePath", () => {
    it("reads the M/L pairs the ingest emits", () => {
        expect(parsePath("M 1.5,2.5 L 3,4 L 5,6")).toEqual([
            { x: 1.5, y: 2.5 },
            { x: 3, y: 4 },
            { x: 5, y: 6 },
        ]);
    });

    it("keeps the point the closing Z is attached to", () => {
        expect(parsePath("M 0,0 L 3,4 L 0,0 Z")).toHaveLength(3);
    });
});

describe("simplify", () => {
    it("drops points that sit on the line between their neighbours", () => {
        const straight = [
            { x: 0, y: 0 },
            { x: 5, y: 0 },
            { x: 10, y: 0 },
        ];
        expect(simplify(straight, 2)).toHaveLength(2);
    });

    it("keeps a point that stands further off than the tolerance", () => {
        const kinked = [
            { x: 0, y: 0 },
            { x: 5, y: 9 },
            { x: 10, y: 0 },
        ];
        expect(simplify(kinked, 2)).toHaveLength(3);
    });

    it("keeps both ends of a lap that is mostly straight", () => {
        const points = Array.from({ length: 500 }, (_, index) => ({ x: index, y: 0 }));
        expect(simplify(points, 2)).toEqual([
            { x: 0, y: 0 },
            { x: 499, y: 0 },
        ]);
    });
});

describe("seedPath", () => {
    it("writes whole units and starts with a single move", () => {
        const d = seedPath("M 0.4,0.4 L 4.6,9.5 L 10.2,0.1");
        expect(d).toBe("M0 0L5 10L10 0Z");
    });

    it("closes the ring with Z rather than repeating the start", () => {
        expect(seedPath("M 0,0 L 5,9 L 10,0 L 0,0 Z")).toBe("M0 0L5 9L10 0Z");
    });
});

describe("seedMarkup", () => {
    const markup = seedMarkup({ bbox, copy, facts, pathD: "M 0,0 L 100,90 L 200,0 L 0,0 Z" });

    it("frames the lap both ways round, the upright one swapping the sides", () => {
        expect(markup).toContain('viewBox="-18 -18 236 136"');
        expect(markup).toContain('data-upright="32 -68 136 236"');
    });

    it("strokes the same path twice, as the road treatment does", () => {
        expect(markup.match(/class="track-edge"/g)).toHaveLength(1);
        expect(markup.match(/class="track-asphalt"/g)).toHaveLength(1);
    });

    it("turns the plan about the lap's own centre", () => {
        expect(markup).toContain("rotate(90 100 50)");
    });

    it("writes the standfirst out with its figures already in kilometres", () => {
        expect(markup).toContain("Twenty-two corners over 5.416 km.");
    });

    /* Changing the column count from script shifts a stage the browser has already painted. */
    it("opens the panel beside the map and leaves the breakpoint to CSS", () => {
        expect(markup).toContain('data-panel="open"');
        expect(markup).not.toContain("innerWidth");
    });

    /* The window is not the frame: the masthead and the panel move the crossover far enough that a
       band of ordinary window sizes would paint the lap one way round and then spin it. */
    it("decides which way round the lap goes from the map frame, not the window", () => {
        expect(markup).toContain('stage.querySelector(".map-frame").getBoundingClientRect()');
        expect(markup).not.toContain("innerHeight > innerWidth");
    });
});
