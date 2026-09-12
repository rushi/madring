import { z } from "zod";

const SCHEMA_VERSION = 1;
const version = z.literal(SCHEMA_VERSION);

export const anchorSchema = z.enum(["start", "middle", "end"]);
export const directionSchema = z.enum(["L", "R"]);
export const speedSourceSchema = z.enum(["projection", "observed"]);

const turnNumber = z.int().min(1).max(22);
/** A position on the lap. 0 is the start line, 1 is the same point one lap later. */
const trackPoint = z.number().min(0).max(1);

/** A rotated slab beside the lap: the pit building and the paddock are both drawn this way. */
const blockSchema = z.object({
    anchorT: trackPoint,
    offsetPx: z.number(),
    lengthPx: z.number().positive(),
    widthPx: z.number().positive(),
});

export const turnSchema = z.object({
    n: turnNumber,
    name: z.string().nullable(),
    dir: directionSchema,
    t: trackPoint,
    x: z.number(),
    y: z.number(),
    label: z.object({ dx: z.number(), dy: z.number(), anchor: anchorSchema }),
    speed: z.object({
        entryKmh: z.int().nullable(),
        apexKmh: z.int().nullable(),
        source: speedSourceSchema,
    }),
    angleDeg: z.number().nullable(),
    flags: z.object({ overtaking: z.boolean(), crashProne: z.boolean(), banked: z.boolean() }),
    /**
     * F3 test, 25-26 Aug 2026. Per-turn counts come from the published incident
     * logs; `contacts` means wall or barrier contact. One contact was reported
     * without a corner and is counted in the circuit aggregate, in no turn.
     */
    f3: z.object({
        contacts: z.int().min(0),
        spins: z.int().min(0),
        mechanical: z.int().min(0),
        total: z.int().min(0),
        drivers: z.array(z.string()),
        dispute: z.string().nullable(),
    }),
    altitudeM: z.number().nullable(),
    note: z.string(),
    overtakingRank: z.int().nullable(),
    quotes: z.array(z.object({ text: z.string(), who: z.string(), source: z.string() })),
});

export const turnsFileSchema = z.object({ schemaVersion: version, turns: z.array(turnSchema).length(22) });

export const segmentSetSchema = z.enum(["braking", "hazard", "banked", "elevation", "straightMode", "overtakeMode"]);

export const segmentSchema = z
    .object({
        id: z.string(),
        set: segmentSetSchema,
        turn: turnNumber.nullable(),
        label: z.string(),
        why: z.string().optional(),
        t0: trackPoint,
        t1: trackPoint,
    })
    /** A zero-length stretch would dash out to the whole lap, dyeing the circuit end to end. */
    .refine((segment) => segment.t0 !== segment.t1, { message: "t0 and t1 are the same point" });

export const segmentsFileSchema = z.object({ schemaVersion: version, segments: z.array(segmentSchema).min(1) });

export const circuitFileSchema = z.object({
    schemaVersion: version,
    name: z.string(),
    official: z.string(),
    location: z.string(),
    debut: z.string(),
    contract: z.string(),
    designers: z.string(),
    lengthKm: z.number().positive(),
    turns: z.int(),
    laps: z.int(),
    raceDistanceKm: z.number(),
    topSpeedKmh: z.int(),
    fiaGrade: z.int(),
    elevation: z.object({
        lowM: z.number(),
        lowTurn: z.int(),
        highM: z.number(),
        highTurn: z.int(),
        climbPct: z.number(),
        climbFrom: z.int(),
        climbTo: z.int(),
        descentPct: z.number(),
        descentFrom: z.int(),
        descentTo: z.int(),
    }),
    sections: z.record(z.string(), z.string()),
    /** Canvas-space anchors, not track positions: a half of the circuit has no single point on the lap. */
    sectionLabels: z.array(z.object({ id: z.string(), label: z.string(), x: z.number(), y: z.number() })),
    straights: z.array(
        z.object({
            name: z.string(),
            lengthM: z.number(),
            from: z.int(),
            to: z.int(),
            straightMode: z.boolean(),
            /** Signed distance from the lap, along the normal, that the straight's label sits at. */
            labelOffsetPx: z.number(),
            note: z.string(),
        }),
    ),
    tunnels: z.array(z.looseObject({ id: z.int(), t: trackPoint, label: z.string(), note: z.string() })),
    pitPaddock: z.object({
        garages: z.int(),
        buildingLabel: z.string(),
        paddockLabel: z.string(),
        paddockNote: z.string(),
        entryT: trackPoint,
        exitT: trackPoint,
        /** The lane runs beside the lap: an offset copy of the track between two points on it. */
        lane: z.object({ t0: trackPoint, t1: trackPoint, offsetPx: z.number() }),
        building: blockSchema,
        block: blockSchema,
    }),
    laMonumental: z.object({
        turn: z.int(),
        lengthM: z.number(),
        bankingPct: z.number(),
        bankingDeg: z.number(),
        entryKmh: z.string(),
        midKmh: z.number(),
        durationS: z.number(),
    }),
    aero: z.object({
        straightModeZones: z.array(z.string()),
        overtakeMode: z.object({ detection: z.string(), activation: z.string() }),
        banNote: z.string(),
    }),
    overtakingZones: z.array(z.int()),
    designOvertakingZonesOfficial: z.array(z.int()),
    f3Test: z.object({
        date: z.string(),
        redFlags: z.int(),
        wallHits: z.int(),
        drivers: z.int(),
        breakdown: z.object({ contacts: z.int(), mechanical: z.int(), spins: z.int(), unspecified: z.int() }),
        unlocatedContacts: z.int(),
        unlocatedNote: z.string(),
        worstTurn: z.int(),
        noContactsAt: z.array(z.int()),
    }),
    ratings: z.object({
        source: z.string(),
        estimated: z.boolean(),
        difficulty: z.int(),
        technical: z.int(),
        physical: z.int(),
        weather: z.int(),
        overtakingDifficulty: z.int(),
    }),
});

