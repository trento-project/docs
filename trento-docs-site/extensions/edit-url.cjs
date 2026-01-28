'use strict'

const fs = require('node:fs')
const path = require('node:path')

// Edit URL builder for Trento documentation hub.
// Rules:
// - latest -> main
// - HEAD -> local branch when available, otherwise main
// - Developer component docs (tmp_components) -> upstream repo on main

const GITHUB_REMOTE_RX = /^(?:https?:\/\/|.+@)(github\.com)[/:](.+?)(?:\.git)?$/
const TMP_COMPONENT_RX = /(?:^|\/)(?:trento-docs-site\/)?build\/tmp_components\/([^/]+)\/(.+)$/
const POSIX_SEP_RX = new RegExp(`\\${path.sep}`, 'g')
const DEFAULT_REMOTE = 'origin'
const MAIN_REF = { refName: 'main', refType: 'branch' }
const CONTRIBUTION_UPSTREAM_PATHS = [
  'content/trento-docs-site/contribution-upstream/',
  'trento-docs-site/contribution-upstream/',
]
const EDIT_URL_LOG_PATH = path.resolve(__dirname, '..', 'build', 'extensions', 'edit-url', 'edit-url-log.jsonl')
const EDIT_URL_ERROR_LOG_PATH = path.resolve(__dirname, '..', 'build', 'extensions', 'edit-url', 'edit-url-errors.jsonl')

let logEditUrlError = null

module.exports.register = function () {
  const remoteUrlCache = new Map()

  this.once('contentAggregated', ({ contentAggregate }) => {
    const logEditUrl = createJsonlLogger(EDIT_URL_LOG_PATH)
    logEditUrlError = createJsonlLogger(EDIT_URL_ERROR_LOG_PATH)
    for (const bucket of contentAggregate) {
      for (const file of bucket.files || []) {
        setEditUrl(file, remoteUrlCache, logEditUrl)
      }
    }
  }
)
}

function setEditUrl (file, remoteUrlCache, logEditUrl) {
  const src = file.src
  if (!src || src.editUrl) return

  const editUrl = resolveEditUrl(file, src, remoteUrlCache)
  if (editUrl) {
    src.editUrl = editUrl
    console.log('[edit-url] set', editUrl, 'for', src.path || file.path || src.scanned || 'unknown')
    recordEditUrlLog(logEditUrl, editUrl, src, file)
  }
}

function resolveEditUrl (file, src, remoteUrlCache) {
  const absPath = getAbsolutePath(src)
  const repoRoot = absPath ? findRepoRoot(absPath) : null
  const gitDir = resolveGitDir(src, repoRoot)
  const remoteName = getRemoteName(src)

  const originInfo = getOriginInfo(src)
  const localInfo = getLocalInfo(gitDir, remoteUrlCache, remoteName)

  const componentInfo = src.scanned ? inferComponentInfo(src.scanned, absPath) : null
  const preferLocalGit = shouldPreferLocalForHead(originInfo.head, localInfo.url)
  const relPath = resolveRelativePath(file, src, absPath, repoRoot)

  const target = resolveEditTarget({
    componentInfo,
    remoteUrlCache,
    remoteName,
    preferLocalGit,
    originInfo,
    localInfo,
    relPath,
    scannedPath: src.scanned,
    refName: src.origin?.refname,
  })

  if (!target || !target.head || !target.remoteUrl || !target.relPath) return null

  return buildEditUrl(target.remoteUrl, target.head, target.relPath)
}

function resolveEditTarget ({
  componentInfo,
  remoteUrlCache,
  remoteName,
  preferLocalGit,
  originInfo,
  localInfo,
  relPath,
  scannedPath,
  refName,
}) {

  if (componentInfo) {
    return getComponentOverride(componentInfo, remoteUrlCache, remoteName)
  }

  if (isUpstreamReference(relPath || scannedPath)) {
    const effectiveRelPath = relPath || normalizePath(scannedPath)
    return {
      head: MAIN_REF,
      remoteUrl: selectPreferred(originInfo.url, localInfo.url, preferLocalGit),
      relPath: effectiveRelPath,
    }
  }

  const head = selectPreferred(originInfo.head, localInfo.head, preferLocalGit)
  const remoteUrl = selectPreferred(originInfo.url, localInfo.url, preferLocalGit)
  const versionOverride = getVersionOverride(refName, localInfo.head)

  return { head: versionOverride || head, remoteUrl, relPath }
}

function selectPreferred (originValue, localValue, preferLocal) {
  return preferLocal ? (localValue || originValue) : (originValue || localValue)
}

function shouldPreferLocalForHead (originHead, localUrl) {
  if (!localUrl) return false
  const refName = originHead?.refName
  return refName && String(refName).toLowerCase() === 'head'
}

