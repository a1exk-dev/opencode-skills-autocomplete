import { describe, expect, it } from "vitest";
import { buildChangelogSection } from "../scripts/prepare-release.mjs";

describe("buildChangelogSection", () => {
    it("groups feat commits under Features, in input order", () => {
        expect(
            buildChangelogSection("0.1.0", "2026-09-28", [
                "feat: version gate + README",
                "feat: skill registration",
            ]),
        ).toBe(
            "## 0.1.0 (2026-09-28)\n\n### Features\n\n- version gate + README\n- skill registration",
        );
    });

    it("groups fix commits under Bug Fixes", () => {
        expect(
            buildChangelogSection("0.2.0", "2026-09-28", [
                "fix: replace self-referential symlinks",
                "fix: another fix",
            ]),
        ).toBe(
            "## 0.2.0 (2026-09-28)\n\n### Bug Fixes\n\n- replace self-referential symlinks\n- another fix",
        );
    });

    it("puts Features before Bug Fixes", () => {
        expect(
            buildChangelogSection("0.1.0", "2026-09-28", [
                "fix: later fix",
                "feat: earlier feat",
            ]),
        ).toBe(
            "## 0.1.0 (2026-09-28)\n\n### Features\n\n- earlier feat\n\n### Bug Fixes\n\n- later fix",
        );
    });

    it("ignores commit types other than feat and fix", () => {
        expect(
            buildChangelogSection("0.1.0", "2026-09-28", [
                "chore: bootstrap",
                "ci: fix publish job",
                "docs: record a note",
            ]),
        ).toBe("## 0.1.0 (2026-09-28)\n\nNo user-facing changes.");
    });

    it("accepts scoped and breaking-prefixed types", () => {
        expect(
            buildChangelogSection("0.1.0", "2026-09-28", [
                "feat(tui): register skills",
                "fix!: repair binding",
            ]),
        ).toBe(
            "## 0.1.0 (2026-09-28)\n\n### Features\n\n- register skills\n\n### Bug Fixes\n\n- repair binding",
        );
    });
});
