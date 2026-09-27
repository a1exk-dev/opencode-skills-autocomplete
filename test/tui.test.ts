import type { TuiPluginApi, TuiPluginMeta } from "@opencode-ai/plugin/tui";
import { describe, expect, it } from "vitest";
import plugin, {
    originTag,
    parseHotkey,
    pasteText,
    sortSkills,
} from "../src/tui";

describe("sortSkills", () => {
    it("sorts names A to Z case-insensitively", () => {
        const skills = [{ name: "zeta" }, { name: "Alpha" }, { name: "beta" }];
        expect(sortSkills(skills).map((skill) => skill.name)).toEqual([
            "Alpha",
            "beta",
            "zeta",
        ]);
    });

    it("keeps input order for names that differ only by case", () => {
        const skills = [{ name: "apple" }, { name: "Apple" }];
        expect(sortSkills(skills).map((skill) => skill.name)).toEqual([
            "apple",
            "Apple",
        ]);
    });

    it("does not mutate the input array", () => {
        const skills = [{ name: "b" }, { name: "a" }];
        sortSkills(skills);
        expect(skills.map((skill) => skill.name)).toEqual(["b", "a"]);
    });

    it("returns the same skill objects, in the sorted order", () => {
        const skills = [
            { name: "b", location: "/x/b" },
            { name: "a", location: "/x/a" },
        ];
        const sorted = sortSkills(skills);
        expect(sorted[0]).toBe(skills[1]);
        expect(sorted[1]).toBe(skills[0]);
    });
});

describe("originTag", () => {
    const paths = { directory: "/repo/src", worktree: "/repo" };

    it("classifies the built-in marker as (built-in)", () => {
        expect(originTag("<built-in>", paths)).toBe("(built-in)");
    });

    it("classifies a location under the worktree as (project)", () => {
        expect(originTag("/repo/.opencode/skills/demo/SKILL.md", paths)).toBe(
            "(project)",
        );
    });

    it("classifies a location under the directory as (project)", () => {
        expect(originTag("/repo/src/.claude/skills/demo/SKILL.md", paths)).toBe(
            "(project)",
        );
    });

    it("does not treat a sibling of the worktree as inside it", () => {
        expect(
            originTag("/repo-backup/.opencode/skills/demo/SKILL.md", paths),
        ).toBe("(user)");
    });

    it("classifies home config locations as (user)", () => {
        expect(
            originTag(
                "/home/a1exk/.config/opencode/skills/demo/SKILL.md",
                paths,
            ),
        ).toBe("(user)");
    });

    it("classifies home skill locations as (user)", () => {
        expect(
            originTag("/home/a1exk/.claude/skills/demo/SKILL.md", paths),
        ).toBe("(user)");
        expect(
            originTag("/home/a1exk/.agents/skills/demo/SKILL.md", paths),
        ).toBe("(user)");
    });
});

describe("parseHotkey", () => {
    it("defaults to ctrl+k when options are absent", () => {
        expect(parseHotkey(undefined)).toEqual({ ok: true, hotkey: "ctrl+k" });
        expect(parseHotkey({})).toEqual({ ok: true, hotkey: "ctrl+k" });
        expect(parseHotkey({ hotkey: undefined })).toEqual({
            ok: true,
            hotkey: "ctrl+k",
        });
    });

    it("accepts valid keybind strings", () => {
        expect(parseHotkey({ hotkey: "ctrl+k" })).toEqual({
            ok: true,
            hotkey: "ctrl+k",
        });
        expect(parseHotkey({ hotkey: "ctrl+shift+k" })).toEqual({
            ok: true,
            hotkey: "ctrl+shift+k",
        });
        expect(parseHotkey({ hotkey: "mod+enter" })).toEqual({
            ok: true,
            hotkey: "mod+enter",
        });
        expect(parseHotkey({ hotkey: "enter" })).toEqual({
            ok: true,
            hotkey: "enter",
        });
        expect(parseHotkey({ hotkey: "tab" })).toEqual({
            ok: true,
            hotkey: "tab",
        });
    });

    it("trims whitespace around the keybind", () => {
        expect(parseHotkey({ hotkey: "  ctrl+k  " })).toEqual({
            ok: true,
            hotkey: "ctrl+k",
        });
    });

    it("rejects non-string values as a registration failure", () => {
        expect(parseHotkey({ hotkey: 42 })).toMatchObject({
            ok: false,
            error: expect.any(String),
        });
        expect(parseHotkey({ hotkey: null })).toMatchObject({
            ok: false,
            error: expect.any(String),
        });
    });

    it("passes any string through to the keymap for validation", () => {
        for (const hotkey of ["", "ctrl", "k+k", "not a keybind"]) {
            expect(parseHotkey({ hotkey }), hotkey).toEqual({
                ok: true,
                hotkey: hotkey.trim(),
            });
        }
    });
});

describe("pasteText", () => {
    it("is the skill name with a leading / and exactly one trailing space", () => {
        expect(pasteText("tdd")).toBe("/tdd ");
    });

    it("keeps the name verbatim", () => {
        expect(pasteText("my-skill_2")).toBe("/my-skill_2 ");
    });
});

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

    function mockApi(
        skills: Skill[],
        extra: { boundKeys?: string[]; invalidKeys?: string[] } = {},
    ) {
        const layers: RegisteredLayer[] = [];
        const appended: string[] = [];
        const toasts: { variant?: string; message: string }[] = [];
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
                toast: (input: { variant?: string; message: string }) => {
                    toasts.push(input);
                },
            },
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
        } as unknown as TuiPluginApi;
        return { api, layers, appended, toasts };
    }

    const skills: Skill[] = [
        { name: "zeta", location: "/home/u/.claude/skills/zeta/SKILL.md" },
        { name: "alpha", location: "/repo/.opencode/skills/alpha/SKILL.md" },
        { name: "Beta", location: "<built-in>" },
    ];

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

    it("inserts /name with a trailing space on select and never submits", async () => {
        const { api, layers, appended } = mockApi(skills);
        await plugin.tui(api, undefined, {} as TuiPluginMeta);
        const beta = (layers[0].commands ?? []).find(
            (command) => command.slashName === "Beta",
        );
        await beta?.run();
        expect(appended).toEqual(["/Beta "]);
    });

    it("binds the default ctrl+k chord to the palette command", async () => {
        const { api, layers } = mockApi(skills);
        await plugin.tui(api, undefined, {} as TuiPluginMeta);
        expect(layers[0].bindings).toEqual([
            { key: "ctrl+k", cmd: "command.palette.show" },
        ]);
        expect(layers[0].commands ?? []).toHaveLength(3);
    });

    it("uses the hotkey option as the chord key", async () => {
        const { api, layers } = mockApi(skills);
        await plugin.tui(api, { hotkey: "ctrl+shift+k" }, {} as TuiPluginMeta);
        expect(layers[0].bindings).toEqual([
            { key: "ctrl+shift+k", cmd: "command.palette.show" },
        ]);
    });

    it("warns once and skips the chord when the key is already bound", async () => {
        const { api, layers, toasts } = mockApi(skills, {
            boundKeys: ["ctrl+k"],
        });
        await plugin.tui(api, undefined, {} as TuiPluginMeta);
        expect(toasts).toEqual([
            {
                variant: "warning",
                message:
                    'hotkey "ctrl+k" is already bound; chord skipped, the / menu still works',
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
});
