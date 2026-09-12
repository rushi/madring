import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { themeFileSchema } from "../content/schema/index.ts";

const root = process.cwd();
const theme = themeFileSchema.parse(JSON.parse(readFileSync(resolve(root, "content/theme.json"), "utf8")));
const css = readFileSync(resolve(root, "src/styles/tokens.generated.css"), "utf8");

const declaredValue = (name: string) => css.match(new RegExp(`--md-${name}:\\s*([^;]+);`))?.[1]?.trim();

describe("generated tokens", () => {
    it("keeps the unit a layout value declared for itself", () => {
        for (const [name, value] of Object.entries(theme.layout)) {
            const expected = typeof value === "number" ? `${value}px` : value;
            expect(declaredValue(name), name).toBe(expected);
        }
    });

    it("never appends px to a value that already carries a unit", () => {
        const mislabelled = [...css.matchAll(/--md-([\w-]+):\s*([^;]+);/g)].filter(([, , value]) => {
            return /(?:vh|vw|rem|em|%|s)px$/.test(value!.trim());
        });
        expect(mislabelled.map(([, name]) => name)).toEqual([]);
    });

    it("emits every colour, space and motion token the theme declares", () => {
        for (const name of Object.keys(theme.color.light)) {
            expect(declaredValue(name), name).toBeDefined();
        }
        for (const name of Object.keys(theme.space)) {
            expect(declaredValue(`space-${name}`), name).toBeDefined();
        }
        for (const name of Object.keys(theme.motion)) {
            expect(declaredValue(name), name).toBe(`${theme.motion[name]}ms`);
        }
    });
});
