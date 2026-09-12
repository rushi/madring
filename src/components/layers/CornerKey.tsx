import { runContaining } from "../../data/runs.ts";
import type { Copy, NamedRun } from "../../data/types.ts";

/**
 * Names live here rather than on the map. Twelve names across 22 corners could not be drawn without
 * covering the drawing they describe, and four of them belong to runs of corners, so printing one
 * per corner said the same name three times. Listed against their numbers, each name is said once
 * and the range it covers becomes readable: 14-16 is one sequence, not three corners that rhyme.
 */
export function CornerKey({ runs, copy, selected, onSelect }: Props) {
    if (!runs.length) {
        return null;
    }

    return (
        <section className="corner-key" aria-label={copy["key.names"]}>
            <h2 className="panel-head sign">{copy["key.names"]}</h2>
            <ul className="corner-key-list">
                {runs.map((run) => {
                    const isSelected = runContaining(runs, selected) === run;

                    return (
                        <li key={run.name}>
                            <button
                                aria-current={isSelected || undefined}
                                type="button"
                                className="corner-key-row"
                                onClick={() => onSelect(run.from)}
                            >
                                <span className="corner-key-range sign">{rangeOf(run, copy)}</span>
                                <span>{run.name}</span>
                            </button>
                        </li>
                    );
                })}
            </ul>
        </section>
    );
}

function rangeOf(run: NamedRun, copy: Copy) {
    return run.from === run.to ? String(run.from) : `${run.from}${copy["key.range"] ?? "-"}${run.to}`;
}

interface Props {
    runs: NamedRun[];
    copy: Copy;
    selected?: number;
    onSelect: (turn: number) => void;
}
