const _ = require('lodash')
const React = require('react')
const PropTypes = require('./prop-types')

let options

const wrapPropTypes = () => {
  // Adds a .type key which allows the type to be derived during the
  // evaluation process. This is necessary for complex types which
  // return the result of a generator function, leaving no way to
  // determine which type instantiated it.

  const original = _.cloneDeep(PropTypes)

  _.each(PropTypes, (v, k) => {
    if (v.isRequired !== undefined) {
      // Simple type. Just extend the object
      _.defaultsDeep(PropTypes[k], { type: k, isRequired: { type: k } })
    } else {
      // Complex type. Must extend the creator's return value
      PropTypes[k] = (arg) =>
        _.defaultsDeep(original[k](arg), {
          type: k, arg: arg,
          isRequired: { type: k, arg: arg }
        })
    }
  })
}

wrapPropTypes()

const GENERATORS = {
  // Simple types
  array: () => [],
  bool: () => true,
  func: () => () => {},
  number: () => 1,
  object: () => ({}),
  string: () => 'string',
  any: () => 'any',
  element: () => React.createElement('div'),
  node: () => 'node',

  // Complex types
  arrayOf: (type) => [generateOneProp(type)],
  instanceOf: (klass) => new klass(),
  objectOf: (type) => ({ key: generateOneProp(type) }),
  oneOf: (values) => _.first(values),
  oneOfType: (types) => forceGenerateOneProp(_.first(types)),
  shape: (shape) => generateProps(shape)
}

const shouldGenerate = (propType) => {
  return (
    // Generate required props, and this is the required version
    (options.required && !propType.isRequired) ||
    // Generate optional props, and this is the optional version
    (options.optional && !!propType.isRequired)
  )
}

const generateOneProp = (propType, propName) => {
  const generate = options.generators[propType.type]
  const arg = propType.arg
  if (generate) {
    if (shouldGenerate(propType)) {
      if (propName) {
        return [propName, generate(arg, { propName })]
      } else {
        return generate(arg, { propName })
      }
    }
  }
}

const forceGenerateOneProp = (propType) => {
  const generate = GENERATORS[propType.type]
  const arg = propType.arg
  if (generate) {
    return generate(arg, { propName })
  }
}

const generateProps = (arg, opts) => {
  options = _.defaults({}, opts, { required: true, optional: false })
  if (opts && opts.generators) {
    options.generators = _.defaults({}, opts.generators, GENERATORS)
  } else {
    options.generators = GENERATORS
  }

  let propTypes

  if (!arg) {
    throw new TypeError('generateProps expected a propType object or a React Component')
  } else if (_.isPlainObject(arg.propTypes)) {
    propTypes = arg.propTypes
  } else if (_.isPlainObject(arg)) {
    propTypes = arg
  } else {
    throw new TypeError('generateProps expected a propType object or a React Component')
  }

  return _(propTypes)
    .map(generateOneProp)
    .compact()
    .fromPairs()
    .value()
}

module.exports = generateProps
