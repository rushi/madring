import type { CircuitData } from "../data/types.ts";

/** The px sweep is the experiment input, not a token. */
const SIZES = [10, 11, 12, 13, 14] as const;

const HATCH = "repeating-linear-gradient(45deg, rgb(0 0 0 / 22%) 0 4px, transparent 4px 9px), var(--md-hl-banked)";

const GROUNDS = [
    { id: "paper", label: "PAPER", background: "var(--md-paper)", color: "var(--md-ink)" },
    { id: "asphalt", label: "ASPHALT", background: "var(--md-asphalt)", color: "var(--md-edge)" },
    { id: "dye", label: "CRASH DYE", background: "var(--md-hl-crash)", color: "var(--md-paper)" },
    { id: "hatch", label: "BANKED HATCH", background: HATCH, color: "var(--md-ink)" },
] as const;

/**
 * The legibility check at `?specimen`: every map label over each ground it can land on, plated and
 * bare, so the 12 px floor is measured rather than asserted.
 */
export function TypeSpecimen({ circuit }: { circuit: CircuitData }) {
    const samples = circuit.turns.slice(0, 6);

    return (
        <main className="specimen">
            <header>
                <h1 className="sign masthead">Type specimen</h1>
                <p className="specimen-note">
                    Anybody for numerals, Archivo for labels. Read this at arm&rsquo;s length on a phone. If any row
                    below 12 px is ambiguous, the floor holds and the row is cut, not shrunk.
                </p>
            </header>

            {GROUNDS.map((ground) => (
                <section key={ground.id} className="specimen-section">
                    <h2 className="sign specimen-heading">{ground.label}</h2>
                    <div style={{ background: ground.background, color: ground.color }} className="specimen-ground">
                        {SIZES.map((size) => (
                            <Row key={size} size={size} samples={samples} />
                        ))}

                        <hr className="specimen-rule" />

                        {SIZES.map((size) => (
                            <Row key={`plated-${size}`} plated size={size} samples={samples} />
                        ))}
                    </div>
                </section>
            ))}
        </main>
    );
}

function Row({ plated = false, size, samples }: { plated?: boolean; size: number; samples: CircuitData["turns"] }) {
    return (
        <div className="specimen-row">
            <span className="sign tabular specimen-size">
                {size}px {plated ? "plated" : "bare"}
            </span>
            {samples.map((turn) => (
                <Sample key={turn.n} plated={plated} size={size} turn={turn} />
            ))}
        </div>
    );
}

function Sample({ plated, size, turn }: { plated: boolean; size: number; turn: CircuitData["turns"][number] }) {
    const { entryKmh, apexKmh } = turn.speed;
    const caption = entryKmh && apexKmh ? `${entryKmh}–${apexKmh}` : (turn.name ?? "no name");

    return (
        <span className={plated ? "specimen-sample is-plated" : "specimen-sample"}>
            <b className="map-numeral" style={{ fontSize: size }}>
                {turn.n}
            </b>
            <span className="map-label tabular" style={{ fontSize: size }}>
                {caption}
            </span>
        </span>
    );
}
