/**
 * Which palette the page wears. "system" is not a third palette: it is the absence of a choice,
 * which lets the OS keep deciding, and it has to stay reachable or a visitor who picks once can
 * never hand the decision back.
 */
export type Theme = "system" | "light" | "dark";

export const THEMES: Theme[] = ["system", "light", "dark"];

/** The key the page stores its choice under, and the attribute the token sheet reads. */
export const THEME_KEY = "madring.theme";
export const THEME_ATTR = "data-theme";

const isTheme = (value: unknown): value is Theme => THEMES.includes(value as Theme);

/** Anything unrecognised goes back to following the OS, so a stale value cannot pin the page. */
export const readTheme = (raw: unknown): Theme => (isTheme(raw) ? raw : "system");

/**
 * The token sheet keys off `data-theme` on the root, and its dark block is written as
 * `:root:not([data-theme="light"])` inside a `prefers-color-scheme` query. So the attribute
 * present means an override, and the attribute absent means the query decides.
 */
export function stampTheme(root: Stamped, theme: Theme) {
    if (theme === "system") {
        root.removeAttribute(THEME_ATTR);
        return;
    }

    root.setAttribute(THEME_ATTR, theme);
}

/** The root element, narrowed to what stamping needs, so the choice is testable without a DOM. */
export interface Stamped {
    setAttribute: (name: string, value: string) => void;
    removeAttribute: (name: string) => void;
}
