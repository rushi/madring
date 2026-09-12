/** Every figure on the surface goes through here, so the unit toggle never needs a second code path. */
export type Units = "metric" | "imperial";

const KM_PER_MILE = 1.609_344;
const METRES_PER_YARD = 0.9144;
const METRES_PER_FOOT = 0.3048;

export const toMiles = (km: number) => km / KM_PER_MILE;
export const toYards = (metres: number) => metres / METRES_PER_YARD;
export const toFeet = (metres: number) => metres / METRES_PER_FOOT;

const round = (value: number, places = 0) => Number(value.toFixed(places));

/** Speeds read as whole numbers in both systems: nobody quotes a corner entry to a decimal. */
export function speed(kmh: number, units: Units) {
    return units === "metric" ? Math.round(kmh) : Math.round(toMiles(kmh));
}

/** Short distances: metres under metric, yards under imperial. Braking zones and corner lengths. */
export function distance(metres: number, units: Units) {
    return units === "metric" ? Math.round(metres) : Math.round(toYards(metres));
}

/** Lap-scale distances keep three decimals in km, two in miles, matching how each is published. */
export function longDistance(km: number, units: Units) {
    return units === "metric" ? round(km, 3) : round(toMiles(km), 2);
}

export function altitude(metres: number, units: Units) {
    return units === "metric" ? Math.round(metres) : Math.round(toFeet(metres));
}

export function speedRun(entryKmh: number | null, apexKmh: number | null, units: Units) {
    if (entryKmh === null || apexKmh === null) {
        return undefined;
    }
    return `${speed(entryKmh, units)}»${speed(apexKmh, units)}`;
}

type Copy = Record<string, string>;

const unitLabel = (kind: string, units: Units, copy: Copy) => copy[`units.${kind}.${units}`] ?? "";

export const speedUnit = (units: Units, copy: Copy) => unitLabel("speed", units, copy);
export const distanceUnit = (units: Units, copy: Copy) => unitLabel("distance", units, copy);
export const altitudeUnit = (units: Units, copy: Copy) => unitLabel("altitude", units, copy);
export const longUnit = (units: Units, copy: Copy) => unitLabel("long", units, copy);

/** Which way a corner goes, spelled out. Three surfaces ask for it; none of them owns the wording. */
export const turnDirection = (dir: string, copy: Copy) => copy[dir === "L" ? "turn.leftLong" : "turn.rightLong"] ?? "";

/** Gradients are a ratio, so they are identical in both systems. */
export const gradient = (percent: number) => `${percent > 0 ? "+" : ""}${round(percent, 1)}%`;
