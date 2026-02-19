"use strict";

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { _test } = require("./edit-url.cjs");

const BUILD_LOG_PREFIX = "[edit-url] ";
const BUILD_ERROR_PREFIX = "[edit-url:error] ";

const DOCS_REMOTE = "https://github.com/trento-project/docs.git";
const NON_GITHUB_REMOTE = "https://gitlab.com/trento-project/docs.git";
const DOCS_SCANNED = "trento/adoc/checks_customization.adoc";
const DOCS_PAGE_PATH = "modules/user-guide/pages/checks_customization.adoc";
const TMP_WEB_SCANNED = "trento-docs-site/build/tmp_components/web/README.adoc";

function parseJsonLogEntry(logLine, prefix) {
  expect(typeof logLine).toBe("string");
  expect(logLine.startsWith(prefix)).toBe(true);
  return JSON.parse(logLine.slice(prefix.length));
}

function getFirstJsonLog(mockFn, prefix) {
  const [firstLogLine] = mockFn.mock.calls[0];
  return parseJsonLogEntry(firstLogLine, prefix);
}

function buildOrigin({
  refname = "main",
  reftype = "branch",
  url = DOCS_REMOTE,
  collectorWorktree,
} = {}) {
  const origin = {};
  if (refname !== undefined) origin.refname = refname;
  if (reftype !== undefined) origin.reftype = reftype;
  if (url !== undefined) origin.url = url;
  if (collectorWorktree !== undefined)
    origin.collectorWorktree = collectorWorktree;
  return origin;
}

