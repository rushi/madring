import { describe, expect, it } from "vitest";
import { interpolate } from "./interpolate.ts";

const copy = {
    "units.speed.metric": "km/h",
    "units.speed.imperial": "mph",
    "units.distance.metric": "m",
    "units.distance.imperial": "yd",
    "units.altitude.metric": "m",
    "units.altitude.imperial": "ft",
};

describe("prose figures", () => {
    it("follows the chosen system", () => {
        const note = "{speed:340} » {speed:80} after the {dist:589} straight";
        expect(interpolate(note, "metric", copy)).toBe("340 km/h » 80 km/h after the 589 m straight");
        expect(interpolate(note, "imperial", copy)).toBe("211 mph » 50 mph after the 644 yd straight");
    });

    it("reads heights in feet, not yards", () => {
        expect(interpolate("{alt:697}", "imperial", copy)).toBe("2287 ft");
        expect(interpolate("{rise:26}", "imperial", copy)).toBe("85 ft");
    });

    it("leaves prose without tokens alone", () => {
        expect(interpolate("Blind crest, wall close on exit", "imperial", copy)).toBe(
            "Blind crest, wall close on exit",
        );
    });

    it("leaves gradients alone, a ratio is unitless", () => {
        expect(interpolate("8% climb", "imperial", copy)).toBe("8% climb");
    });
});
