import type {
    KeyEvent,
    TuiPlugin,
    TuiPluginApi,
} from "@opencode-ai/plugin/tui";

function sortSkills<Skill extends { name: string }>(
    skills: readonly Skill[],
): Skill[] {
    return [...skills].sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
    );
}

const BUILT_IN = "<built-in>";

function originTag(
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

const DEFAULT_HOTKEY = "ctrl+k";

type HotkeyResult = { ok: true; hotkey: string } | { ok: false; error: string };

function parseHotkey(
    options: Record<string, unknown> | undefined,
): HotkeyResult {
    const value = options?.hotkey;
    if (value === undefined) return { ok: true, hotkey: DEFAULT_HOTKEY };
    if (typeof value !== "string")
        return { ok: false, error: "hotkey must be a string" };
    // Keybind validity is decided by keymap registration, per spec an invalid value is a registration failure (warn+skip)
    return { ok: true, hotkey: value.trim() };
}

function pasteText(name: string): string {
    return `/${name} `;
}

const PALETTE_COMMAND = "command.palette.show";

function chordBinding(
    api: Pick<TuiPluginApi, "keymap" | "tuiConfig" | "ui">,
    options: Record<string, unknown> | undefined,
): { key: string; cmd: string } | undefined {
    const parsed = parseHotkey(options);
    if (!parsed.ok) {
        api.ui.toast({
            variant: "warning",
            message: `${parsed.error}; chord skipped, the / menu still works`,
        });
        return undefined;
    }
    const { keymap, tuiConfig } = api;
    // ponytail: exact string compare misses case-variant duplicates like "Ctrl+K" vs "ctrl+k"; normalize via keymap.formatKey if that matters
    if (
        tuiConfig.keybinds.bindings.some(
            (binding) => binding.key === parsed.hotkey,
        )
    ) {
        api.ui.toast({
            variant: "warning",
            message: `hotkey "${parsed.hotkey}" is already bound; chord skipped, the / menu still works`,
        });
        return undefined;
    }
    let parts: readonly unknown[];
    try {
        parts = keymap.parseKeySequence(parsed.hotkey);
    } catch {
        parts = [];
    }
    if (parts.length === 0) {
        api.ui.toast({
            variant: "warning",
            message: `hotkey "${parsed.hotkey}" is not a valid keybind; chord skipped, the / menu still works`,
        });
        return undefined;
    }
    return { key: parsed.hotkey, cmd: PALETTE_COMMAND };
}

const tui: TuiPlugin = async (api, options) => {
    const { data: skills } = await api.client.app.skills<true>(
        {},
        {
            throwOnError: true,
        },
    );
    const paths = {
        directory: api.state.path.directory,
        worktree: api.state.path.worktree,
    };
    const sorted = sortSkills(skills);
    const commands = sorted.map((skill) => ({
        namespace: "palette",
        name: `skill.${skill.name}`,
        title: skill.name,
        desc: originTag(skill.location, paths),
        slashName: skill.name,
        run: async () => {
            await api.client.tui.appendPrompt({ text: pasteText(skill.name) });
        },
    }));
    const binding = chordBinding(api, options);
    api.keymap.registerLayer({ commands, bindings: binding ? [binding] : [] });
    const keypress = (key: KeyEvent) => {
        if (key.name !== "/" || key.ctrl || key.meta || key.option) return;
        const editor = api.renderer.currentFocusedEditor;
        if (!editor || api.ui.dialog.open) return;
        if (editor.cursorOffset === 0 || api.mode.current() === "autocomplete")
            return;
        key.preventDefault();
        const offset = editor.cursorOffset;
        api.ui.dialog.replace(() =>
            api.ui.DialogSelect({
                title: "Skills",
                options: sorted.map((skill) => ({
                    title: `/${skill.name}`,
                    value: skill.name,
                    description: originTag(skill.location, paths),
                })),
                onSelect: (option) => {
                    api.ui.dialog.clear();
                    editor.cursorOffset = offset;
                    const before = editor.plainText.slice(0, offset);
                    editor.insertText(
                        `${before && !/\s$/.test(before) ? " " : ""}/${option.value}${/\s/.test(editor.plainText[offset] ?? "") ? "" : " "}`,
                    );
                },
            }),
        );
    };
    // @opentui/core's KeyHandler extends a node EventEmitter whose types this
    // project does not resolve, so the subscription is typed minimally.
    const keyInput = api.renderer.keyInput as unknown as {
        on: (event: "keypress", handler: (key: KeyEvent) => void) => void;
        off: (event: "keypress", handler: (key: KeyEvent) => void) => void;
    };
    keyInput.on("keypress", keypress);
    api.lifecycle.onDispose(() => keyInput.off("keypress", keypress));
};

// Required for file-path plugin loading; matches the npm package name so the
// plugin id is the same in both load modes.
const id = "opencode-skills-autocomplete";

export default { id, tui };
