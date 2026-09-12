import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { PANEL_OVERLAY_MAX } from "./useCircuitStore.ts";

const theme = JSON.parse(readFileSync(resolve(process.cwd(), "content/theme.json"), "utf8"));

/*
 * The store decides whether the panel arrives open before any content has loaded, so it cannot read
 * `layout.breakpointWide` and carries its own copy. The comment on that constant claimed a test kept
 * the two in step; this is that test.
 */
describe("the breakpoint the store cannot read", () => {
    it("matches the one content authors", () => {
        expect(PANEL_OVERLAY_MAX).toBe(theme.layout.breakpointWide);
    });

    it("is a bare number, so a unit in content cannot slip past the media queries that mirror it", () => {
        expect(typeof theme.layout.breakpointWide).toBe("number");
    });
});
