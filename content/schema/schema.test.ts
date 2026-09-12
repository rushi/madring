import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { geometryFileSchema, layerGroupSchema, layerSchema, segmentSchema, turnsFileSchema } from "./index.ts";

const segment = { id: "hazard.x", set: "hazard", turn: 12, label: "T12", t0: 0.4, t1: 0.5 } as const;

describe("segments", () => {
    it("accepts a real stretch", () => {
        expect(segmentSchema.safeParse(segment).success).toBe(true);
    });

    it("rejects a zero-length stretch, which would dye the whole lap", () => {
        expect(segmentSchema.safeParse({ ...segment, t1: segment.t0 }).success).toBe(false);
    });

    it("rejects a turn number no lap has", () => {
        expect(segmentSchema.safeParse({ ...segment, turn: 23 }).success).toBe(false);
        expect(segmentSchema.safeParse({ ...segment, turn: 0 }).success).toBe(false);
    });
});

const group = {
    id: "highlights",
    label: "Highlights",
    layers: [
        { id: "overtake", label: "Overtaking zones", default: true, livery: "hl-overtake", fill: "solid" },
        { id: "names", label: "Corner names", default: false },
    ],
} as const;

describe("layer groups", () => {
    it("accepts a group whose layers mix dyed and plain switches", () => {
        expect(layerGroupSchema.safeParse(group).success).toBe(true);
    });

    it("rejects a group with no layers, which would print an empty heading", () => {
        expect(layerGroupSchema.safeParse({ ...group, layers: [] }).success).toBe(false);
    });

    it("rejects a group nothing on the map is grouped by", () => {
        expect(layerGroupSchema.safeParse({ ...group, id: "weather" }).success).toBe(false);
    });

    it("rejects a fill no texture is built for", () => {
        const layers = [{ ...group.layers[0], fill: "tartan" }];
        expect(layerGroupSchema.safeParse({ ...group, layers }).success).toBe(false);
    });
});

describe("layers", () => {
    it("keeps an optional compact default on a layer", () => {
        const layer = { id: "notes", label: "Speed notes", default: true, compactDefault: false };
        expect(layerSchema.parse(layer).compactDefault).toBe(false);
    });
});

describe("turns", () => {
    it("parses the real content/turns.json", () => {
        const file = JSON.parse(readFileSync(new URL("../turns.json", import.meta.url), "utf8"));
        expect(turnsFileSchema.safeParse(file).success).toBe(true);
    });

    it("rejects turns out of lap order, which index walks and run derivation would misread", () => {
        const file = JSON.parse(readFileSync(new URL("../turns.json", import.meta.url), "utf8"));
        [file.turns[3], file.turns[4]] = [file.turns[4], file.turns[3]];
        expect(turnsFileSchema.safeParse(file).success).toBe(false);
    });
});

describe("geometry", () => {
    it("parses the real content/geometry.json", () => {
        const geometry = JSON.parse(readFileSync(new URL("../geometry.json", import.meta.url), "utf8"));
        expect(geometryFileSchema.safeParse(geometry).success).toBe(true);
    });
});
