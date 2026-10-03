import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";

// Lines that earlier releases already list. The changelog is the record of what shipped.
function releasedEntries(changelog) {
    return new Set(
        [...(changelog ?? "").matchAll(/^- (.+)$/gm)].map((match) => match[1]),
    );
}

function buildChangelogSection(version, date, subjects, released) {
    const feat = [];
    const fix = [];
    for (const subject of subjects) {
        const match = /^(\w+)(?:\([^)]*\))?!?:\s*(.+)$/.exec(subject);
        if (match && released.has(match[2])) continue;
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

function prepareChangelog(section, old) {
    const header = "# Changelog\n";
    if (old === undefined) {
        return `${header}\n${section}\n`;
    }
    if (!old.startsWith(header))
        throw new Error("CHANGELOG.md must start with the changelog header");
    const version = section.match(/^## (\S+)/)?.[1] ?? "";
    if (old.includes(`## ${version} `))
        throw new Error(`CHANGELOG.md already has an entry for ${version}`);
    const rest = old
        .slice(header.length)
        .replace(/^\n+/, "")
        .replace(/\n+$/, "");
    return `${header}\n${section}\n\n${rest}\n`;
}

function main() {
    const version = process.argv[2];
    if (!/^\d+\.\d+\.\d+$/.test(version ?? "")) {
        console.error("usage: bun scripts/prepare-release.mjs <version>");
        process.exit(1);
    }

    const pkgPath = new URL("../package.json", import.meta.url);
    const changelogPath = new URL("../CHANGELOG.md", import.meta.url);
    const previousPackage = readFileSync(pkgPath, "utf8");
    const previousChangelog = existsSync(changelogPath)
        ? readFileSync(changelogPath, "utf8")
        : undefined;
    const pkg = JSON.parse(previousPackage);
    pkg.version = version;

    // The main release tag can be on a squash commit outside develop's history.
    // After a merge back, that squash commit still leaves develop's own earlier
    // commits in range, so entries already in the changelog are skipped below.
    const since = /^## \d+\.\d+\.\d+ \(/m.test(previousChangelog ?? "")
        ? execFileSync(
              "git",
              ["log", "-1", "--format=%H", "HEAD", "--", "CHANGELOG.md"],
              { encoding: "utf8" },
          ).trim()
        : "";
    const subjects = execFileSync(
        "git",
        ["log", ...(since ? [`${since}..HEAD`] : []), "--pretty=%s"],
        { encoding: "utf8" },
    )
        .trim()
        .split("\n");

    const changelog = prepareChangelog(
        buildChangelogSection(
            version,
            new Date().toISOString().slice(0, 10),
            subjects,
            releasedEntries(previousChangelog),
        ),
        previousChangelog,
    );
    try {
        writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 4)}\n`);
        writeFileSync(changelogPath, changelog);
    } catch (error) {
        try {
            if (readFileSync(pkgPath, "utf8") !== previousPackage)
                writeFileSync(pkgPath, previousPackage);
            if (previousChangelog === undefined) {
                if (existsSync(changelogPath)) rmSync(changelogPath);
            } else if (
                readFileSync(changelogPath, "utf8") !== previousChangelog
            ) {
                writeFileSync(changelogPath, previousChangelog);
            }
        } catch (restoreError) {
            throw new AggregateError(
                [error, restoreError],
                "Release preparation failed and could not restore both files",
            );
        }
        throw error;
    }
    console.log(
        `prepared ${version}: ${subjects.length} commit(s) since ${since || "the start"}`,
    );
}

if (import.meta.main) main();
