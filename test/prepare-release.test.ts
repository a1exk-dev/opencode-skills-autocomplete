import { execFileSync, spawnSync } from "node:child_process";
import {
    chmodSync,
    copyFileSync,
    mkdirSync,
    mkdtempSync,
    readFileSync,
    rmSync,
    writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, expect, it } from "vitest";

let fixture = "";
afterEach(() => {
    if (fixture) rmSync(fixture, { recursive: true, force: true });
    fixture = "";
});

function releaseFixture() {
    fixture = mkdtempSync(join(tmpdir(), "release-prepare-"));
    mkdirSync(join(fixture, "scripts"));
    copyFileSync(
        new URL("../scripts/prepare-release.mjs", import.meta.url),
        join(fixture, "scripts/prepare-release.mjs"),
    );
    writeFileSync(
        join(fixture, "package.json"),
        '{"name":"example","version":"0.1.0"}\n',
    );
    writeFileSync(
        join(fixture, "CHANGELOG.md"),
        "# Changelog\n\n## 0.1.0 (2026-09-28)\n\nFirst release.\n",
    );
    execFileSync("git", ["init", "-q"], { cwd: fixture });
    execFileSync("git", ["add", "."], { cwd: fixture });
    commit(fixture, "chore: initial release");
    execFileSync("git", ["tag", "v0.1.0"], { cwd: fixture });
    return fixture;
}

function commit(dir: string, subject: string) {
    execFileSync(
        "git",
        [
            "-c",
            "user.name=Test",
            "-c",
            "user.email=test@example.com",
            "commit",
            "-qm",
            subject,
        ],
        { cwd: dir },
    );
}

it("does not change the package version if the changelog already has the release", () => {
    const dir = releaseFixture();
    const changelog = join(dir, "CHANGELOG.md");
    const original = readFileSync(changelog, "utf8");
    writeFileSync(changelog, original.replace("0.1.0", "0.1.1"));
    const before = readFileSync(join(dir, "package.json"), "utf8");
    const result = spawnSync(
        "bun",
        [join(dir, "scripts/prepare-release.mjs"), "0.1.1"],
        {
            cwd: dir,
            encoding: "utf8",
        },
    );
    expect(result.status).not.toBe(0);
    expect(readFileSync(join(dir, "package.json"), "utf8")).toBe(before);
    expect(readFileSync(changelog, "utf8")).toBe(
        original.replace("0.1.0", "0.1.1"),
    );
});

it("prepares the version and changelog from the same git history", () => {
    const dir = releaseFixture();
    writeFileSync(join(dir, "fix.txt"), "keep skill selection");
    execFileSync("git", ["add", "fix.txt"], { cwd: dir });
    commit(dir, "fix: keep skill selection");
    writeFileSync(join(dir, "feat.txt"), "add skill list");
    execFileSync("git", ["add", "feat.txt"], { cwd: dir });
    commit(dir, "feat(tui): add skill list");
    const result = spawnSync(
        "bun",
        [join(dir, "scripts/prepare-release.mjs"), "0.1.1"],
        {
            cwd: dir,
            encoding: "utf8",
        },
    );
    expect(result.status).toBe(0);
    expect(
        JSON.parse(readFileSync(join(dir, "package.json"), "utf8")).version,
    ).toBe("0.1.1");
    const changelog = readFileSync(join(dir, "CHANGELOG.md"), "utf8");
    expect(changelog).toMatch(
        /^# Changelog\n\n## 0\.1\.1 \(\d{4}-\d{2}-\d{2}\)\n\n### Features\n\n- add skill list\n\n### Bug Fixes\n\n- keep skill selection/,
    );
    expect(changelog).toContain("## 0.1.0 (2026-09-28)\n\nFirst release.");
    expect(changelog).toMatch(/First release\.\n$/);
});

it("excludes changes already released when the latest tag is not on develop", () => {
    const dir = releaseFixture();
    execFileSync("git", ["switch", "-q", "-c", "develop"], { cwd: dir });
    writeFileSync(join(dir, "old.txt"), "previous fix");
    execFileSync("git", ["add", "old.txt"], { cwd: dir });
    commit(dir, "fix: previous fix");
    execFileSync("bun", [join(dir, "scripts/prepare-release.mjs"), "0.2.0"], {
        cwd: dir,
    });
    execFileSync("git", ["add", "package.json", "CHANGELOG.md"], {
        cwd: dir,
    });
    commit(dir, "chore(release): prepare 0.2.0");
    execFileSync("git", ["switch", "-q", "-c", "main", "v0.1.0"], {
        cwd: dir,
    });
    execFileSync("git", ["merge", "--squash", "develop"], { cwd: dir });
    commit(dir, "chore(release): prepare 0.2.0 (#15)");
    execFileSync("git", ["tag", "v0.2.0"], { cwd: dir });
    execFileSync("git", ["switch", "-q", "develop"], { cwd: dir });
    writeFileSync(join(dir, "new.txt"), "new fix");
    execFileSync("git", ["add", "new.txt"], { cwd: dir });
    commit(dir, "fix: new fix");

    execFileSync("bun", [join(dir, "scripts/prepare-release.mjs"), "0.2.1"], {
        cwd: dir,
    });
    const changelog = readFileSync(join(dir, "CHANGELOG.md"), "utf8");
    expect(changelog).toContain("## 0.2.1 (");
    expect(changelog.split("## 0.2.0")[0]).toContain("- new fix");
    expect(changelog.split("## 0.2.0")[0]).not.toContain("previous fix");
});

