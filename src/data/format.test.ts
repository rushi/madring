import { describe, expect, it } from "vitest";
import { altitude, distance, gradient, longDistance, speed, speedRun } from "./format.ts";

describe("units", () => {
    it("converts the published top speed", () => {
        expect(speed(340, "metric")).toBe(340);
        expect(speed(340, "imperial")).toBe(211);
    });

    it("converts the published lap length without losing its precision", () => {
        expect(longDistance(5.416, "metric")).toBe(5.416);
        expect(longDistance(5.416, "imperial")).toBe(3.37);
    });

    it("converts the two published straights", () => {
        expect(distance(589, "metric")).toBe(589);
        expect(distance(589, "imperial")).toBe(644);
        expect(distance(837, "imperial")).toBe(915);
    });

    it("converts the elevation band", () => {
        expect(altitude(671, "metric")).toBe(671);
        expect(altitude(697, "imperial")).toBe(2287);
    });

    it("formats a braking run in both systems", () => {
        expect(speedRun(340, 80, "metric")).toBe("340»80");
        expect(speedRun(340, 80, "imperial")).toBe("211»50");
    });

    it("has no run to show when a speed is unpublished", () => {
        expect(speedRun(null, 80, "metric")).toBeUndefined();
        expect(speedRun(340, null, "imperial")).toBeUndefined();
    });

    it("leaves gradients alone, a ratio is unitless", () => {
        expect(gradient(8)).toBe("+8%");
        expect(gradient(-5)).toBe("-5%");
    });
});