describe("edit-url extension", () => {
  beforeEach(() => {
    jest.spyOn(console, "log").mockImplementation(() => {});
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("applies edit URLs across all pages in a content catalog", () => {
    const pages = [
      {
        path: DOCS_PAGE_PATH,
        src: {
          scanned: DOCS_SCANNED,
          origin: buildOrigin({ refname: "main" }),
        },
      },
      {
        path: DOCS_PAGE_PATH,
        src: {
          scanned: DOCS_SCANNED,
          origin: buildOrigin({ refname: "latest" }),
        },
      },
      {
        path: "modules/web/pages/README.adoc",
        src: {
          scanned: TMP_WEB_SCANNED,
          origin: buildOrigin({ refname: "edit_button" }),
        },
      },
    ];

    _test.applyEditUrls({ getPages: () => pages });

    const expectedUrls = [
      "https://github.com/trento-project/docs/edit/main/trento/adoc/checks_customization.adoc",
      "https://github.com/trento-project/docs/edit/main/trento/adoc/checks_customization.adoc",
      "https://github.com/trento-project/web/edit/main/README.adoc",
    ];
    pages.forEach((page, index) => {
      expect(page.editUrl).toBe(expectedUrls[index]);
    });
  });

  it("sets edit URL on file/src and records a log entry", () => {
    const file = {
      path: DOCS_PAGE_PATH,
      src: {
        scanned: DOCS_SCANNED,
        path: DOCS_PAGE_PATH,
        origin: buildOrigin({ refname: "main" }),
      },
    };

    _test.setEditUrl(file);

    const expectedUrl =
      "https://github.com/trento-project/docs/edit/main/trento/adoc/checks_customization.adoc";

    expect(file.editUrl).toBe(expectedUrl);
    expect(file.src.editUrl).toBe(expectedUrl);
    expect(console.log).toHaveBeenCalledTimes(1);

    const logEntry = getFirstJsonLog(console.log, BUILD_LOG_PREFIX);
    expect(logEntry.editUrl).toBe(expectedUrl);
    expect(logEntry.path).toBe(DOCS_PAGE_PATH);
  });

  it.each([
    {
      name: "file",
      file: {
        editUrl: "https://example.com/existing-file-url",
        src: {
          scanned: DOCS_SCANNED,
          origin: buildOrigin({ refname: "latest" }),
        },
      },
      expectedFileUrl: "https://example.com/existing-file-url",
      expectedSrcUrl: undefined,
    },
    {
      name: "source",
      file: {
        src: {
          editUrl: "https://example.com/existing-src-url",
          scanned: DOCS_SCANNED,
          origin: buildOrigin({ refname: "latest" }),
        },
      },
      expectedFileUrl: undefined,
      expectedSrcUrl: "https://example.com/existing-src-url",
    },
  ])(
    "does not overwrite an existing $name edit URL",
    ({ file, expectedFileUrl, expectedSrcUrl }) => {
      _test.setEditUrl(file);

      expect(file.editUrl).toBe(expectedFileUrl);
      expect(file.src.editUrl).toBe(expectedSrcUrl);
      expect(console.log).not.toHaveBeenCalled();
    },
  );

  it("does not set edit URL when target remote is not a GitHub URL", () => {
    const file = {
      src: {
        scanned: DOCS_SCANNED,
        origin: buildOrigin({ refname: "latest", url: NON_GITHUB_REMOTE }),
      },
    };

    _test.setEditUrl(file);

    expect(file.editUrl).toBeUndefined();
    expect(file.src.editUrl).toBeUndefined();
    expect(console.log).not.toHaveBeenCalled();
    expect(console.error).toHaveBeenCalledTimes(1);

    const errorEntry = getFirstJsonLog(console.error, BUILD_ERROR_PREFIX);
    expect(errorEntry.stage).toBe("resolveEditUrl");
    expect(errorEntry.reason).toBe("build_edit_url_failed");
    expect(errorEntry.error).toBe("Failed to build edit URL");
  });

  it.each([
    {
      name: "maps latest docs content to main branch",
      src: {
        scanned: "trento/adoc/generic-attributes.adoc",
        origin: buildOrigin({ refname: "latest" }),
      },
      expectedUrl:
        "https://github.com/trento-project/docs/edit/main/trento/adoc/generic-attributes.adoc",
    },
    {
      name: "keeps collector source branch in resulting URL",
      src: {
        scanned: DOCS_SCANNED,
        origin: buildOrigin({ refname: "edit_button" }),
      },
      expectedUrl:
        "https://github.com/trento-project/docs/edit/edit_button/trento/adoc/checks_customization.adoc",
    },
    {
      name: "maps upstream contribution URLs to main branch",
      src: {
        scanned: "content/trento-docs-site/contribution-upstream/foo.adoc",
        origin: buildOrigin({ refname: "v1.2.3", reftype: "tag" }),
      },
      expectedUrl:
        "https://github.com/trento-project/docs/edit/main/content/trento-docs-site/contribution-upstream/foo.adoc",
    },
    {
      name: "resolves tmp component docs to upstream component repo",
      src: {
        scanned:
          "trento-docs-site/build/tmp_components/web/guides/Monitoring/monitoring.adoc",
        origin: buildOrigin({ refname: "latest" }),
      },
      expectedUrl:
        "https://github.com/trento-project/web/edit/main/guides/Monitoring/monitoring.adoc",
    },
  ])("resolveEditUrl: $name", ({ src, expectedUrl }) => {
    expect(_test.resolveEditUrl(src)).toBe(expectedUrl);
  });

  it("resolveEditUrl: resolves tmp component docs even when origin metadata is missing", () => {
    const src = {
      scanned:
        "trento-docs-site/build/tmp_components/agent/docs/operators.adoc",
      origin: {},
    };

    expect(_test.resolveEditUrl(src)).toBe(
      "https://github.com/trento-project/agent/edit/main/docs/operators.adoc",
    );
  });

  it("prefers repo-relative path from absolute source path in collector scenario", () => {
    const tempRoot = fs.mkdtempSync(
      path.join(os.tmpdir(), "edit-url-collector-abs-path-"),
    );

    try {
      fs.mkdirSync(path.join(tempRoot, ".git"), { recursive: true });
      const absPath = path.join(
        tempRoot,
        "trento",
        "adoc",
        "from-abspath.adoc",
      );

      const src = {
        realpath: absPath,
        // Intentionally different to prove absPath+repoRoot takes precedence.
        scanned: "modules/user-guide/pages/from-scanned.adoc",
        origin: buildOrigin({ refname: "main" }),
      };

      const editUrl = _test.resolveEditUrl(src);

      expect(editUrl).toBe(
        "https://github.com/trento-project/docs/edit/main/trento/adoc/from-abspath.adoc",
      );
    } finally {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  it.each([
    {
      name: "missing head",
      src: {
        scanned: "modules/developer/pages/trento-docs-site/README.adoc",
        origin: { url: DOCS_REMOTE },
      },
      expectedMissing: { head: true, remoteUrl: false, relPath: false },
    },
    {
      name: "missing relative path",
      src: {
        scanned: null,
        relative: null,
        path: null,
        origin: buildOrigin({ refname: "main" }),
      },
      expectedMissing: { head: false, remoteUrl: false, relPath: true },
    },
  ])("logs incomplete target when $name", ({ src, expectedMissing }) => {
    const editUrl = _test.resolveEditUrl(src);

    expect(editUrl).toBeNull();
    expect(console.error).toHaveBeenCalledTimes(1);

    const errorEntry = getFirstJsonLog(console.error, BUILD_ERROR_PREFIX);
    expect(errorEntry.stage).toBe("resolveEditUrl");
    expect(errorEntry.reason).toBe("incomplete_target");
    expect(errorEntry.error).toBe("Incomplete edit URL target");
    expect(errorEntry.missing).toEqual(expectedMissing);
  });

  it.each([
    {
      name: "uses component overrides",
      input: {
        componentInfo: {
          repo: "trento-docs-site",
          relPath: "modules/foo/pages/index.adoc",
        },
        origin: { head: null, url: null },
        relPath: "ignored/by/component",
      },
      expected: {
        head: { refName: "main", refType: "branch" },
        remoteUrl: "https://github.com/trento-project/trento-docs-site",
        relPath: "modules/foo/pages/index.adoc",
      },
    },
    {
      name: "returns an upstream target when path is upstream",
      input: {
        componentInfo: null,
        origin: {
          head: { refName: "v1.0", refType: "tag" },
          url: "https://github.com/trento-project/trento-docs-site.git",
        },
        relPath: "content/trento-docs-site/contribution-upstream/foo.adoc",
      },
      expected: {
        head: { refName: "main", refType: "branch" },
        remoteUrl: "https://github.com/trento-project/trento-docs-site.git",
        relPath: "content/trento-docs-site/contribution-upstream/foo.adoc",
      },
    },
    {
      name: "maps HEAD to main in default target resolution",
      input: {
        componentInfo: null,
        origin: {
          head: { refName: "HEAD", refType: "ref" },
          url: DOCS_REMOTE,
        },
        relPath: "content/trento-docs-site/README.adoc",
      },
      expected: {
        head: { refName: "main", refType: "branch" },
        remoteUrl: DOCS_REMOTE,
        relPath: "content/trento-docs-site/README.adoc",
      },
    },
  ])("resolveEditTarget: $name", ({ input, expected }) => {
    expect(_test.resolveEditTarget(input)).toEqual(expected);
  });

  it.each([
    {
      name: "maps latest to main",
      originHead: { refName: "latest", refType: "branch" },
      expected: { refName: "main", refType: "branch" },
    },
    {
      name: "keeps regular branch refs unchanged",
      originHead: { refName: "edit_button", refType: "branch" },
      expected: { refName: "edit_button", refType: "branch" },
    },
    {
      name: "returns null for missing head",
      originHead: null,
      expected: null,
    },
  ])("resolveDefaultHead: $name", ({ originHead, expected }) => {
    expect(_test.resolveDefaultHead(originHead)).toEqual(expected);
  });

  it.each([
    {
      name: "returns true for contribution-upstream paths",
      value: "content/trento-docs-site/contribution-upstream/guide.adoc",
      expected: true,
    },
    {
      name: "returns false for non-upstream paths",
      value: "modules/foo/pages/index.adoc",
      expected: false,
    },
  ])("isUpstreamReference: $name", ({ value, expected }) => {
    expect(_test.isUpstreamReference(value)).toBe(expected);
  });

  it.each([
    {
      name: "trims ./ prefix",
      value: "./modules/foo/pages/index.adoc",
      expected: "modules/foo/pages/index.adoc",
    },
    {
      name: "trims leading / prefix",
      value: "/modules/foo/pages/index.adoc",
      expected: "modules/foo/pages/index.adoc",
    },
  ])("normalizePath: $name", ({ value, expected }) => {
    expect(_test.normalizePath(value)).toBe(expected);
  });

  it.each([
    {
      name: "does not use tmp component scanned path as fallback",
      src: {
        scanned:
          "trento-docs-site/build/tmp_components/workbench/modules/dev/pages/index.adoc",
        path: null,
        origin: {},
      },
      absPath: null,
      repoRoot: null,
      expected: null,
    },
    {
      name: "uses scanned path as fallback when it is not a tmp component path",
      src: {
        scanned: "modules/dev/pages/index.adoc",
        path: null,
        origin: {},
      },
      absPath: null,
      repoRoot: null,
      expected: "modules/dev/pages/index.adoc",
    },
    {
      name: "uses src.relative when scanned path is missing",
      src: {
        scanned: null,
        relative: "trento-docs-site/README.adoc",
        path: null,
        origin: {},
      },
      absPath: null,
      repoRoot: null,
      expected: "trento-docs-site/README.adoc",
    },
    {
      name: "uses src.path when scanned and relative are missing",
      src: {
        scanned: null,
        relative: null,
        path: "modules/dev/pages/index.adoc",
        origin: {},
      },
      absPath: null,
      repoRoot: null,
      expected: "modules/dev/pages/index.adoc",
    },
  ])("resolveRelativePath: $name", ({ src, absPath, repoRoot, expected }) => {
    expect(_test.resolveRelativePath(src, absPath, repoRoot)).toBe(expected);
  });

  it.each([
    {
      name: "returns absolute realpath when available",
      src: {
        realpath: "/root/.cache/antora/collector/docs-abc/page.adoc",
        abspath: "/workspace/page.adoc",
        scanned: "page.adoc",
        origin: buildOrigin({ collectorWorktree: "/workspace" }),
      },
      expected: "/root/.cache/antora/collector/docs-abc/page.adoc",
    },
    {
      name: "falls back to absolute abspath when realpath is not absolute",
      src: {
        realpath: "relative/path/page.adoc",
        abspath: "/workspace/content/page.adoc",
        scanned: "content/page.adoc",
        origin: buildOrigin({ collectorWorktree: "/workspace" }),
      },
      expected: "/workspace/content/page.adoc",
    },
    {
      name: "falls back to collectorWorktree and scanned path",
      src: {
        realpath: null,
        abspath: null,
        scanned: "trento-docs-site/build/tmp_components/workbench/README.adoc",
        origin: buildOrigin({ collectorWorktree: "/workspace" }),
      },
      expected: path.join(
        "/workspace",
        "trento-docs-site/build/tmp_components/workbench/README.adoc",
      ),
    },
    {
      name: "returns null when source has no usable absolute path",
      src: {
        realpath: null,
        abspath: "relative/path/page.adoc",
        scanned: "content/page.adoc",
        origin: buildOrigin({ collectorWorktree: null }),
      },
      expected: null,
    },
  ])("getAbsolutePath: $name", ({ src, expected }) => {
    expect(_test.getAbsolutePath(src)).toBe(expected);
  });

  it.each([
    {
      name: "finds repo root when .git is a directory",
      repoType: "directory",
      fixtureName: "repo-dir",
      nestedFile: ["docs", "a", "b", "page.adoc"],
      expectRepoRoot: true,
    },
    {
      name: "finds repo root when .git is a file",
      repoType: "file",
      fixtureName: "repo-file",
      nestedFile: ["modules", "dev", "page.adoc"],
      expectRepoRoot: true,
    },
    {
      name: "returns null when no repo root exists in parent chain",
      repoType: "none",
      fixtureName: "no-repo",
      nestedFile: ["content", "page.adoc"],
      expectRepoRoot: false,
    },
  ])(
    "findRepoRoot: $name",
    ({ repoType, fixtureName, nestedFile, expectRepoRoot }) => {
      const tempRoot = fs.mkdtempSync(
        path.join(os.tmpdir(), "edit-url-find-repo-root-"),
      );

      try {
        const fixtureRoot = path.join(tempRoot, fixtureName);
        fs.mkdirSync(fixtureRoot, { recursive: true });

        if (repoType === "directory") {
          fs.mkdirSync(path.join(fixtureRoot, ".git"), { recursive: true });
        } else if (repoType === "file") {
          fs.writeFileSync(
            path.join(fixtureRoot, ".git"),
            "gitdir: /tmp/fake-git-dir\n",
          );
        }

        const nestedDir = path.join(fixtureRoot, ...nestedFile.slice(0, -1));
        fs.mkdirSync(nestedDir, { recursive: true });
        const filePath = path.join(fixtureRoot, ...nestedFile);

        const expectedPath = expectRepoRoot ? fixtureRoot : null;
        expect(_test.findRepoRoot(filePath)).toBe(expectedPath);
      } finally {
        fs.rmSync(tempRoot, { recursive: true, force: true });
      }
    },
  );

  it.each([
    {
      name: "builds URLs from HTTPS remotes",
      remoteUrl: "https://github.com/trento-project/trento-docs-site.git",
      head: { refName: "main", refType: "branch" },
      relPath: "modules/foo/pages/index.adoc",
      expected:
        "https://github.com/trento-project/trento-docs-site/edit/main/modules/foo/pages/index.adoc",
    },
    {
      name: "builds URLs for tag refs",
      remoteUrl: "https://github.com/trento-project/trento-docs-site.git",
      head: { refName: "v1.0", refType: "tag" },
      relPath: "modules/foo/pages/index.adoc",
      expected:
        "https://github.com/trento-project/trento-docs-site/edit/v1.0/modules/foo/pages/index.adoc",
    },
    {
      name: "builds URLs from SSH remotes",
      remoteUrl: "git@github.com:trento-project/trento-docs-site.git",
      head: { refName: "main", refType: "branch" },
      relPath: "modules/foo/pages/index.adoc",
      expected:
        "https://github.com/trento-project/trento-docs-site/edit/main/modules/foo/pages/index.adoc",
    },
    {
      name: "encodes unsafe ref and file path characters",
      remoteUrl: "https://github.com/trento-project/trento-docs-site.git",
      head: { refName: "feature/docs fix", refType: "branch" },
      relPath: "modules/foo/pages/Intro #1.adoc",
      expected:
        "https://github.com/trento-project/trento-docs-site/edit/feature/docs%20fix/modules/foo/pages/Intro%20%231.adoc",
    },
  ])("buildEditUrl: $name", ({ remoteUrl, head, relPath, expected }) => {
    expect(_test.buildEditUrl(remoteUrl, head, relPath)).toBe(expected);
  });
});
