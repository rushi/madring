import { describe, expect, it } from "vitest";
import { tipRoom } from "./CircuitMap.tsx";
import { slide } from "./TurnTip.tsx";

const room = (left: number, right: number, up = 100) => ({ up, left, right });

describe("holding the tip plate inside the frame", () => {
    it("leaves the plate centred on its corner when both sides have room", () => {
        expect(slide(100, room(400, 400))).toBe(0);
    });

    it("slides right by exactly what the left edge cuts off", () => {
        expect(slide(100, room(20, 400))).toBe(30);
    });

    it("slides left by exactly what the right edge cuts off", () => {
        expect(slide(100, room(400, 20))).toBe(-30);
    });

    /* A frame narrower than the plate cannot hold it; the left edge is the one that must not clip. */
    it("keeps the left edge visible when the plate is wider than the frame", () => {
        expect(slide(100, room(20, 20))).toBe(30);
    });
});

const frame = { cx: 100, cy: 100, ox: 0, oy: 0, scale: 1, mapDeg: 0, frameW: 200, frameH: 200 };

describe("room around a corner, measured on screen", () => {
    it("measures each edge from the anchor when the plan is flat", () => {
        expect(tipRoom({ x: 120, y: 130 }, frame)).toEqual({ up: 130, left: 120, right: 80 });
    });

    /* Upright turns the plan a quarter, so the drawing's x is what the screen reads as height. */
    it("swaps the axes when the plan is turned upright", () => {
        expect(tipRoom({ x: 120, y: 130 }, { ...frame, mapDeg: 90 })).toEqual({ up: 120, left: 70, right: 130 });
    });

    it("reports room in screen px, so a zoomed-in map has more of it", () => {
        expect(tipRoom({ x: 120, y: 130 }, { ...frame, scale: 2 })).toEqual({ up: 260, left: 240, right: 160 });
    });
});
