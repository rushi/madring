import type { CircuitData } from "./types.ts";

/**
 * The bundle is emitted by `pnpm ingest` into public/data. It is fetched rather
 * than imported so a deployed correction can be made by replacing one file, and
 * the build id busts the cache on every deploy.
 */
export async function loadCircuit(): Promise<CircuitData> {
    const url = `${import.meta.env.BASE_URL}data/circuit.v1.json?v=${__BUILD_ID__}`;
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`circuit bundle ${response.status} at ${url}`);
    }
    const raw = (await response.json()) as CircuitData;

    if (raw.schemaVersion !== 1) {
        throw new Error(`circuit bundle is schema ${raw.schemaVersion}, this build reads 1`);
    }
    return raw;
}
