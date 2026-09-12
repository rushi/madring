/** Reads a dotted path out of a row. Board columns and layer flags address fields this way. */
export function fieldAt(row: unknown, path: string): unknown {
    return path.split(".").reduce<unknown>((value, key) => {
        return value === null || typeof value !== "object" ? undefined : (value as Record<string, unknown>)[key];
    }, row);
}
