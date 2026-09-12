import type { NamedRun } from "./types.ts";

/** The named sequence a corner belongs to. T15 is part of Enlazadas de Valdebebas, which is 14-16. */
export function runContaining(runs: NamedRun[], turn?: number) {
    if (turn === undefined) {
        return undefined;
    }

    return runs.find((run) => turn >= run.from && turn <= run.to);
}

/**
 * The rest of the sequence a selected corner belongs to, the corner itself excluded, so picking
 * "14-16" out of the key marks what the key just said rather than lighting T14 alone. A corner
 * that is its own whole sequence has no kin, so a single-corner name stays quiet.
 */
export function kinOf(runs: NamedRun[], turn?: number) {
    const run = runContaining(runs, turn);
    if (!run || run.from === run.to) {
        return new Set<number>();
    }

    const span = Array.from({ length: run.to - run.from + 1 }, (_, i) => run.from + i);
    return new Set(span.filter((n) => n !== turn));
}