export const fillSchema = z.enum(["solid", "hatch45", "stipple", "dashed", "chevron"]);
/**
 * One switch on the map. A highlight layer also carries the ink it paints with: its dye, its fill
 * pattern, the stretches it dyes and the turn flag that decides which corners it rings. A label or
 * scenery layer carries none of that, because it only switches drawing that is already authored.
 */
export const layerSchema = z.object({
    id: z.string(),
    label: z.string(),
    default: z.boolean(),
    livery: z.string().optional(),
    fill: fillSchema.optional(),
    glow: z.boolean().optional(),
    segmentSets: z.array(segmentSetSchema).optional(),
    /** Closed set: a typo here would silently ring no corner at all, and ingest could not tell. */
    turnFlag: z.enum(["flags.overtaking", "flags.crashProne", "flags.banked"]).optional(),
});

export const layerGroupSchema = z.object({
    id: z.enum(["highlights", "labels", "scenery"]),
    label: z.string(),
    layers: z.array(layerSchema).min(1),
});

export const layersFileSchema = z.object({ schemaVersion: version, groups: z.array(layerGroupSchema).min(1) });
export const copyFileSchema = z.object({ schemaVersion: version, copy: z.record(z.string(), z.string()) });
/** Each source carries the link it came from, so the panel can send a reader to it. */
const sourceSchema = z.object({ url: z.url(), label: z.string().min(1) });

export const sourcesFileSchema = z.object({ schemaVersion: version, sources: z.array(sourceSchema).min(1) });

export const geometryFileSchema = z.object({
    schemaVersion: version,
    canvas: z.object({ width: z.number().positive(), height: z.number().positive() }),
    trackPath: z.string().min(1),
});

export const typeRoleSchema = z.object({
    face: z.enum(["sign", "text"]),
    px: z.number().min(12),
    wght: z.int(),
    wdthFloor: z.number().optional(),
    tracking: z.number().optional(),
    numeric: z.string().optional(),
});

const hexColor = z.string().regex(/^#[0-9A-Fa-f]{6}$/);

export const themeFileSchema = z.object({
    schemaVersion: version,
    color: z.object({
        light: z.record(z.string(), hexColor),
        dark: z.record(z.string(), hexColor),
    }),
    type: z.object({
        sign: z.object({ family: z.string(), stack: z.string(), wdthMin: z.number(), wdthMax: z.number() }),
        text: z.object({ family: z.string(), stack: z.string() }),
        minPx: z.number(),
        roles: z.record(z.string(), typeRoleSchema),
    }),
    motion: z.record(z.string(), z.number()),
    /** A number is px. A string carries its own unit, so viewport and percentage values survive. */
    layout: z.record(z.string(), z.union([z.number(), z.string()])),
    space: z.record(z.string(), z.number()),
});

export type Turn = z.infer<typeof turnSchema>;
export type Segment = z.infer<typeof segmentSchema>;
export type Layer = z.infer<typeof layerSchema>;
export type LayerGroup = z.infer<typeof layerGroupSchema>;
export type CircuitFacts = z.infer<typeof circuitFileSchema>;
export type Theme = z.infer<typeof themeFileSchema>;
export type Fill = z.infer<typeof fillSchema>;
export type GeometryFile = z.infer<typeof geometryFileSchema>;
