'use strict'

const { _test } = require('../edit-url.cjs')

describe('edit-url extension', () => {
  it('returns an upstream edit target when only a scanned path is available', () => {
    const target = _test.resolveEditTarget({
      componentInfo: null,
      remoteUrlCache: null,
      remoteName: 'origin',
      preferLocalGit: false,
      originInfo: {
        head: { refName: 'v1.0', refType: 'tag' },
        url: 'https://github.com/trento-project/trento-docs-site.git',
      },
      localInfo: { head: null, url: null },
      relPath: null,
      scannedPath: 'content/trento-docs-site/contribution-upstream/foo.adoc',
      refName: 'latest',
    })

    const expectedRelPath = 'content/trento-docs-site/contribution-upstream/foo.adoc'
    const expectedHead = { refName: 'main', refType: 'branch' }
    const expectedRemoteUrl = 'https://github.com/trento-project/trento-docs-site.git'

    expect(target.relPath).toBe(expectedRelPath)
    expect(target.head).toEqual(expectedHead)
    expect(target.remoteUrl).toBe(expectedRemoteUrl)
  })

  it('keeps the resolved relative path for upstream references', () => {
    const target = _test.resolveEditTarget({
      componentInfo: null,
      remoteUrlCache: null,
      remoteName: 'origin',
      preferLocalGit: false,
      originInfo: {
        head: { refName: 'v1.0', refType: 'tag' },
        url: 'https://github.com/trento-project/trento-docs-site.git',
      },
      localInfo: { head: null, url: null },
      relPath: 'content/trento-docs-site/contribution-upstream/bar.adoc',
      scannedPath: 'content/trento-docs-site/contribution-upstream/bar.adoc',
      refName: 'latest',
    })

    const expectedRelPath = 'content/trento-docs-site/contribution-upstream/bar.adoc'

    expect(target.relPath).toBe(expectedRelPath)
  })

  it('uses component overrides with a fallback remote URL', () => {
    const target = _test.resolveEditTarget({
      componentInfo: {
        repo: 'trento-docs-site',
        relPath: 'modules/foo/pages/index.adoc',
        rootPath: null,
      },
      remoteUrlCache: null,
      remoteName: 'origin',
      preferLocalGit: false,
      originInfo: { head: null, url: null },
      localInfo: { head: null, url: null },
      relPath: 'ignored/by/component',
      scannedPath: null,
      refName: null,
    })

    const expectedHead = { refName: 'main', refType: 'branch' }
    const expectedRemoteUrl = 'https://github.com/trento-project/trento-docs-site'
    const expectedRelPath = 'modules/foo/pages/index.adoc'

    expect(target.head).toEqual(expectedHead)
    expect(target.remoteUrl).toBe(expectedRemoteUrl)
    expect(target.relPath).toBe(expectedRelPath)
  })

  it('detects contribution-upstream paths correctly', () => {
    const upstreamContentPath = 'content/trento-docs-site/contribution-upstream/guide.adoc'
    const upstreamShortPath = 'trento-docs-site/contribution-upstream/guide.adoc'
    const nonUpstreamPath = 'modules/foo/pages/index.adoc'

    expect(_test.isUpstreamReference(upstreamContentPath)).toBe(true)
    expect(_test.isUpstreamReference(upstreamShortPath)).toBe(true)
    expect(_test.isUpstreamReference(nonUpstreamPath)).toBe(false)
  })

  it('normalizes relative paths by trimming leading prefixes', () => {
    const dotPath = './modules/foo/pages/index.adoc'
    const rootPath = '/modules/foo/pages/index.adoc'

    const expectedPath = 'modules/foo/pages/index.adoc'

    expect(_test.normalizePath(dotPath)).toBe(expectedPath)
    expect(_test.normalizePath(rootPath)).toBe(expectedPath)
  })

  it('selects preferred values based on preferLocal flag', () => {
    const originValue = 'origin'
    const localValue = 'local'
    
    const expectedLocal = 'local'
    const expectedOrigin = 'origin'

    expect(_test.selectPreferred(originValue, localValue, true)).toBe(expectedLocal)
    expect(_test.selectPreferred(originValue, localValue, false)).toBe(expectedOrigin)
    expect(_test.selectPreferred(originValue, null, true)).toBe(expectedOrigin)
  })

  it('prefers local HEAD only when origin ref is HEAD and local has a URL', () => {
    const remoteUrl = 'https://github.com/foo/bar.git'
    const expectedTrue = true
    const expectedFalse = false

    expect(_test.shouldPreferLocalForHead({ refName: 'HEAD' }, remoteUrl)).toBe(expectedTrue)
    expect(_test.shouldPreferLocalForHead({ refName: 'head' }, null)).toBe(expectedFalse)
    expect(_test.shouldPreferLocalForHead({ refName: 'main' }, remoteUrl)).toBe(expectedFalse)
  })

  it('overrides versions for latest and head correctly', () => {
    const expectedMain = { refName: 'main', refType: 'branch' }
    const expectedDevBranch = { refName: 'dev', refType: 'branch' }
    const expectedNull = null

    expect(_test.getVersionOverride('latest', { refName: 'dev', refType: 'branch' })).toEqual(
      expectedMain
    )
    expect(_test.getVersionOverride('HEAD', { refName: 'dev', refType: 'branch' })).toEqual(
      expectedDevBranch
    )
    expect(_test.getVersionOverride('HEAD', { refName: 'v1.0', refType: 'tag' })).toEqual(
      expectedMain
    )
    expect(_test.getVersionOverride('v1.0', { refName: 'dev', refType: 'branch' })).toBe(
      expectedNull
    )
  })

  it('builds edit URLs for branches and blob URLs for non-branches', () => {
    const base = 'https://github.com/trento-project/trento-docs-site.git'
    const relPath = 'modules/foo/pages/index.adoc'

    const editUrl = _test.buildEditUrl(base, { refName: 'main', refType: 'branch' }, relPath)
    const blobUrl = _test.buildEditUrl(base, { refName: 'v1.0', refType: 'tag' }, relPath)

    const expectedEditUrl =
      'https://github.com/trento-project/trento-docs-site/edit/main/modules/foo/pages/index.adoc'
    const expectedBlobUrl =
      'https://github.com/trento-project/trento-docs-site/blob/v1.0/modules/foo/pages/index.adoc'

    expect(editUrl).toBe(expectedEditUrl)
    expect(blobUrl).toBe(expectedBlobUrl)
  })

  it('builds URLs from SSH GitHub remotes', () => {
    const base = 'git@github.com:trento-project/trento-docs-site.git'
    const relPath = 'modules/foo/pages/index.adoc'
    const url = _test.buildEditUrl(base, { refName: 'main', refType: 'branch' }, relPath)

    const expectedUrl =
      'https://github.com/trento-project/trento-docs-site/edit/main/modules/foo/pages/index.adoc'

    expect(url).toBe(expectedUrl)
  })
})