function getComponentOverride (componentInfo, remoteUrlCache, remoteName) {
  const componentUrl = getComponentRemoteUrl(componentInfo, remoteUrlCache, remoteName)
  const nextRemoteUrl = componentUrl || `https://github.com/trento-project/${componentInfo.repo}`
  return { head: MAIN_REF, remoteUrl: nextRemoteUrl, relPath: componentInfo.relPath }
}

function getComponentRemoteUrl (componentInfo, remoteUrlCache, remoteName) {
  if (!componentInfo.rootPath) return null

  const componentGitDir = findGitDir(componentInfo.rootPath)
  if (!componentGitDir) return null

  return getCachedRemoteUrl(remoteUrlCache, componentGitDir, remoteName)
}

function resolveRelativePath (file, src, absPath, repoRoot) {
  if (absPath && repoRoot) {
    return path.relative(repoRoot, absPath).replace(POSIX_SEP_RX, '/')
  }

  if (src.scanned) return normalizePath(src.scanned)

  const rawPath = src.path || file.path
  if (!rawPath) return null

  const relPath = normalizePath(rawPath)
  const startPath = normalizePath(src.origin?.startPath)
  return applyStartPath(relPath, startPath)
}

function getCachedRemoteUrl (remoteUrlCache, gitDir, remoteName) {
  if (remoteUrlCache.has(gitDir)) return remoteUrlCache.get(gitDir)

  const remoteUrl = readRemoteUrl(gitDir, remoteName)
  remoteUrlCache.set(gitDir, remoteUrl)
  return remoteUrl
}

function getOriginInfo (src) {
  return { head: getOriginHead(src), url: getOriginRemoteUrl(src) }
}

function getLocalInfo (gitDir, remoteUrlCache, remoteName) {
  if (!gitDir) return { head: null, url: null }
  return {
    head: readHead(gitDir),
    url: getCachedRemoteUrl(remoteUrlCache, gitDir, remoteName),
  }
}

function getOriginHead (src) {
  const origin = src.origin || {}
  return origin.refname ? { refName: origin.refname, refType: origin.reftype || 'ref' } : null
}

function getOriginRemoteUrl (src) {
  const originUrl = src.origin?.url
  return originUrl && GITHUB_REMOTE_RX.test(originUrl) ? originUrl : null
}

function getRemoteName (src) {
  return src.origin?.remote || DEFAULT_REMOTE
}

function resolveGitDir (src, repoRoot) {
  const localGitDir = repoRoot ? findGitDir(repoRoot) : null
  if (src.scanned && localGitDir) return localGitDir
  if (src.origin?.gitdir) return src.origin.gitdir
  return localGitDir
}

function getAbsolutePath (src) {
  if (src.realpath && path.isAbsolute(src.realpath)) return src.realpath
  if (src.abspath && path.isAbsolute(src.abspath)) return src.abspath
  if (src.scanned && src.origin?.collectorWorktree) {
    return path.join(src.origin.collectorWorktree, src.scanned)
  }
  return null
}

function inferComponentInfo (scannedPath, absPath) {
  const normalized = normalizePath(scannedPath)
  if (!normalized) return null

  const match = normalized.match(TMP_COMPONENT_RX)
  if (!match) return null

  let rootPath = null
  if (absPath) {
    const absNormalized = absPath.replace(POSIX_SEP_RX, '/')
    const rootMatch = absNormalized.match(
      new RegExp(`(^.*(?:^|/)(?:trento-docs-site/)?build/tmp_components/${match[1]})(?:/|$)`)
    )
    if (rootMatch) rootPath = rootMatch[1].split('/').join(path.sep)
  }

  return { repo: match[1], relPath: match[2], rootPath }
}

function getVersionOverride (refName, localHead) {
  if (!refName) return null
  const normalized = String(refName).toLowerCase()
  if (normalized === 'latest') return MAIN_REF
  if (normalized === 'head') {
    if (localHead?.refType === 'branch') return localHead
    return MAIN_REF
  }
  return null
}

function isUpstreamReference (value) {
  const normalized = normalizePath(value)
  if (!normalized) return false
  return CONTRIBUTION_UPSTREAM_PATHS.some((segment) => normalized.includes(segment))
}

function findRepoRoot (filePath) {
  let current = path.dirname(filePath)
  while (true) {
    if (pathExists(path.join(current, '.git'))) return current
    const parent = path.dirname(current)
    if (parent === current) return null
    current = parent
  }
}

function findGitDir (repoRoot) {
  const gitPath = path.join(repoRoot, '.git')
  try {
    const stat = fs.statSync(gitPath)
    if (stat.isDirectory()) return gitPath
    if (stat.isFile()) {
      const data = fs.readFileSync(gitPath, 'utf8')
      const match = data.match(/^gitdir: (.+)$/m)
      if (match) return path.resolve(repoRoot, match[1].trim())
    }
  } catch (error) {
    if (error?.code !== 'ENOENT') {
      recordEditUrlError({ stage: 'findGitDir', repoRoot, gitPath }, error)
    }
  }
  return null
}

