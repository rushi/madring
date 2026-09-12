/** Content strings with named holes: `fill("{on} of {total} on", { on: 3, total: 5 })`. */
export function fill(text: string, params: Record<string, string | number>) {
    return text.replaceAll(/\{(\w+)\}/g, (whole, key: string) => {
        return Object.hasOwn(params, key) ? String(params[key]) : whole;
    });
}
