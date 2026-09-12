import { useEffect, useRef } from "react";
import { altitude, altitudeUnit, gradient, speed, speedUnit, turnDirection } from "../../data/format.ts";
import type { Units } from "../../data/format.ts";
import { interpolate } from "../../data/interpolate.ts";
import type { CircuitData, Turn } from "../../data/types.ts";

/** One corner, everything true about it, reachable by pointer and keyboard alike. */
export function TurnDetail({ data, turn, units, onClose }: Props) {
    const { copy } = data;
    const panel = useRef<HTMLElement>(null);

    /* Opening from the map or the board has to announce itself, not just appear beside them. */
    useEffect(() => {
        panel.current?.focus();
    }, [turn.n]);
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
                <div className="detail-title">
                    <h2 className="detail-name sign">{turn.name ?? `${copy["turn.prefix"]} ${turn.n}`}</h2>
                    <p className="detail-dir">
                        {direction}
                        {turn.angleDeg !== null && `${copy["turn.separator"]}${turn.angleDeg}°`}
                    </p>
                </div>
                <button type="button" aria-label={copy["detail.close"]} className="detail-close sign" onClick={onClose}>
                    <span aria-hidden="true">✕</span>
                </button>
            </header>

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
    data: CircuitData;
    turn: Turn;
    units: Units;
    onClose: () => void;
}
