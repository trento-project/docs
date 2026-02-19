"use strict";
const fs = require("node:fs");
const path = require("node:path");

const extensionName = "edit-url";

const GITHUB_REMOTE_RX =
  /^(?:https?:\/\/|.+@)(github\.com)[/:](.+?)(?:\.git)?$/;
const TMP_COMPONENT_RX =
  /(?:^|\/)(?:trento-docs-site\/)?build\/tmp_components\/([^/]+)\/(.+)$/;
const TMP_COMPONENT_ROOT_RX =
  /(?:^|\/)(?:trento-docs-site\/)?build\/tmp_components\//;
const MAIN_REF = { refName: "main", refType: "branch" };
const CONTRIBUTION_UPSTREAM_PATH = "trento-docs-site/contribution-upstream/";

// Reference for Antora extensions: https://docs.antora.org/antora/latest/extend/define-extension/
// Antora listens for events emitted by the generator when Antora runs and this is the entry point for the edit url extension.
// See as reference: https://docs.antora.org/antora/latest/extend/generator-events-reference/

module.exports.register = function () {
  this.once("contentClassified", ({ contentCatalog }) => {
    applyEditUrls(contentCatalog);
  });
};

function applyEditUrls(contentCatalog) {
  const contentCatalogPages = contentCatalog.getPages();
  for (const file of contentCatalogPages) {
    // This data is used to set the edit url prop in the template.
    // Link to hbs template https://github.com/trento-project/docs/blob/main/trento-docs-site-ui/src/partials/edit-this-page.hbs#L4
    setEditUrl(file);
  }
}

// Checks whether a file has source metadata and no existing edit URL,
// computes one via resolveEditUrl(src),
//  then saves it on both file and src and logs it,
//  so each page gets a single consistent “Edit this page” link only when valid and not already set.
function setEditUrl(file) {
  const src = file?.src;
  if (!src || file.editUrl || src.editUrl) return;

  const editUrl = resolveEditUrl(src);
  if (!editUrl) return;

  file.editUrl = editUrl;
  src.editUrl = editUrl;
  recordEditUrlLog(editUrl, src, file);
}
//  builds context, resolves target, validates completeness, builds URL, logs unresolved reasons on failure.
//  orchestration point that turns one page src into a final GitHub edit link.
function resolveEditUrl(src) {
  const context = collectEditUrlContext(src);
  const target = resolveEditTarget(context);
  if (!hasCompleteTarget(target)) {
    recordEditUrlError(
      {
        stage: "resolveEditUrl",
        reason: "incomplete_target",
        sourcePath: getPathForLog(src),
        missing: {
          head: !target?.head,
          remoteUrl: !target?.remoteUrl,
          relPath: !target?.relPath,
        },
        target,
      },
      { message: "Incomplete edit URL target" },
    );
    return null;
  }

  const editUrl = buildEditUrl(target.remoteUrl, target.head, target.relPath);
  if (editUrl) return editUrl;

  recordEditUrlError(
    {
      stage: "resolveEditUrl",
      reason: "build_edit_url_failed",
      sourcePath: getPathForLog(src),
      remoteUrl: target.remoteUrl,
      head: target.head,
      relPath: target.relPath,
    },
    { message: "Failed to build edit URL" },
  );
  return null;
}
//  Gathers all inputs needed for edit url decision-making.
function collectEditUrlContext(src) {
  const absPath = getAbsolutePath(src);
  const repoRoot = absPath ? findRepoRoot(absPath) : null;
  const origin = getOriginInfo(src);
  const scannedPath = normalizePath(src.scanned);
  const componentInfo = inferComponentInfo(scannedPath);
  const relPath = resolveRelativePath(
    src,
    absPath,
    repoRoot,
    scannedPath,
    componentInfo,
  );
  return {
    componentInfo,
    origin,
    relPath,
  };
}

// Applies edit url rules
// component -> upstream repo on main,
// contribution-upstream -> docs repo on main,
// default ->main, HEAD -> main, otherwise keeps origin head.
function resolveEditTarget({ componentInfo, origin, relPath }) {
  // Highest priority: generated docs from tmp_components always point upstream on main.
  if (componentInfo) {
    return {
      head: MAIN_REF,
      remoteUrl: `https://github.com/trento-project/${componentInfo.repo}`,
      relPath: componentInfo.relPath,
    };
  }

  // Contribution-upstream pages always use docs repo on main.
  if (isUpstreamReference(relPath)) {
    return {
      head: MAIN_REF,
      remoteUrl: origin.url,
      relPath,
    };
  }

  // Handles every page that is neither a tmp-component page nor a contribution-upstream page.
  const head = resolveDefaultHead(origin.head);
  const remoteUrl = origin.url;
  return { head, remoteUrl, relPath };
}

// checks if a target had all required fields to build url
function hasCompleteTarget(target) {
  return Boolean(target?.head && target?.remoteUrl && target?.relPath);
}
// maps latest -> main, HEAD -> main, otherwise keeps origin head.
function resolveDefaultHead(originHead) {
  const refName = originHead?.refName;
  if (!refName) return null;

  const normalized = String(refName).toLowerCase();
  if (normalized === "latest") return MAIN_REF;
  if (normalized === "head") return MAIN_REF;
  return originHead;
}

