import { useEffect, useState } from "react";

export function useMediaQuery(query: string) {
    const [matches, setMatches] = useState(() => globalThis.matchMedia?.(query).matches ?? false);

    useEffect(() => {
        const list = globalThis.matchMedia?.(query);
        if (!list) {
            return;
        }

        const onChange = () => setMatches(list.matches);

        onChange();
        list.addEventListener("change", onChange);
        return () => list.removeEventListener("change", onChange);
    }, [query]);

    return matches;
}
