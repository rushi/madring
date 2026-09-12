import { useEffect, useRef } from "react";
import { altitude, altitudeUnit, gradient, speed, speedUnit, turnDirection } from "../../data/format.ts";
import type { Units } from "../../data/format.ts";
import { interpolate } from "../../data/interpolate.ts";
import type { CircuitData, Layer, Turn } from "../../data/types.ts";
import { shortLabel } from "../../layers/resolve.ts";
import { LayerSwatch } from "../layers/LayerSwatch.tsx";
import { dyeStyle } from "../map/place.ts";

/** One corner, everything true about it, reachable by pointer and keyboard alike. */
export function TurnDetail({ data, turn, tags, units, onClose }: Props) {
    const { copy } = data;
    const panel = useRef<HTMLElement>(null);
    const latest = useRef(turn.n);

    /* Opening from the map or the board has to announce itself, not just appear beside them. */
    useEffect(() => {
        latest.current = turn.n;
        panel.current?.focus();
    }, [turn.n]);

    /* Closing drops the card from the DOM, so the focus it took goes back to the corner's badge. */
    useEffect(() => {
        return () => {
            const badge = document.querySelector(`[data-turn="${latest.current}"]`);
            if (badge instanceof HTMLElement || badge instanceof SVGElement) {
                badge.focus();
            }
        };
    }, []);

    const { entryKmh, apexKmh } = turn.speed;
    const hasRun = entryKmh !== null && apexKmh !== null;
    const direction = turnDirection(turn.dir, copy);

    return (
        <aside
            ref={panel}
            tabIndex={-1}
            aria-label={`${copy["turn.prefix"]} ${turn.n}`}
            aria-live="polite"
            className="detail"
        >
            <header className="detail-head">
                <p className="detail-number sign">T{turn.n}</p>
                <h2 className="detail-name sign">{turn.name ?? `${copy["turn.prefix"]} ${turn.n}`}</h2>
                <button type="button" aria-label={copy["detail.close"]} className="detail-close sign" onClick={onClose}>
                    <span aria-hidden="true">✕</span>
                </button>
            </header>

            {/* Out of the header so the plate and the name share one line, as the sign would read. */}
            <p className="detail-dir">
                {direction}
                {turn.angleDeg !== null && `${copy["turn.separator"]}${turn.angleDeg}°`}
                {turn.flags.banked && `${copy["turn.separator"]}${copy["turn.banked"]}`}
            </p>

            <dl className="detail-figures tabular">
                {hasRun && (
                    <Figure
                        label={copy["detail.speed"]!}
                        value={`${speed(entryKmh, units)} » ${speed(apexKmh, units)}`}
                        unit={speedUnit(units, copy)}
                    />
                )}
                <Figure
                    label={copy["detail.altitude"]!}
                    value={String(altitude(turn.altitudeReconM, units))}
                    unit={altitudeUnit(units, copy)}
                />
                <Figure label={copy["detail.gradient"]!} value={gradient(turn.gradePct)} />
            </dl>

            {/* The F3 log is ingested but unshown: one junior test weekend read beside promoter
                speed projections invites a comparison neither figure can carry. */}
            <p className="detail-note">{interpolate(turn.note, units, copy)}</p>

            {tags.length > 0 && (
                <ul aria-label={copy["detail.tags"]} className="detail-tags">
                    {tags.map((layer) => (
                        <li key={layer.id} style={dyeStyle(layer.livery)} className="detail-tag">
                            <LayerSwatch layer={layer} />
                            {shortLabel(layer)}
                        </li>
                    ))}
                </ul>
            )}
        </aside>
    );
}

function Figure({ label, value, unit }: { label: string; value: string; unit?: string }) {
    return (
        <div className="figure">
            <dt className="sign">{label}</dt>
            <dd>
                {value}
                {unit && <span className="figure-unit"> {unit}</span>}
            </dd>
        </div>
    );
}

interface Props {
    turn: Turn;
    /* The lit highlights claiming this corner, so the card and the drawing agree on what rings it. */
    tags: Layer[];
    units: Units;
    data: CircuitData;
    onClose: () => void;
}
