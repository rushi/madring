import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vitest/config";
import { seedMarkup, type Seedable } from "./scripts/seed.ts";

const buildId = process.env.GITHUB_SHA?.slice(0, 7) ?? "dev";
const base = process.env.GITHUB_ACTIONS ? "/madring/" : "/";

/**
 * Puts a simplified lap in the served HTML. Without it a cold visitor waits for the module bundle
 * and then the 73 KB data bundle behind it before anything is drawn; the marker is replaced at
 * serve time so the geometry still comes from content and nothing circuit-shaped is committed.
 */
function trackSeed(): Plugin {
    return {
        name: "madring-track-seed",
        transformIndexHtml: {
            order: "post",
            handler(html, ctx) {
                const bundle = readBundle();
                const preload = `<link rel="preload" href="${ctx.server ? "/" : base}data/circuit.v1.json?v=${buildId}" as="fetch" crossorigin />`;
                /* Both are replacement strings, where a $ in the copy would be read as a capture reference. */
                const markup = seedMarkup(bundle, ctx.server ? "/" : base);
                const analytics = ctx.server ? "" : ANALYTICS_TAG;
                const seeded = html
                    .replace(SEED_MARKER, () => markup)
                    .replace(DATA_MARKER, () => preload)
                    .replace(ANALYTICS_MARKER, () => analytics);

                return ctx.bundle ? inlineStyles(seeded, ctx.bundle) : seeded;
            },
        },
    };
}

/** The bundle is generated and gitignored, so a bare `vite` in a fresh clone has nothing to read. */
function readBundle() {
    const bundlePath = fileURLToPath(new URL("./public/data/circuit.v1.json", import.meta.url));

    try {
        return JSON.parse(readFileSync(bundlePath, "utf8")) as Seedable;
    } catch (cause) {
        throw new Error(`the lap cannot be seeded without the bundle. run pnpm ingest first. ${String(cause)}`);
    }
}

/**
 * The stylesheet is the last thing standing between the served HTML and a drawn lap: the browser
 * cannot paint until it has it, and finding it inside the HTML costs a second round trip on a slow
 * connection. At 20 KB for the whole site it is cheaper carried than fetched, so it goes inline and
 * the file it came from is dropped from the build rather than shipped unreferenced.
 */
function inlineStyles(html: string, bundle: Record<string, { type: string; fileName: string; source?: unknown }>) {
    let inlined = html;

    for (const asset of Object.values(bundle)) {
        if (asset.type !== "asset" || !asset.fileName.endsWith(".css")) {
            continue;
        }

        const link = new RegExp(`<link[^>]+href="[^"]*${asset.fileName.replace(/[.*+?^$()|[\]\\]/g, "\\$&")}"[^>]*>`);
        if (!link.test(inlined)) {
            continue;
        }

        inlined = inlined.replace(link, `<style>${String(asset.source)}</style>`);
        delete bundle[asset.fileName];
    }

    return inlined;
}

const SEED_MARKER = "<!--lap-seed-->";
/* The bundle is fetched by the module that draws the map, so without this the browser learns it
   exists only once 80 KB of JavaScript has parsed and run. Named here, it rides down beside it. */
const DATA_MARKER = "<!--data-preload-->";
/* Only from a built site: a dev server would report localhost traffic against the same property.
   The measurement id names the property, not a visitor, and ships in the page anyway. */
const ANALYTICS_MARKER = "<!--analytics-->";
const ANALYTICS_ID = "G-M7JDK2XWZ7";
const ANALYTICS_TAG = [
    `<script async src="https://www.googletagmanager.com/gtag/js?id=${ANALYTICS_ID}"></script>`,
    `<script>`,
    `window.dataLayer = window.dataLayer || [];`,
    `function gtag(){dataLayer.push(arguments);}`,
    `gtag('js', new Date());`,
    `gtag('config', '${ANALYTICS_ID}');`,
    `</script>`,
].join("");

export default defineConfig({
    base,
    plugins: [react(), trackSeed()],
    define: { __BUILD_ID__: JSON.stringify(buildId) },
    server: { allowedHosts: ["shinobi.local"] },
    resolve: {
        alias: {
            "~": fileURLToPath(new URL("./src", import.meta.url)),
            "#content": fileURLToPath(new URL("./content", import.meta.url)),
        },
    },
    test: { environment: "node", include: ["src/**/*.test.ts", "scripts/**/*.test.ts", "content/**/*.test.ts"] },
});
