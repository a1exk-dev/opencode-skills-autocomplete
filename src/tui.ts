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

const DEFAULT_HOTKEY = "ctrl+s";

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

// A "/" opens skill selection only when whitespace or the prompt edge touches it on both sides.
function isStandaloneSlash(text: string, offset: number): boolean {
    const before = text[offset - 1];
    const after = text[offset];
    return (
        (before === undefined || /\s/.test(before)) &&
        (after === undefined || /\s/.test(after))
    );
}

function noWhitespaceBefore(text: string, offset: number): boolean {
    return !/\s/.test(text.slice(0, offset));
}

// OpenCode opens its slash menu while the prompt starts with "/" and no
// whitespace precedes the cursor. A "/" typed at offset 0 becomes that first
// character, so it counts as already inside the first word.
function slashWouldOpenBuiltInMenu(text: string, offset: number): boolean {
    return (
        (offset === 0 || text.startsWith("/")) &&
        noWhitespaceBefore(text, offset)
    );
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

function insertSlashQuietly(
    editor: { cursorOffset: number; insertText: (text: string) => void },
    offset: number,
): void {
    editor.cursorOffset = offset;
    editor.insertText("/");
    // Let OpenCode process the edit with the cursor at the start,
    // or its built-in slash menu opens for the new leading slash.
    editor.cursorOffset = 0;
    void Promise.resolve().then(() => {
        editor.cursorOffset = offset + 1;
    });
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
        const editor = api.renderer.currentFocusedEditor;
        if (
            key.name === "escape" &&
            api.mode.current() === "autocomplete" &&
            editor?.plainText.startsWith("/") &&
            editor.cursorOffset > 0 &&
            noWhitespaceBefore(editor.plainText, editor.cursorOffset)
        ) {
            // OpenCode's slash-menu Esc deletes from the start to the cursor.
            const offset = editor.cursorOffset;
            editor.cursorOffset = 0;
            void Promise.resolve().then(() => {
                editor.cursorOffset = offset;
            });
            return;
        }
        if (key.name !== "/" || key.ctrl || key.meta || key.option) return;
        if (!editor || api.ui.dialog.open) return;
        const offset = editor.cursorOffset;
        // An open built-in menu owns the keystroke, except at the start where
        // the "/" must not keep the menu open.
        if (api.mode.current() === "autocomplete" && offset !== 0) return;
        if (!isStandaloneSlash(editor.plainText, offset)) {
            // Anywhere else the "/" is plain text. Type it ourselves only
            // where OpenCode would turn it into a menu.
            if (slashWouldOpenBuiltInMenu(editor.plainText, offset)) {
                key.preventDefault();
                insertSlashQuietly(editor, offset);
            }
            return;
        }
        // A standalone "/" at the start is OpenCode's own menu.
        if (offset === 0) return;
        key.preventDefault();
        let selected = false;
        api.ui.dialog.replace(
            () =>
                api.ui.DialogSelect({
                    title: "Skills",
                    options: sorted.map((skill) => ({
                        title: `/${skill.name}`,
                        value: skill.name,
                        description: originTag(skill.location, paths),
                    })),
                    onSelect: (option) => {
                        selected = true;
                        api.ui.dialog.clear();
                        editor.cursorOffset = offset;
                        const before = editor.plainText.slice(0, offset);
                        editor.insertText(
                            `${before && !/\s$/.test(before) ? " " : ""}/${option.value}${/\s/.test(editor.plainText[offset] ?? "") ? "" : " "}`,
                        );
                    },
                }),
            () => {
                if (selected) return;
                insertSlashQuietly(editor, offset);
            },
        );
    };
    // Run before OpenCode's Esc handler, which stops propagation. The
    // EventEmitter types are not resolved here, so type the subscription minimally.
    const keyInput = api.renderer.keyInput as unknown as {
        prependListener: (
            event: "keypress",
            handler: (key: KeyEvent) => void,
        ) => void;
        off: (event: "keypress", handler: (key: KeyEvent) => void) => void;
    };
    keyInput.prependListener("keypress", keypress);
    api.lifecycle.onDispose(() => keyInput.off("keypress", keypress));
};

// Required for file-path plugin loading; matches the npm package name so the
// plugin id is the same in both load modes.
const id = "opencode-skills-autocomplete";

export default { id, tui };
