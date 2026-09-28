import type { TuiPluginApi, TuiPluginMeta } from "@opencode-ai/plugin/tui";
import { createTestKeymap } from "@opentui/keymap/testing";
import { describe, expect, it } from "vitest";
import plugin from "../src/tui";

describe("plugin entry", () => {
    type Skill = {
        name: string;
        location: string;
    };
    type RegisteredCommand = {
        name: string;
        title?: string;
        desc?: string;
        slashName?: string;
        run: (ctx?: unknown) => unknown;
    };
    type RegisteredBinding = {
        key: string;
        cmd?: string;
    };
    type RegisteredLayer = {
        commands?: readonly RegisteredCommand[];
        bindings?: readonly RegisteredBinding[];
    };

    type TestKey = {
        name: string;
        ctrl: boolean;
        meta: boolean;
        option?: boolean;
        preventDefault: () => void;
    };

    function mockApi(
        skills: Skill[],
        extra: { boundKeys?: string[]; invalidKeys?: string[] } = {},
    ) {
        const layers: RegisteredLayer[] = [];
        const appended: string[] = [];
        const toasts: { variant?: string; message: string }[] = [];
        const dialogs: Array<{
            title: string;
            options: { title: string; value: string; description?: string }[];
            onSelect: (option: { value: string }) => void;
        }> = [];
        const keypressHandlers: Array<(key: TestKey) => void> = [];
        const disposed: Array<() => void> = [];
        let mode = "base";
        let dialogOpen = false;
        let onDialogClose: (() => void) | undefined;
        const editor = (plainText: string, cursorOffset: number) => ({
            plainText,
            cursorOffset,
            insertText(text: string) {
                this.plainText =
                    this.plainText.slice(0, this.cursorOffset) +
                    text +
                    this.plainText.slice(this.cursorOffset);
                this.cursorOffset += text.length;
            },
        });
        const renderer: {
            keyInput: {
                prependListener: (
                    event: string,
                    handler: (key: never) => void,
                ) => void;
                off: (event: string, handler: (key: never) => void) => void;
            };
            currentFocusedEditor: ReturnType<typeof editor> | null;
        } = {
            keyInput: {
                prependListener: (event, handler) => {
                    if (event === "keypress")
                        keypressHandlers.unshift(
                            handler as (key: TestKey) => void,
                        );
                },
                off: (event, handler) => {
                    if (event !== "keypress") return;
                    const index = keypressHandlers.indexOf(
                        handler as (key: TestKey) => void,
                    );
                    if (index !== -1) keypressHandlers.splice(index, 1);
                },
            },
            currentFocusedEditor: null,
        };
        const press = (input: Omit<TestKey, "preventDefault">) => {
            let prevented = false;
            const key = {
                ...input,
                preventDefault: () => {
                    prevented = true;
                },
            };
            for (const handler of keypressHandlers) handler(key);
            if (dialogOpen && key.name === "escape") {
                onDialogClose?.();
                dialogOpen = false;
                return prevented;
            }
            if (!prevented && !dialogOpen)
                renderer.currentFocusedEditor?.insertText(key.name);
            return prevented;
        };
        const api = {
            client: {
                app: {
                    skills: async () => ({ data: skills }),
                },
                tui: {
                    appendPrompt: async ({ text }: { text: string }) => {
                        appended.push(text);
                    },
                    submitPrompt: async () => {
                        appended.push("<submitted>");
                    },
                },
            },
            state: { path: { directory: "/repo/src", worktree: "/repo" } },
            tuiConfig: {
                keybinds: {
                    bindings: (extra.boundKeys ?? []).map((key) => ({
                        key,
                        cmd: "command.builtin",
                    })),
                },
            },
            ui: {
                dialog: {
                    get open() {
                        return dialogOpen;
                    },
                    replace: (render: () => unknown, onClose?: () => void) => {
                        dialogOpen = true;
                        onDialogClose = onClose;
                        dialogs.push(render() as (typeof dialogs)[number]);
                    },
                    clear: () => {
                        onDialogClose?.();
                        dialogOpen = false;
                    },
                },
                DialogSelect: (props: (typeof dialogs)[number]) => props,
                toast: (input: { variant?: string; message: string }) => {
                    toasts.push(input);
                },
            },
            mode: { current: () => mode },
            keymap: {
                registerLayer: (layer: RegisteredLayer) => {
                    layers.push(layer);
                    return () => {};
                },
                parseKeySequence: (key: string) => {
                    if (key === "")
                        throw new Error(
                            "Invalid key sequence: sequence cannot be empty",
                        );
                    if (extra.invalidKeys?.includes(key)) return [];
                    return [{ stroke: {}, display: key, match: {} }];
                },
            },
            lifecycle: {
                signal: {},
                onDispose: (fn: () => void) => {
                    disposed.push(fn);
                    return () => {};
                },
            },
            renderer,
        } as unknown as TuiPluginApi;
        return {
            api,
            layers,
            appended,
            toasts,
            dialogs,
            editor,
            renderer,
            press,
            setMode: (value: string) => {
                mode = value;
            },
            disposed,
        };
    }

    const skills: Skill[] = [
        { name: "zeta", location: "/home/u/.claude/skills/zeta/SKILL.md" },
        { name: "alpha", location: "/repo/.opencode/skills/alpha/SKILL.md" },
        { name: "Beta", location: "<built-in>" },
    ];

    it("exports the package name as the plugin id for file-path loading", () => {
        expect(plugin.id).toBe("opencode-skills-autocomplete");
    });

    it("registers one palette command per skill, A to Z, with origin tags", async () => {
        const { api, layers } = mockApi(skills);
        await plugin.tui(api, undefined, {} as TuiPluginMeta);
        expect(layers).toHaveLength(1);
        const commands = layers[0].commands ?? [];
        expect(commands.map((command) => command.slashName)).toEqual([
            "alpha",
            "Beta",
            "zeta",
        ]);
        expect(commands.map((command) => command.name)).toEqual([
            "skill.alpha",
            "skill.Beta",
            "skill.zeta",
        ]);
        expect(commands.map((command) => command.title)).toEqual([
            "alpha",
            "Beta",
            "zeta",
        ]);
        expect(commands.map((command) => command.desc)).toEqual([
            "(project)",
            "(built-in)",
            "(user)",
        ]);
    });

    it("keeps equal names in discovery order without changing the skill list", async () => {
        const input = [
            { name: "apple", location: "/repo/apple" },
            { name: "Zulu", location: "/repo/Zulu" },
            { name: "Apple", location: "/repo/Apple" },
        ];
        const { api, layers } = mockApi(input);
        await plugin.tui(api, undefined, {} as TuiPluginMeta);
        expect(layers[0].commands?.map((command) => command.title)).toEqual([
            "apple",
            "Apple",
            "Zulu",
        ]);
        expect(input.map((skill) => skill.name)).toEqual([
            "apple",
            "Zulu",
            "Apple",
        ]);
    });

    it("treats a sibling directory as a user skill", async () => {
        const { api, layers } = mockApi([
            { name: "elsewhere", location: "/repo-backup/skills/elsewhere" },
        ]);
        await plugin.tui(api, undefined, {} as TuiPluginMeta);
        expect(layers[0].commands?.[0].desc).toBe("(user)");
    });

    it("inserts /name with a trailing space on select and never submits", async () => {
        const { api, layers, appended } = mockApi(skills);
        await plugin.tui(api, undefined, {} as TuiPluginMeta);
        const beta = (layers[0].commands ?? []).find(
            (command) => command.slashName === "Beta",
        );
        await beta?.run();
        expect(appended).toEqual(["/Beta "]);
    });

    it("opens the palette with the default chord when ctrl+k is bound by the editor", async () => {
        const { api, layers, toasts } = mockApi(skills, {
            boundKeys: ["ctrl+k"],
        });
        await plugin.tui(api, undefined, {} as TuiPluginMeta);
        expect(layers[0].bindings).toEqual([
            { key: "ctrl+s", cmd: "command.palette.show" },
        ]);
        expect(toasts).toEqual([]);

        const { keymap, host, cleanup } = createTestKeymap({
            defaultKeys: true,
        });
        let opened = false;
        keymap.registerLayer({
            commands: [
                {
                    name: "command.palette.show",
                    run: () => {
                        opened = true;
                    },
                },
            ],
            bindings: layers[0].bindings,
        });
        host.press("s", { ctrl: true });
        expect(opened).toBe(true);
        cleanup();
    });

    it("uses the hotkey option as the chord key", async () => {
        const { api, layers } = mockApi(skills);
        await plugin.tui(api, { hotkey: "ctrl+shift+k" }, {} as TuiPluginMeta);
        expect(layers[0].bindings).toEqual([
            { key: "ctrl+shift+k", cmd: "command.palette.show" },
        ]);
    });

    it("trims the hotkey option before registering the chord", async () => {
        const { api, layers } = mockApi(skills);
        await plugin.tui(
            api,
            { hotkey: "  ctrl+shift+k  " },
            {} as TuiPluginMeta,
        );
        expect(layers[0].bindings).toEqual([
            { key: "ctrl+shift+k", cmd: "command.palette.show" },
        ]);
    });

    it("warns once and skips the chord when the key is already bound", async () => {
        const { api, layers, toasts } = mockApi(skills, {
            boundKeys: ["ctrl+s"],
        });
        await plugin.tui(api, undefined, {} as TuiPluginMeta);
        expect(toasts).toEqual([
            {
                variant: "warning",
                message:
                    'hotkey "ctrl+s" is already bound; chord skipped, the / menu still works',
            },
        ]);
        expect(layers[0].bindings ?? []).toHaveLength(0);
        expect(layers[0].commands ?? []).toHaveLength(3);
    });

    it("warns once and skips the chord for an unparseable hotkey", async () => {
        const { api, layers, toasts } = mockApi(skills);
        await plugin.tui(api, { hotkey: "   " }, {} as TuiPluginMeta);
        expect(toasts).toEqual([
            {
                variant: "warning",
                message:
                    'hotkey "" is not a valid keybind; chord skipped, the / menu still works',
            },
        ]);
        expect(layers[0].bindings ?? []).toHaveLength(0);
        expect(layers[0].commands ?? []).toHaveLength(3);
    });

    it("warns once and skips the chord for a hotkey with an unknown token", async () => {
        const { api, layers, toasts } = mockApi(skills, {
            invalidKeys: ["mod+k"],
        });
        await plugin.tui(api, { hotkey: "mod+k" }, {} as TuiPluginMeta);
        expect(toasts).toEqual([
            {
                variant: "warning",
                message:
                    'hotkey "mod+k" is not a valid keybind; chord skipped, the / menu still works',
            },
        ]);
        expect(layers[0].bindings ?? []).toHaveLength(0);
        expect(layers[0].commands ?? []).toHaveLength(3);
    });

    it("warns once and skips the chord when the hotkey option is not a string", async () => {
        const { api, layers, toasts } = mockApi(skills);
        await plugin.tui(api, { hotkey: 42 }, {} as TuiPluginMeta);
        expect(toasts).toEqual([
            {
                variant: "warning",
                message:
                    "hotkey must be a string; chord skipped, the / menu still works",
            },
        ]);
        expect(layers[0].bindings ?? []).toHaveLength(0);
        expect(layers[0].commands ?? []).toHaveLength(3);
    });

    it("offers another skill on the second / and preserves the first", async () => {
        const { api, renderer, dialogs, editor, press } = mockApi(skills);
        await plugin.tui(api, undefined, {} as TuiPluginMeta);
        const prompt = editor("/grilling ", 10);
        renderer.currentFocusedEditor = prompt;
        expect(press({ name: "/", ctrl: false, meta: false })).toBe(true);
        expect(prompt.plainText).toBe("/grilling ");
        expect(dialogs[0].title).toBe("Skills");
        expect(dialogs[0].options.map((option) => option.title)).toEqual([
            "/alpha",
            "/Beta",
            "/zeta",
        ]);
        expect(dialogs[0].options.map((option) => option.description)).toEqual([
            "(project)",
            "(built-in)",
            "(user)",
        ]);
        dialogs[0].onSelect({ value: "Beta" });
        expect(prompt.plainText).toBe("/grilling /Beta ");
    });

    it("keeps the typed slash at the cursor when the Skills dialog is dismissed", async () => {
        const { api, renderer, dialogs, editor, press } = mockApi(skills);
        await plugin.tui(api, undefined, {} as TuiPluginMeta);
        for (const [initial, expected] of [
            ["/grilling ", "/grilling /"],
            ["/grilling more", "/grilling /more"],
        ]) {
            const prompt = editor(initial, 10);
            renderer.currentFocusedEditor = prompt;
            press({ name: "/", ctrl: false, meta: false });
            expect(dialogs.at(-1)?.title).toBe("Skills");
            press({ name: "escape", ctrl: false, meta: false });
            await Promise.resolve();
            expect(prompt.plainText).toBe(expected);
            expect(prompt.cursorOffset).toBe(11);
        }
    });

    it("selects a later skill without doubling the typed slash or submitting", async () => {
        const { api, renderer, dialogs, editor, press, appended } =
            mockApi(skills);
        await plugin.tui(api, undefined, {} as TuiPluginMeta);
        const prompt = editor("ask more", 3);
        renderer.currentFocusedEditor = prompt;
        press({ name: "/", ctrl: false, meta: false });
        dialogs[0].onSelect({ value: "Beta" });
        expect(prompt.plainText).toBe("ask /Beta more");
        expect(appended).toEqual([]);
    });

    it("stops intercepting slashes after the plugin is disposed", async () => {
        const { api, renderer, dialogs, editor, press, disposed } =
            mockApi(skills);
        await plugin.tui(api, undefined, {} as TuiPluginMeta);
        const prompt = editor("/grilling ", 10);
        renderer.currentFocusedEditor = prompt;
        for (const dispose of disposed) dispose();
        press({ name: "/", ctrl: false, meta: false });
        expect(dialogs).toEqual([]);
        expect(prompt.plainText).toBe("/grilling /");
    });

    it("inserts a selected skill at the cursor without doubling existing spaces", async () => {
        const { api, renderer, dialogs, editor, press } = mockApi(skills);
        await plugin.tui(api, undefined, {} as TuiPluginMeta);
        const prompt = editor("/grilling  more", 10);
        renderer.currentFocusedEditor = prompt;
        press({ name: "/", ctrl: false, meta: false });
        dialogs[0].onSelect({ value: "Beta" });
        expect(prompt.plainText).toBe("/grilling /Beta more");
    });

    it("preserves the first skill when / is typed just before its trailing space", async () => {
        const { api, renderer, dialogs, editor, press } = mockApi(skills);
        await plugin.tui(api, undefined, {} as TuiPluginMeta);
        const prompt = editor("/grilling ", 9);
        renderer.currentFocusedEditor = prompt;
        expect(press({ name: "/", ctrl: false, meta: false })).toBe(true);
        dialogs[0].onSelect({ value: "Beta" });
        expect(prompt.plainText).toBe("/grilling /Beta ");
    });

    it("leaves the built-in menu to / in an empty prompt", async () => {
        const { api, renderer, dialogs, editor, press } = mockApi(skills);
        await plugin.tui(api, undefined, {} as TuiPluginMeta);
        renderer.currentFocusedEditor = editor("", 0);
        press({ name: "/", ctrl: false, meta: false });
        expect(dialogs).toEqual([]);
    });

    it("leaves the built-in menu to / while filtering an open menu", async () => {
        const { api, renderer, dialogs, editor, press, setMode } =
            mockApi(skills);
        await plugin.tui(api, undefined, {} as TuiPluginMeta);
        renderer.currentFocusedEditor = editor("/tdd", 4);
        setMode("autocomplete");
        press({ name: "/", ctrl: false, meta: false });
        expect(dialogs).toEqual([]);
    });

    it("ignores / when no prompt editor is focused", async () => {
        const { api, dialogs, press } = mockApi(skills);
        await plugin.tui(api, undefined, {} as TuiPluginMeta);
        press({ name: "/", ctrl: false, meta: false });
        expect(dialogs).toEqual([]);
    });

    it("ignores keys that are not a plain /", async () => {
        const { api, renderer, dialogs, editor, press } = mockApi(skills);
        await plugin.tui(api, undefined, {} as TuiPluginMeta);
        renderer.currentFocusedEditor = editor("/tdd ", 5);
        press({ name: "a", ctrl: false, meta: false });
        press({ name: "/", ctrl: true, meta: false });
        press({ name: "/", ctrl: false, meta: true });
        press({ name: "/", ctrl: false, meta: false, option: true });
        expect(dialogs).toEqual([]);
    });
});
