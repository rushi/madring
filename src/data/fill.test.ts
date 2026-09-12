import { describe, expect, it } from "vitest";
import { fill } from "./fill.ts";

describe("fill", () => {
    it("substitutes named holes", () => {
        expect(fill("{on} of {total} on", { on: 3, total: 5 })).toBe("3 of 5 on");
    });

    it("leaves an unknown token in place", () => {
        expect(fill("{on} of {total} on", { on: 3 })).toBe("3 of {total} on");
    });

    it("returns a tokenless string unchanged", () => {
        expect(fill("Layers", { on: 3 })).toBe("Layers");
    });

    it("substitutes the same token twice and keeps string params", () => {
        expect(fill("{prev} · {next} · {prev}", { prev: "T3", next: "T5" })).toBe("T3 · T5 · T3");
    });

    it("passes a token naming a prototype key through unchanged", () => {
        expect(fill("{toString}", {})).toBe("{toString}");
    });
});
