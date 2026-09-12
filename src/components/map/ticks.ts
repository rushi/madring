import { plateWidth } from "./place.ts";

/** Screen-px geometry of a corner badge and the speed plate that hangs off the same leader. */
const RING_R = 15;
const BADGE_R = 11.5;
/** Portrait puts the whole lap in a phone's width, where the full-size badge swamps the drawing. */
const COMPACT_RING_R = 11.5;
const COMPACT_BADGE_R = 8.5;
export const TAG_R = 8.5;
export const TAG_OFFSET = 11;
export const NOTE_H = 18;

/** The ring is stroked midway between the two radii, so its weight is the gap between them. */
export function badgeRing(compact: boolean) {
    const ring = compact ? COMPACT_RING_R : RING_R;
    const face = compact ? COMPACT_BADGE_R : BADGE_R;
    const mid = (ring + face) / 2;
    return { face, mid, weight: ring - face, circumference: 2 * Math.PI * mid };
}

/** The badge's footprint has to hold its ring and whatever rides its shoulders. */
export function badgeSpan(compact: boolean) {
    return compact ? COMPACT_RING_R * 2 : (RING_R + TAG_R) * 2;
}
/** One size for every small map label, so the 12 px floor is checked in one place. */
export const LABEL_PX = 12;

export const noteWidth = (note: string) => plateWidth(note, LABEL_PX, 5);
export const plateId = (n: number) => `plate-${n}`;
export const noteId = (n: number) => `note-${n}`;