function readRemoteUrl (gitDir, remoteName = DEFAULT_REMOTE) {
  const configPath = path.join(gitDir, 'config')
  let config
  try {
    config = fs.readFileSync(configPath, 'utf8')
  } catch (error) {
    recordEditUrlError({ stage: 'readRemoteUrl', gitDir, remoteName, configPath }, error)
    return null
  }

  let inRemote = false
  for (const line of config.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed) continue
    const remoteMatch = trimmed.match(/^\[remote "(.+)"\]$/)
    if (remoteMatch) {
      inRemote = remoteMatch[1] === remoteName
      continue
    }
    if (inRemote) {
      const urlMatch = trimmed.match(/^url = (.+)$/)
      if (urlMatch) return urlMatch[1].trim()
    }
    if (trimmed.startsWith('[')) inRemote = false
  }
  return null
}

function readHead (gitDir) {
  if (!gitDir) return null
  const headPath = path.join(gitDir, 'HEAD')
  let head
  try {
    head = fs.readFileSync(headPath, 'utf8').trim()
  } catch (error) {
    recordEditUrlError({ stage: 'readHead', gitDir, headPath }, error)
    return null
  }

  if (head.startsWith('ref: ')) {
    const ref = head.slice(5).trim()
    if (ref.startsWith('refs/heads/')) {
      return { refName: ref.slice('refs/heads/'.length), refType: 'branch' }
    }
    if (ref.startsWith('refs/tags/')) {
      return { refName: ref.slice('refs/tags/'.length), refType: 'tag' }
    }
    return { refName: ref.split('/').slice(1).join('/'), refType: 'ref' }
  }

  if (/^[0-9a-f]{7,40}$/.test(head)) return { refName: head, refType: 'hash' }
  return null
}

function buildEditUrl (remoteUrl, head, relPath) {
  const match = remoteUrl.match(GITHUB_REMOTE_RX)
  if (!match) return null

  const repoPath = match[2].replace(/\.git$/, '')
  const action = head.refType === 'branch' ? 'edit' : 'blob'

  const parts = [match[1], repoPath, action, head.refName]
  if (relPath) parts.push(relPath)

  let url = `https://${parts.join('/')}`
  if (url.includes(' ')) url = url.replace(/ /g, '%20')
  return url
}

function normalizePath (value) {
  if (!value) return null
  let normalized = String(value).replace(POSIX_SEP_RX, '/')
  if (normalized.startsWith('./')) normalized = normalized.slice(2)
  if (normalized.startsWith('/')) normalized = normalized.slice(1)
  return normalized
}

function applyStartPath (relPath, startPath) {
  if (!relPath) return null
  if (!startPath || startPath === '.') return relPath
  if (relPath.startsWith(`${startPath}/`)) return relPath
  return path.posix.join(startPath, relPath)
}

function pathExists (filePath) {
  try {
    fs.accessSync(filePath)
    return true
  } catch {
    return false
  }
}

function inferComponentFromPath (value) {
  const normalized = normalizePath(value)
  if (!normalized) return null
  const match = normalized.match(/^modules\/([^/]+)\//)
  return match ? match[1] : null
}

function getVersionForLog (file, src) {
  const fileVersion = file?.version
  if (typeof fileVersion === 'string') return fileVersion
  if (fileVersion && typeof fileVersion === 'object' && fileVersion.name) return fileVersion.name
  return src.origin?.refname || null
}

function createJsonlLogger (logPath) {
  if (!logPath) return null

  try {
    fs.mkdirSync(path.dirname(logPath), { recursive: true })
  } catch {
    return null
  }

  let stream
  try {
    stream = fs.createWriteStream(logPath, { flags: 'w' })
  } catch {
    return null
  }

  const closeStream = () => {
    try {
      stream.end()
    } catch {
    }
  }
  process.once('exit', closeStream)
  process.once('SIGINT', closeStream)
  process.once('SIGTERM', closeStream)

  return (entry) => {
    try {
      stream.write(`${JSON.stringify(entry)}\n`)
    } catch {
    }
  }
}

function getLogPath (src, file) {
  return src.path || file.path || src.scanned || 'unknown'
}

function recordEditUrlLog (logEditUrl, editUrl, src, file) {
  if (!logEditUrl) return
  const logPath = getLogPath(src, file)
  logEditUrl({
    editUrl,
    path: logPath,
    component: src.component || file.component || inferComponentFromPath(logPath),
    version: getVersionForLog(file, src),
  })
}

function recordEditUrlError (context, error) {
  if (!logEditUrlError) return
  const entry = {
    ...context,
    error: error?.message || String(error),
    stack: error?.stack || null,
  }
  logEditUrlError(entry)
}

module.exports._test = {
  resolveEditTarget,
  normalizePath,
  isUpstreamReference,
  buildEditUrl,
  getVersionOverride,
  selectPreferred,
  shouldPreferLocalForHead,
}
