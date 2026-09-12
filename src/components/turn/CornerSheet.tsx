import { useRef, type Ref, type TouchEvent } from "react";
import { fill } from "../../data/fill.ts";
import type { Units } from "../../data/format.ts";
import type { CircuitData, Layer, Turn } from "../../data/types.ts";
import { TurnDetail } from "./TurnDetail.tsx";

/** The corner card as an overlay shell: TurnDetail plus a walk to the next corner. */
export function CornerSheet({ ref, data, turn, tags, units, onClose, onWalk }: Props) {
    const { copy, turns } = data;
    const total = turns.length;
    const touchY = useRef<number>(undefined);
    /* turns is ordered 1-22 in content, so each neighbour sits one index off the turn number. */
    const prev = turn.n > 1 ? turns[turn.n - 2] : undefined;
    const next = turn.n < total ? turns[turn.n] : undefined;

    /* T1 and T22 each lack one neighbour, and the template would leave its separator dangling. */
    const both = prev && next;
    const label = both
        ? fill(copy["detail.prevNext"] ?? "", { prev: walkLabel(prev), next: walkLabel(next) })
        : walkLabel(prev ?? next ?? turn);

    /*
     * Swipe-to-dismiss lives on the grip alone, with touch-action: none: the sheet body scrolls,
     * and a drag that starts in scrollable content belongs to the scroller, not the dismiss
     * gesture. touchend after a scroll has no dismiss semantics, and touchcancel must reset.
     */
    const handleTouchStart = (event: TouchEvent) => {
        touchY.current = event.touches[0]?.clientY;
    };

    const handleTouchEnd = (event: TouchEvent) => {
        const from = touchY.current;
        const to = event.changedTouches[0]?.clientY;
        touchY.current = undefined;
        if (from !== undefined && to !== undefined && to - from > 64) {
            onClose();
        }
    };

    const handleTouchCancel = () => {
        touchY.current = undefined;
    };

    const handleWalkPrev = () => {
        if (prev) {
            onWalk(prev.n);
        }
    };

    const handleWalkNext = () => {
        if (next) {
            onWalk(next.n);
        }
    };

    return (
        <div ref={ref} className="cornersheet">
            <div
                className="sheet-grip"
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
                onTouchCancel={handleTouchCancel}
            />
            <TurnDetail data={data} turn={turn} tags={tags} units={units} onClose={onClose} />
            <nav aria-label={label} className="cornerwalk">
                {prev ? (
                    <button
                        type="button"
                        aria-label={walkLabel(prev)}
                        className="cornerwalk-step"
                        onClick={handleWalkPrev}
                    >
                        <span aria-hidden="true">‹ </span>
                        <WalkLabel step={prev} />
                    </button>
                ) : (
                    <span />
                )}
                <span className="cornerwalk-pos">
                    {turn.n} / {total}
                </span>
                {next ? (
                    <button
                        type="button"
                        aria-label={walkLabel(next)}
                        className="cornerwalk-step"
                        onClick={handleWalkNext}
                    >
                        <WalkLabel step={next} />
                        <span aria-hidden="true"> ›</span>
                    </button>
                ) : (
                    <span />
                )}
            </nav>
        </div>
    );
}

/* The name is a separate run so the right dock can drop it: 320px has no room for a wrapped
   "T11 La Chicane" beside the position, and the button keeps the full text as its label. */
function WalkLabel({ step }: { step: Turn }) {
    return (
        <>
            T{step.n}
            {step.name && <span className="cornerwalk-name"> {step.name}</span>}
        </>
    );
}

function walkLabel(step: Turn) {
    return step.name ? `T${step.n} ${step.name}` : `T${step.n}`;
}

interface Props {
    /* React 19 ref-as-prop: the frame pans by this sheet's measured height, so without it reservePx stays 0. */
    ref?: Ref<HTMLDivElement>;
    turn: Turn;
    tags: Layer[];
    units: Units;
    data: CircuitData;
    onClose: () => void;
    onWalk: (n: number) => void;
}
