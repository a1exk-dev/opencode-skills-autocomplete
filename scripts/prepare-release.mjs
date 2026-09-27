import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

export function buildChangelogSection(version, date, subjects) {
    const feat = [];
    const fix = [];
    for (const subject of subjects) {
        const match = /^(\w+)(?:\([^)]*\))?!?:\s*(.+)$/.exec(subject);
        if (match?.[1] === "feat") feat.push(match[2]);
        else if (match?.[1] === "fix") fix.push(match[2]);
    }
    const blocks = [];
    if (feat.length)
        blocks.push(`### Features\n\n${feat.map((s) => `- ${s}`).join("\n")}`);
    if (fix.length)
        blocks.push(`### Bug Fixes\n\n${fix.map((s) => `- ${s}`).join("\n")}`);
    const body = blocks.length
        ? blocks.join("\n\n")
        : "No user-facing changes.";
    return `## ${version} (${date})\n\n${body}`;
}

function writeChangelog(section) {
    const path = new URL("../CHANGELOG.md", import.meta.url);
    const header = "# Changelog\n";
    if (!existsSync(path)) {
        writeFileSync(path, `${header}\n${section}\n`);
        return;
    }
    const old = readFileSync(path, "utf8");
    if (!old.startsWith(header))
        throw new Error("CHANGELOG.md must start with the changelog header");
    const version = section.match(/^## (\S+)/)?.[1] ?? "";
    if (old.includes(`## ${version} `))
        throw new Error(`CHANGELOG.md already has an entry for ${version}`);
    const rest = old.slice(header.length).replace(/^\n+/, "");
    writeFileSync(path, `${header}\n${section}\n\n${rest}\n`);
}

function main() {
    const version = process.argv[2];
    if (!/^\d+\.\d+\.\d+$/.test(version ?? "")) {
        console.error("usage: bun scripts/prepare-release.mjs <version>");
        process.exit(1);
    }

    const pkgPath = new URL("../package.json", import.meta.url);
    const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
    pkg.version = version;
    writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 4)}\n`);

    let since = "";
    try {
        since = execFileSync(
            "git",
            ["describe", "--tags", "--abbrev=0", "--match", "v*"],
            { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
        ).trim();
    } catch {
        // no v* tag yet: cover the whole history
    }
    const subjects = execFileSync(
        "git",
        ["log", ...(since ? [`${since}..HEAD`] : []), "--pretty=%s"],
        { encoding: "utf8" },
    )
        .trim()
        .split("\n");

    writeChangelog(
        buildChangelogSection(
            version,
            new Date().toISOString().slice(0, 10),
            subjects,
        ),
    );
    console.log(
        `prepared ${version}: ${subjects.length} commit(s) since ${since || "the start"}`,
    );
}

if (import.meta.main) main();
