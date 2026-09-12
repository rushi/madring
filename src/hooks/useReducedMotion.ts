import { useMediaQuery } from "./useMediaQuery.ts";

export function useReducedMotion() {
    return useMediaQuery("(prefers-reduced-motion: reduce)");
}
