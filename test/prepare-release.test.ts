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