// Picks the best relative file path to use for edit-link generation, in priority order
function resolveRelativePath(
  src,
  absPath,
  repoRoot,
  scannedPath = normalizePath(src?.scanned),
  componentInfo = null,
) {
  // Preferred path for local repos: compute path relative to the detected repo root.
  if (absPath && repoRoot) {
    return path.relative(repoRoot, absPath);
  }

  if (scannedPath) {
    // tmp_components paths are rewritten via componentInfo; skip scanned-path fallback there.
    if (componentInfo || isTmpComponentPath(scannedPath)) return null;
    return scannedPath;
  }

  // Fallback for non-collector pages where `scanned` is missing.
  const relativePath = normalizePath(src?.relative);
  if (relativePath) return relativePath;

  const sourcePath = normalizePath(src?.path);
  if (sourcePath) return sourcePath;

  return null;
}
// standardizes origin metadata into one predictable object without undefined edge cases.
function getOriginInfo(src) {
  const originUrl = src.origin?.url;
  return { head: getOriginHead(src), url: originUrl || null };
}
// Extracts Git ref info from src.origin, this gives downstream code a clean, consistent “branch/tag pointer” shape
function getOriginHead(src) {
  const origin = src.origin || {};
  return origin.refname
    ? { refName: origin.refname, refType: origin.reftype || "ref" }
    : null;
}

// Provides the best available absolute file path so later logic can correctly detect repo root and build accurate repo-relative edit links.
function getAbsolutePath(src) {
  if (!src) return null;
  const { realpath, abspath, scanned, origin } = src;
  const collectorWorktree = origin?.collectorWorktree;

  if (realpath && path.isAbsolute(realpath)) return realpath;
  if (abspath && path.isAbsolute(abspath)) return abspath;
  if (scanned && collectorWorktree) {
    return path.join(collectorWorktree, scanned);
  }
  return null;
}

// Tries to parse a normalized scanned path as a temporary component path
// Because some pages come from temporary tmp_components/... paths that don’t directly map to the real repo file layout
// and this function extracts the real pieces (repo and relative file path) so the extension can build correct edit URLs instead of broken ones.
function inferComponentInfo(scannedPath) {
  const normalized = normalizePath(scannedPath);
  if (!normalized) return null;

  const match = normalized.match(TMP_COMPONENT_RX);
  if (!match) return null;

  return { repo: match[1], relPath: match[2] };
}

// Exists to detect “this file came from upstream docs” so the extension
// can apply upstream-specific edit URL logic (repo/path mapping) and avoid generating links with the wrong target repository.
function isUpstreamReference(value) {
  const normalized = normalizePath(value);
  if (!normalized) return false;
  return normalized.includes(CONTRIBUTION_UPSTREAM_PATH);
}

function findRepoRoot(filePath) {
  let current = path.dirname(filePath);
  while (true) {
    if (pathExists(path.join(current, ".git"))) return current;
    const parent = path.dirname(current);
    if (parent === current) return null;
    current = parent;
  }
}

// Parses GitHub remote and builds https://github.com/<org>/<repo>/edit/<ref>/<path>
function buildEditUrl(remoteUrl, head, relPath) {
  const action = "edit";
  const match = remoteUrl.match(GITHUB_REMOTE_RX);
  if (!match) return null;
  // Encode each path segment but preserve "/" separators for GitHub paths.
  const refPath = encodeGitPath(head.refName);
  const filePath = relPath ? encodeGitPath(relPath) : null;
  const parts = [match[1], match[2], action, refPath];
  if (filePath) parts.push(filePath);
  return `https://${parts.join("/")}`;
}

// Makes path comparisons and URL building consistent across all inputs.
function normalizePath(value) {
  if (!value) return null;
  let normalized = String(value);
  if (normalized.startsWith("./")) normalized = normalized.slice(2);
  if (normalized.startsWith("/")) normalized = normalized.slice(1);
  return normalized;
}
// Checks whether a path belongs to the generated build/tmp_components/... upstream repo docs from the collector extension.
function isTmpComponentPath(value) {
  const normalized = normalizePath(value);
  if (!normalized) return false;
  return TMP_COMPONENT_ROOT_RX.test(normalized);
}
// Makes GitHub URLs safe and valid when branch names or file paths contain special characters (spaces, #, ?, %) but keeps / separator
function encodeGitPath(value) {
  return String(value)
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

function pathExists(filePath) {
  try {
    fs.accessSync(filePath);
    return true;
  } catch {
    return false;
  }
}

// Logging
function printBuildLog(entry) {
  try {
    console.log(`[${extensionName}] ${JSON.stringify(entry)}`);
  } catch {}
}

function printBuildError(entry) {
  try {
    console.error(`[${extensionName}:error] ${JSON.stringify(entry)}`);
  } catch {}
}

function getPathForLog(src, file = null) {
  return src?.path || file?.path || src?.scanned || src?.relative || "unknown";
}

function recordEditUrlLog(editUrl, src, file) {
  const logPath = getPathForLog(src, file);
  printBuildLog({
    editUrl,
    path: logPath,
  });
}

function recordEditUrlError(context, error) {
  const entry = {
    ...context,
    error: error?.message || String(error),
    stack: error?.stack || null,
  };
  printBuildError(entry);
}
// Testing
module.exports._test = {
  applyEditUrls,
  setEditUrl,
  resolveEditUrl,
  hasCompleteTarget,
  resolveEditTarget,
  normalizePath,
  isUpstreamReference,
  buildEditUrl,
  encodeGitPath,
  resolveDefaultHead,
  getAbsolutePath,
  findRepoRoot,
  resolveRelativePath,
};
