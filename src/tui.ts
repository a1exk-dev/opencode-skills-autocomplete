export function sortSkills<Skill extends { name: string }>(
    skills: readonly Skill[],
): Skill[] {
    return [...skills].sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
    );
}

const BUILT_IN = "<built-in>";

export function originTag(
    location: string,
    paths: { directory: string; worktree: string },
): "(user)" | "(project)" | "(built-in)" {
    if (location === BUILT_IN) return "(built-in)";
    if (isUnder(paths.worktree, location) || isUnder(paths.directory, location))
        return "(project)";
    return "(user)";
}

function isUnder(base: string, path: string): boolean {
    return path === base || path.startsWith(`${base}/`);
}

export const DEFAULT_HOTKEY = "ctrl+k";

export type HotkeyResult =
    | { ok: true; hotkey: string }
    | { ok: false; error: string };

export function parseHotkey(
    options: Record<string, unknown> | undefined,
): HotkeyResult {
    const value = options?.hotkey;
    if (value === undefined) return { ok: true, hotkey: DEFAULT_HOTKEY };
    if (typeof value !== "string")
        return { ok: false, error: "hotkey must be a string" };
    // Keybind validity is decided by keymap registration, per spec an invalid value is a registration failure (warn+skip)
    return { ok: true, hotkey: value.trim() };
}

export function pasteText(name: string): string {
    return `/${name} `;
}
