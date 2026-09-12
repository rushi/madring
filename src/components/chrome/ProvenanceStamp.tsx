import type { CircuitData } from "../../data/types.ts";

/** This circuit has never been raced. The page says so where the figures are, not in a footnote. */
export function ProvenanceStamp({ data }: { data: CircuitData }) {
    const ingested = new Date(data.generatedAt).toISOString().slice(0, 10);

    return (
        <details className="provenance">
            <summary className="sign">
                {data.copy["provenance.prefix"]} {ingested}
            </summary>
            <p>{data.copy["stamp.projection.full"]}</p>
            <ul>
                {data.sources.map((source) => (
                    <li key={source}>{source}</li>
                ))}
            </ul>
        </details>
    );
}
