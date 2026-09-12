import { altitude, altitudeUnit, distance, distanceUnit, longDistance, longUnit, speed, speedUnit } from "./format.ts";
import type { Units } from "./format.ts";

const TOKEN = /\{(speed|dist|long|alt|rise):(-?\d+(?:\.\d+)?)\}/g;

/**
 * Prose carries figures too, so authors write `{speed:340}` in content and the unit follows the
 * visitor's choice. Gradients stay percentages: a ratio is the same in both systems.
 */
export function interpolate(text: string, units: Units, copy: Record<string, string>) {
    return text.replaceAll(TOKEN, (_, kind: string, raw: string) => {
        const value = Number(raw);

        switch (kind) {
            case "speed":
                return `${speed(value, units)} ${speedUnit(units, copy)}`;
            case "dist":
                return `${distance(value, units)} ${distanceUnit(units, copy)}`;
            case "long":
                return `${longDistance(value, units)} ${longUnit(units, copy)}`;
            default:
                return `${altitude(value, units)} ${altitudeUnit(units, copy)}`;
        }
    });
}
