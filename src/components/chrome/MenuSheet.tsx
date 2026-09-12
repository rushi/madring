import { useRef } from "react";
import type { Theme } from "../../data/theme.ts";
import type { CircuitData } from "../../data/types.ts";
import { useSheetFocus } from "../../hooks/useSheetFocus.ts";
import { ThemeToggle } from "./ThemeToggle.tsx";

/** Theme, and nothing else: the about group sits in the layers sheet, beside the switches it describes. */
export function MenuSheet({ data, theme, onTheme, onClose }: Props) {
    const { copy } = data;
    const sheet = useRef<HTMLElement>(null);
    useSheetFocus(sheet, ".topbar-menu");

    return (
        <section
            ref={sheet}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-label={copy["menu.label"]}
            className="sheet menu-sheet"
        >
            <div className="sheet-grip" />
            <div className="sheet-body">
                <ThemeToggle theme={theme} copy={copy} onChange={onTheme} />
                {/* Never unmounted: a button that vanishes on click drops focus to body inside an aria-modal dialog. */}
                <button type="button" className="panel-reset" onClick={onClose}>
                    {copy["sheet.close"]}
                </button>
            </div>
        </section>
    );
}

interface Props {
    theme: Theme;
    data: CircuitData;
    onClose: () => void;
    onTheme: (theme: Theme) => void;
}
