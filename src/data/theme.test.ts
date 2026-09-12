import { describe, expect, it } from "vitest";
import { readTheme, stampTheme, THEME_ATTR } from "./theme.ts";

function fakeRoot() {
    const attributes = new Map<string, string>();
    return {
        attributes,
        setAttribute: (name: string, value: string) => void attributes.set(name, value),
        removeAttribute: (name: string) => void attributes.delete(name),
    };
}

describe("reading a stored theme", () => {
    it("takes a theme it recognises", () => {
        expect(readTheme("dark")).toBe("dark");
        expect(readTheme("light")).toBe("light");
    });

    /* A value from an older build, a typo, or nothing at all must not pin the page to one palette. */
    it("falls back to following the OS for anything else", () => {
        expect(readTheme("sepia")).toBe("system");
        expect(readTheme(null)).toBe("system");
        expect(readTheme(undefined)).toBe("system");
    });
});

describe("stamping the choice on the root", () => {
    it("names the palette the visitor picked", () => {
        const root = fakeRoot();
        stampTheme(root, "dark");
        expect(root.attributes.get(THEME_ATTR)).toBe("dark");
    });

    /* Absent is what hands the decision back: the token sheet's media query only wins unopposed. */
    it("leaves no attribute at all when the OS is to decide", () => {
        const root = fakeRoot();
        stampTheme(root, "light");
        stampTheme(root, "system");
        expect(root.attributes.has(THEME_ATTR)).toBe(false);
    });
});
