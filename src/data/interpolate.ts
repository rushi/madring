import { altitude, altitudeUnit, distance, distanceUnit, longDistance, longUnit, speed, speedUnit } from "./format.ts";
import type { Units } from "./format.ts";

const TOKEN = /\{(speed|plain|dist|long|alt|rise):(-?\d+(?:\.\d+)?)\}/g;

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
            /* The open end of a speed range: it converts like a speed but the unit belongs to the pair. */
            case "plain":
                return String(speed(value, units));
            case "dist":
                return `${distance(value, units)} ${distanceUnit(units, copy)}`;
            case "long":
                return `${longDistance(value, units)} ${longUnit(units, copy)}`;
            default:
                return `${altitude(value, units)} ${altitudeUnit(units, copy)}`;
        }
    });
}

/** A run of prose, flagged when content marked it for emphasis with `*stars*`. */
export interface Part {
    text: string;
    lead: boolean;
}

const LEAD = /\*([^*]+)\*/g;

/**
 * The same prose split into runs, so a caller can render the marked figures heavier than the words
 * around them. Content decides what is marked, which keeps the emphasis out of the components.
 */
export function interpolateParts(text: string, units: Units, copy: Record<string, string>): Part[] {
    const parts: Part[] = [];
    let at = 0;

    for (const match of text.matchAll(LEAD)) {
        if (match.index > at) {
            parts.push({ text: interpolate(text.slice(at, match.index), units, copy), lead: false });
        }
        parts.push({ text: interpolate(match[1] ?? "", units, copy), lead: true });
        at = match.index + match[0].length;
    }

    if (at < text.length) {
        parts.push({ text: interpolate(text.slice(at), units, copy), lead: false });
    }
    return parts;
}
