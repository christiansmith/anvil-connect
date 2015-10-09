/**
 * Module dependencies
 */
var _ = require('lodash')
var qs = require('qs')

var settings = require('../boot/settings')
var mailer = require('../boot/mailer')
var providers = require('../providers')

var providerInfo = {}
var providerNames = Object.keys(providers)
for (var i = 0; i < providerNames.length; i++) {
  providerInfo[providerNames[i]] = providers[providerNames[i]]
}
var visibleProviders = {}
// Only render providers that are not marked as hidden
Object.keys(settings.providers).forEach(function (providerID) {
  if (!settings.providers[providerID].hidden) {
    visibleProviders[providerID] = settings.providers[providerID]
  }
})

module.exports = function (res, params, options) {
  var locals = {
    params: qs.stringify(params),
    request: params,
    providers: visibleProviders,
    providerInfo: providerInfo,
    mailSupport: !!(mailer.transport)
  }
  if (typeof options === 'object') {
    _.assign(locals, options)
  }
  res.render('signin', locals)
}
