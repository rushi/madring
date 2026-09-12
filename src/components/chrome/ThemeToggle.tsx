import { THEMES } from "../../data/theme.ts";
import type { Theme } from "../../data/theme.ts";
import type { Copy } from "../../data/types.ts";

/** All three states visible at once, so handing the decision back to the OS is one click, not a hunt. */
export function ThemeToggle({ theme, copy, onChange }: Props) {
    return (
        <fieldset className="units">
            <legend className="visually-hidden">{copy["theme.label"]}</legend>
            {THEMES.map((option) => (
                <button
                    key={option}
                    type="button"
                    aria-current={theme === option}
                    className={theme === option ? "unit is-active sign" : "unit sign"}
                    onClick={() => onChange(option)}
                >
                    {copy[`theme.${option}`]}
                </button>
            ))}
        </fieldset>
    );
}

interface Props {
    theme: Theme;
    copy: Copy;
    onChange: (theme: Theme) => void;
}
