import type { Copy } from "../../data/types.ts";

/** Who drew the map. It sits in the page's chrome, in view at every size, not behind a sheet. */
export function Colophon({ copy }: { copy: Copy }) {
    return (
        <p className="colophon">
            {copy["author.prefix"]}{" "}
            <a href={copy["author.url"]} title={copy["author.title"]} target="_blank" rel="noreferrer noopener me">
                {copy["author.name"]}
            </a>
        </p>
    );
}
