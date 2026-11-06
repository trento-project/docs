// SPDX-FileCopyrightText: SUSE LLC
// SPDX-License-Identifier: Apache-2.0

'use strict'

const Asciidoctor = require('@asciidoctor/core')
const fs = require('fs-extra')
const handlebars = require('handlebars')
const ospath = require('path')
const path = ospath.posix
const requireFromString = require('require-from-string')
const { Transform } = require('stream')
const map = (transform = () => {}, flush = undefined) => new Transform({ objectMode: true, transform, flush })
const vfs = require('vinyl-fs')
const yaml = require('js-yaml')

const ASCIIDOC_ATTRIBUTES = { experimental: '', icons: 'font', sectanchors: '', 'source-highlighter': 'highlight.js' }

module.exports = (src, previewSrc, previewDest, sink = () => map()) => () =>
  Promise.all([
    loadSampleUiModel(previewSrc),
    collect(compileLayouts(src)),
    streamToPromise(registerPartials(src)),
    streamToPromise(registerHelpers(src)),
    streamToPromise(copyImages(previewSrc, previewDest)),
  ])
    .then(([baseUiModel, { layouts }]) => {
      const extensions = ((baseUiModel.asciidoc || {}).extensions || []).map((request) => {
        ASCIIDOC_ATTRIBUTES[request.replace(/^@|\.js$/, '').replace(/[/]/g, '-') + '-loaded'] = ''
        const extension = require(request)
        extension.register.call(Asciidoctor.Extensions)
        return extension
      })
      const asciidoc = { extensions }
      for (const component of baseUiModel.site.components) {
        for (const version of component.versions || []) version.asciidoc = asciidoc
      }
      baseUiModel = { ...baseUiModel, env: process.env }
      delete baseUiModel.asciidoc
      return [baseUiModel, layouts]
    })
    .then(([baseUiModel, layouts]) => {
      const staged = vfs
        .src('**/*.adoc', { base: previewSrc, cwd: previewSrc })
        .pipe(
          map((file, enc, next) => {
            const siteRootPath = path.relative(ospath.dirname(file.path), ospath.resolve(previewSrc))
            const uiModel = { ...baseUiModel }
            uiModel.page = { ...uiModel.page }
            uiModel.siteRootPath = siteRootPath
            uiModel.uiRootPath = path.join(siteRootPath, '_')
            // NOTE @asciidoctor/core v4 load()/convert() are async and return promises
            const prepare =
                file.stem === '404'
                  ? Promise.resolve((uiModel.page = { layout: '404', title: 'Page Not Found' }))
                  : Asciidoctor.load(file.contents, { safe: 'safe', attributes: ASCIIDOC_ATTRIBUTES }).then((doc) =>
                    doc.convert().then((contents) => {
                      uiModel.page.attributes = Object.entries(doc.getAttributes())
                        .filter(([name]) => name.startsWith('page-'))
                        .reduce((accum, [name, val]) => {
                          accum[name.slice(5)] = val
                          return accum
                        }, {})
                      uiModel.page.layout = doc.getAttribute('page-layout', 'default')
                      uiModel.page.title = doc.getDocumentTitle()
                      uiModel.page.contents = Buffer.from(contents)
                    })
                  )
            prepare.then(() => {
              file.extname = '.html'
              try {
                file.contents = Buffer.from(layouts.get(uiModel.page.layout)(uiModel))
                next(null, file)
              } catch (e) {
                next(transformHandlebarsError(e, uiModel.page.layout))
              }
            }, next)
          })
        )
        .pipe(vfs.dest(previewDest))
      // NOTE await the writer (which reliably emits 'finish'); the sink is only a
      // side-effect (e.g. livereload) whose no-op default never signals completion.
      const done = streamToPromise(staged)
      staged.pipe(sink())
      return done
    })

function loadSampleUiModel (src) {
  return fs.readFile(ospath.join(src, 'ui-model.yml'), 'utf8').then((contents) => yaml.load(contents))
}

function registerPartials (src) {
  return vfs.src('partials/*.hbs', { base: src, cwd: src }).pipe(
    map((file, enc, next) => {
      handlebars.registerPartial(file.stem, file.contents.toString())
      next()
    })
  )
}

function registerHelpers (src) {
  handlebars.registerHelper('resolvePage', resolvePage)
  handlebars.registerHelper('resolvePageURL', resolvePageURL)
  return vfs.src('helpers/*.js', { base: src, cwd: src }).pipe(
    map((file, enc, next) => {
      handlebars.registerHelper(file.stem, requireFromString(file.contents.toString()))
      next()
    })
  )
}

function compileLayouts (src) {
  const layouts = new Map()
  return vfs.src('layouts/*.hbs', { base: src, cwd: src }).pipe(
    map(
      (file, enc, next) => {
        const srcName = path.join(src, file.relative)
        layouts.set(file.stem, handlebars.compile(file.contents.toString(), { preventIndent: true, srcName }))
        next()
      },
      function (done) {
        this.push({ layouts })
        done()
      }
    )
  )
}

function copyImages (src, dest) {
  return vfs
    .src('**/*.{png,svg}', { base: src, cwd: src })
    .pipe(vfs.dest(dest))
    .pipe(map((file, enc, next) => next()))
}

function resolvePage (spec, context = {}) {
  if (spec) return { pub: { url: resolvePageURL(spec) } }
}

function resolvePageURL (spec, context = {}) {
  if (spec) return '/' + (spec = spec.split(':').pop()).slice(0, spec.lastIndexOf('.')) + '.html'
}

function transformHandlebarsError ({ message, stack }, layout) {
  const m = stack.match(/^ *at Object\.ret \[as (.+?)\]/m)
  const templatePath = `src/${m ? 'partials/' + m[1] : 'layouts/' + layout}.hbs`
  const err = new Error(`${message}${~message.indexOf('\n') ? '\n^ ' : ' '}in UI template ${templatePath}`)
  err.stack = [err.toString()].concat(stack.slice(message.length + 8)).join('\n')
  return err
}

// NOTE vinyl-fs 4 uses streamx internally; collect drains a stream and resolves
// with the data object pushed downstream (e.g. the compiled layouts map).
function collect (stream) {
  return new Promise((resolve, reject) => {
    const data = {}
    stream
      .on('error', reject)
      .on('data', (chunk) => {
        if (chunk && chunk.constructor === Object) Object.assign(data, chunk)
      })
      .on('end', () => resolve(data))
      .on('finish', () => resolve(data))
  })
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
