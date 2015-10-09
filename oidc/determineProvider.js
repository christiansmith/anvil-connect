/**
 * Module dependencies
 */

var settings = require('../boot/settings')
var providers = require('../providers')
var InvalidRequestError = require('../errors/InvalidRequestError')

/**
 * Determine provider middleware
 */

function determineProvider (options, req, res, next) {
  var providerID = req.params.provider || req.connectParams.provider
  if (providerID && settings.providers[providerID]) {
    req.provider = providers[providerID]
  }
  if (options.requireProvider && !req.provider) {
    return next(new InvalidRequestError('Invalid provider'))
  }
  next()
}

module.exports = function (req, res, next) {
  determineProvider({}, req, res, next)
}

module.exports.setup = function (options) {
  options = options || {}
  options = {
    requireProvider: options.requireProvider || false
  }
  return function (req, res, next) {
    determineProvider(options, req, res, next)
  }
}
