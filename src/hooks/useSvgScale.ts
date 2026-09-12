import { useEffect, useState, type RefObject } from "react";

const EMPTY = { width: 0, height: 0 };

/** Rendered size of the drawing surface. The map derives its own scale and framing from this. */
export function useSvgBox(ref: RefObject<SVGSVGElement | null>) {
    const [box, setBox] = useState(EMPTY);

    useEffect(() => {
        const element = ref.current;
        if (!element) {
            return;
        }

        const observer = new ResizeObserver(([entry]) => {
            const { width = 0, height = 0 } = entry?.contentRect ?? {};
            if (width <= 0 || height <= 0) {
                return;
            }

            setBox((current) => {
                const settled = Math.abs(width - current.width) < 1 && Math.abs(height - current.height) < 1;
                return settled ? current : { width, height };
            });
        });

        observer.observe(element);
        return () => observer.disconnect();
    }, [ref]);

    return box;
}

/**
 * Scale and framing for a lap of `lapW` x `lapH` drawing units inside a box, leaving `gutter`
 * screen px clear on every side for the badges that stand off the track.
 *
 * The gutter has to be screen px, because what sits in it is screen-px labels, and a padding fixed
 * in drawing units covers twice as little on a tablet as on a desktop. That makes the framing
 * circular: the pad depends on the scale, which depends on the frame. Solving it rather than
 * iterating avoids a resize feedback loop, and `s = (W - 2g) / lapW` falls straight out of
 * `s * (lapW + 2g / s) = W`.
 */
export function fitLap(box: Box, lapW: number, lapH: number, gutter: number) {
    if (box.width <= 0 || box.height <= 0) {
        return { scale: 1, upright: false, w: lapW + gutter * 2, h: lapH + gutter * 2 };
    }

    /*
     * Turning the lap a quarter is a question of which way round it fits, not how wide the window
     * is: a portrait tablet is wide enough for a desktop layout and still wastes a third of its
     * height on an unrotated lap. Both fits are measured and the roomier one wins.
     */
    const flat = fitOneWay(box, lapW, lapH, gutter);
    const turned = fitOneWay(box, lapH, lapW, gutter);
    const upright = turned.scale > flat.scale;
    const { scale, w, h } = upright ? turned : flat;

    return { scale, upright, w, h };
}

function fitOneWay(box: Box, lapW: number, lapH: number, gutter: number) {
    const across = (box.width - gutter * 2) / lapW;
    const down = (box.height - gutter * 2) / lapH;
    const scale = Math.max(Math.min(across, down), 0.01);
    const pad = gutter / scale;

    return { scale, w: lapW + pad * 2, h: lapH + pad * 2 };
}

export interface Box {
    width: number;
    height: number;
}
