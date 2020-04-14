import {FileTransform, Rule} from './types'
import through from 'through2'
import File from 'vinyl'
import {Readable, Transform} from 'readable-stream'

export function fileTransformStream(fn: FileTransform) {
  return through.obj(function(file: File, encoding, done) {
    // Pass through any ready events without processing them
    if (file.event === 'ready') {
      console.log('READY EVENT PASSED THROUGH')
      done(null, file)
      return
    }

    const ret = fn(file, encoding)
    const files = Array.isArray(ret) ? ret : [ret]
    for (file of files) {
      this.push(file)
    }
    done()
  }) as Transform
}

// https://stackoverflow.com/questions/21771220/error-handling-with-node-js-streams
// Need to handle errors with rules
export function addErrorHandler(ruleFn: Rule, errorHandler: (err: any) => void): Rule {
  return (stream, headStream) => {
    const decoratedStream = ruleFn(stream, headStream)
    decoratedStream.on('error', errorHandler)
    return decoratedStream
  }
}

// stream.pipe doesn't handle errors well but we can't use pipeline for our rules
// because we need access to the raw stream for some of the rules
export function rulesPipeline(fns: Rule[], errorHandler: (a: any) => void) {
  return (s: Readable) => {
    const rulesWithErrorHandling = fns.map(rule => addErrorHandler(rule, errorHandler))

    return rulesWithErrorHandling.reduce((a, fn) => fn(a, s), s)
  }
}