it("excludes released changes when a squashed release is merged back into develop", () => {
    const dir = releaseFixture();
    const git = (...args: string[]) =>
        execFileSync(
            "git",
            [
                "-c",
                "user.name=Test",
                "-c",
                "user.email=test@example.com",
                ...args,
            ],
            { cwd: dir },
        );
    const prepare = (version: string) =>
        execFileSync(
            "bun",
            [join(dir, "scripts/prepare-release.mjs"), version],
            {
                cwd: dir,
            },
        );
    const change = (file: string, subject: string) => {
        writeFileSync(join(dir, file), subject);
        git("add", file);
        commit(dir, subject);
    };
    git("switch", "-q", "-c", "develop");
    change("old.txt", "fix: previous fix (#1)");
    prepare("0.2.0");
    git("add", "package.json", "CHANGELOG.md");
    commit(dir, "chore(release): prepare 0.2.0");
    git("switch", "-q", "-c", "main", "v0.1.0");
    git("merge", "--squash", "develop");
    commit(dir, "chore(release): prepare 0.2.0 (#2)");
    git("tag", "v0.2.0");
    git("switch", "-q", "develop");
    change("released.txt", "fix: released fix (#3)");
    git("switch", "-q", "-c", "release/0.2.1");
    prepare("0.2.1");
    git("add", "package.json", "CHANGELOG.md");
    commit(dir, "chore(release): prepare 0.2.1");
    git("switch", "-q", "main");
    git("checkout", "release/0.2.1", "--", "package.json", "CHANGELOG.md");
    commit(dir, "chore(release): prepare 0.2.1 (#4)");
    git("tag", "v0.2.1");
    git("switch", "-q", "develop");
    git(
        "merge",
        "-q",
        "-X",
        "theirs",
        "main",
        "-m",
        "chore(release): merge 0.2.1 back into develop",
    );
    change("new.txt", "feat: new thing (#5)");

    prepare("0.3.0");
    const section = readFileSync(join(dir, "CHANGELOG.md"), "utf8").split(
        "## 0.2.1",
    )[0];
    expect(section).toContain("## 0.3.0 (");
    expect(section).toContain("- new thing (#5)");
    expect(section).not.toContain("released fix");
    expect(section).not.toContain("previous fix");
});

it("includes earlier changes when the changelog has no release entry yet", () => {
    fixture = mkdtempSync(join(tmpdir(), "release-prepare-"));
    mkdirSync(join(fixture, "scripts"));
    copyFileSync(
        new URL("../scripts/prepare-release.mjs", import.meta.url),
        join(fixture, "scripts/prepare-release.mjs"),
    );
    writeFileSync(join(fixture, "package.json"), '{"version":"0.0.0"}\n');
    execFileSync("git", ["init", "-q"], { cwd: fixture });
    execFileSync("git", ["add", "."], { cwd: fixture });
    commit(fixture, "feat: first skill menu");
    writeFileSync(join(fixture, "CHANGELOG.md"), "# Changelog\n");
    execFileSync("git", ["add", "CHANGELOG.md"], { cwd: fixture });
    commit(fixture, "docs: add changelog header");

    execFileSync(
        "bun",
        [join(fixture, "scripts/prepare-release.mjs"), "0.1.0"],
        { cwd: fixture },
    );
    expect(readFileSync(join(fixture, "CHANGELOG.md"), "utf8")).toContain(
        "- first skill menu",
    );
});

it("restores the package version when the changelog write fails", () => {
    const dir = releaseFixture();
    const pkg = join(dir, "package.json");
    const changelog = join(dir, "CHANGELOG.md");
    const previousPackage = readFileSync(pkg, "utf8");
    const previousChangelog = readFileSync(changelog, "utf8");
    chmodSync(changelog, 0o444);
    const result = spawnSync(
        "bun",
        [join(dir, "scripts/prepare-release.mjs"), "0.1.1"],
        {
            cwd: dir,
            encoding: "utf8",
        },
    );
    expect(result.status).not.toBe(0);
    expect(readFileSync(pkg, "utf8")).toBe(previousPackage);
    expect(readFileSync(changelog, "utf8")).toBe(previousChangelog);
});
