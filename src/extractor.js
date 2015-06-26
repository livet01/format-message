import Visitor from './visitor'
import { getKeyNormalized } from './translate-util'

/**
 * Transforms source code, translating and inlining `formatMessage` calls
 **/
export default class Extractor extends Visitor {

  constructor (options) {
    super(options)
    this.patterns = null
  }

  extract ({ sourceCode, sourceFileName }) {
    this.patterns = {}
    this.run({ sourceCode, sourceFileName })
    return this.patterns
  }

  exitFormatCall (node) {
    this.savePattern(node)
  }

  exitTranslateCall (node) {
    this.savePattern(node)
  }

  savePattern (node) {
    if (!this.isReplaceable(node)) return

    const pattern = this.getStringValue(node.arguments[0])
    const error = this.getPatternError(pattern)
    if (error) {
      this.reportError(node, 'SyntaxError: pattern is invalid', error.message)
    } else {
      const key = this.getKey(pattern)
      this.patterns[key] = getKeyNormalized(pattern)
    }
  }

  getInstructions () {
    return [
      'The messages in this file use the ICU Message Format Syntax. Placeholders',
      'for arguments are surrounded by curly braces: {name, type, style}. The',
      'name, type, and style of the arguments must not be translated. Sub-messages',
      'for plural and select arguments in nested curly braces do need to be',
      'translated: {gender, select, male {Men} female {Women} other {Other}}.',
      'Single quotes are used to escape special characters.',
      'For more information see the following resources:',
      '* ICU User Guide: http://userguide.icu-project.org/formatparse/messages',
      '* Related Java API: http://icu-project.org/apiref/icu4j/com/ibm/icu/text/MessageFormat.html',
      '* Related PHP API: http://php.net/manual/en/class.messageformatter.php',
      '',
      'Generated by format-message: https://github.com/thetalecrafter/format-message'
    ]
  }

  static extract (source, options) {
    return new Extractor(options).extract(source)
  }

  static extractFromFiles (files, options) {
    const extractor = new Extractor(options)
    const unsorted = {}
    extractor.forEachFile(files, source => {
      const patterns = extractor.extract(source)
      Object.assign(unsorted, patterns)
    })
    const data = {}
    data['Instructions for translators'] = extractor.getInstructions()
    const sorted = data[extractor.locale] = {}
    Object.keys(unsorted).sort().forEach(key => sorted[key] = unsorted[key])
    const json = JSON.stringify(data, null, '  ')
    if (options.outFile) {
      extractor.emitFile(options.outFile, json)
    } else {
      extractor.emitResult(json)
    }
  }

}