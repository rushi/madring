import { useEffect } from "react";
import type { RefObject } from "react";

/** A sheet's dialog contract: take focus on open, and return it to the control that opened it. */
export function useSheetFocus(ref: RefObject<HTMLElement | null>, invokerSelector: string) {
    useEffect(() => {
        ref.current?.focus();
        return () => {
            /* The invoker is found at close, not at open: the rail unmounts while its sheet is up
             * and remounts in the same commit the sheet leaves, so a node captured earlier is long
             * detached. When a corner opened instead there is no rail, and finding nothing is the guard. */
            const invoker = document.querySelector(invokerSelector);
            if (invoker instanceof HTMLElement) {
                invoker.focus();
            }
        };
    }, [ref, invokerSelector]);
}
