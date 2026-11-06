// SPDX-FileCopyrightText: SUSE LLC
// SPDX-License-Identifier: Apache-2.0

'use strict'

const autoprefixer = require('autoprefixer')
const browserify = require('browserify')
const concat = require('gulp-concat')
const cssnano = require('cssnano')
const fs = require('fs-extra')
const ospath = require('path')
const path = ospath.posix
const postcss = require('gulp-postcss')
const postcssCalc = require('postcss-calc')
const postcssImport = require('postcss-import')
const postcssUrl = require('postcss-url')
const postcssVar = require('postcss-custom-properties')
const { Transform } = require('stream')
const map = (transform) => new Transform({ objectMode: true, transform })
const through = () => map((file, enc, next) => next(null, file))
const uglify = require('gulp-uglify')
const vfs = require('vinyl-fs')

module.exports = (src, dest, preview) => () => {
  const opts = { base: src, cwd: src }
  const sourcemaps = preview || process.env.SOURCEMAPS === 'true'
  const postcssPlugins = [
    postcssImport,
    (css, { messages, opts: { file } }) =>
      Promise.all(
        messages
          .reduce((accum, { file: depPath, type }) => (type === 'dependency' ? accum.concat(depPath) : accum), [])
          .map((importedPath) => fs.stat(importedPath).then(({ mtime }) => mtime))
      ).then((mtimes) => {
        const newestMtime = mtimes.reduce((max, curr) => (!max || curr > max ? curr : max), file.stat.mtime)
        if (newestMtime > file.stat.mtime) file.stat.mtimeMs = +(file.stat.mtime = newestMtime)
      }),
    postcssUrl([
      {
        filter: (asset) => /^[~][^/]*(?:font|typeface)[^/]*\/.*\/files\/.+[.](?:ttf|woff2?)$/.test(asset.url),
        url: (asset) => {
          const relpath = asset.pathname.slice(1)
          const abspath = require.resolve(relpath)
          const basename = ospath.basename(abspath)
          const destpath = ospath.join(dest, 'font', basename)
          if (!fs.pathExistsSync(destpath)) fs.copySync(abspath, destpath)
          return path.join('..', 'font', basename)
        },
      },
      {
        filter: (asset) => /^[~]eos-icons\/dist\/fonts\/.+[.](?:ttf|woff|woff2|eot|svg?)$/.test(asset.url),
        url: (asset) => {
          const relpath = asset.pathname.slice(1)
          const abspath = require.resolve(relpath)
          const basename = ospath.basename(abspath)
          const destpath = ospath.join(dest, 'font', basename)
          if (!fs.pathExistsSync(destpath)) fs.copySync(abspath, destpath)
          return path.join('..', 'font', basename)
        },
      },
    ]),
    postcssVar({ preserve: preview }),
    // NOTE to make vars.css available to all top-level stylesheets, use the next line in place of the previous one
    //postcssVar({ importFrom: path.join(src, 'css', 'vars.css'), preserve: preview }),
    preview ? postcssCalc : () => {}, // cssnano already applies postcssCalc
    autoprefixer,
  ]
  if (!preview) {
    // cssnano is a postcss 8 plugin object; add it (and the pseudo-element fixer that
    // runs after it) directly to the plugin list instead of invoking it manually.
    postcssPlugins.push(cssnano({ preset: 'default' }), postcssPseudoElementFixer)
  }

  const sources = [
    vfs
      .src('js/+([0-9])-*.js', { ...opts, read: false, sourcemaps })
      .pipe(bundle(opts))
      .pipe(uglify({ ie: true, module: false, output: { comments: /^! / } }))
      // NOTE concat already uses stat from newest combined file
      .pipe(concat('js/site.js')),
    vfs
      .src('js/vendor/+([^.])?(.bundle).js', { ...opts, read: false })
      .pipe(bundle(opts))
      .pipe(uglify({ ie: true, module: false, output: { comments: /^! / } })),
    vfs
      .src('js/vendor/*.min.js', opts)
      .pipe(map((file, enc, next) => next(null, Object.assign(file, { extname: '' }, { extname: '.js' })))),
    // NOTE use the next line to bundle a JavaScript library that cannot be browserified, like jQuery
    //vfs.src(require.resolve('<package-name-or-require-path>'), opts).pipe(concat('js/vendor/<library-name>.js')),
    vfs
      .src(['css/site.css', 'css/vendor/*.css'], { ...opts, sourcemaps })
      .pipe(postcss((file) => ({ plugins: postcssPlugins, options: { file } }))),
    vfs.src('img/**/*.{gif,ico,jpg,png,svg}', opts).pipe(through()),
    vfs.src('helpers/*.js', opts),
    vfs.src('layouts/*.hbs', opts),
    vfs.src('partials/*.hbs', opts),
  ]
  // These sources are optional; an empty vinyl-fs stream collapses the merge, and a
  // missing base folder makes vinyl-fs throw ENOENT, so only add them when present.
  if (fs.existsSync(ospath.join(src, 'ui.yml'))) {
    sources.push(vfs.src('ui.yml', opts))
  }
  if (fs.existsSync(ospath.join(src, 'font'))) {
    sources.push(vfs.src('font/*.{ttf,woff*(2)}', opts))
  }
  if (fs.existsSync(ospath.join(src, 'static'))) {
    sources.push(vfs.src('static/**/*[!~]', { ...opts, base: ospath.join(src, 'static'), dot: true }))
  }

  // NOTE vinyl-fs 4 uses streamx internally, which merge-stream cannot combine reliably
  // (empty sources collapse the merge), so write each source independently and await all.
  const destOpts = { sourcemaps: sourcemaps && '.' }
  return Promise.all(sources.map((source) => streamToPromise(source.pipe(vfs.dest(dest, destOpts)))))
}

function streamToPromise (stream) {
  return new Promise((resolve, reject) => {
    let settled = false
    const settle = (err) => {
      if (settled) return
      settled = true
      err ? reject(err) : resolve()
    }
    stream.on('error', settle).on('finish', settle).on('end', settle).on('close', settle)
  })
}

function bundle ({ base: basedir, ext: bundleExt = '.bundle.js' }) {
  return map((file, enc, next) => {
    if (bundleExt && file.relative.endsWith(bundleExt)) {
      const mtimePromises = []
      const bundlePath = file.path
      browserify(file.relative, { basedir, detectGlobals: false })
        .plugin('browser-pack-flat/plugin')
        .on('file', (bundledPath) => {
          if (bundledPath !== bundlePath) mtimePromises.push(fs.stat(bundledPath).then(({ mtime }) => mtime))
        })
        .bundle((bundleError, bundleBuffer) =>
          Promise.all(mtimePromises).then((mtimes) => {
            const newestMtime = mtimes.reduce((max, curr) => (curr > max ? curr : max), file.stat.mtime)
            if (newestMtime > file.stat.mtime) file.stat.mtimeMs = +(file.stat.mtime = newestMtime)
            if (bundleBuffer !== undefined) file.contents = bundleBuffer
            next(bundleError, Object.assign(file, { path: file.path.slice(0, file.path.length - 10) + '.js' }))
          })
        )
      return
    }
    fs.readFile(file.path, 'UTF-8').then((contents) => {
      next(null, Object.assign(file, { contents: Buffer.from(contents) }))
    })
  })
}

function postcssPseudoElementFixer (css, result) {
  css.walkRules(/(?:^|[^:]):(?:before|after)/, (rule) => {
    rule.selector = rule.selectors.map((it) => it.replace(/(^|[^:]):(before|after)$/, '$1::$2')).join(',')
  })
}
