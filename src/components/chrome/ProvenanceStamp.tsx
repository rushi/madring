import type { CircuitData } from "../../data/types.ts";

/** This circuit has never been raced. The page says so where the figures are, not in a footnote. */
export function ProvenanceStamp({ data }: { data: CircuitData }) {
    return (
        <details className="provenance">
            <summary className="sign">{data.copy["provenance.prefix"]}</summary>
            <p>{data.copy["stamp.projection.full"]}</p>
            <ul>
                {data.sources.map((source) => (
                    <li key={source.url}>
                        <a href={source.url} target="_blank" rel="noreferrer noopener">
                            {source.label}
                        </a>
                    </li>
                ))}
            </ul>
        </details>
    );
}
