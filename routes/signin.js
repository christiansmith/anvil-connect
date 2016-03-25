/**
 * Module dependencies
 */

var oidc = require('../oidc')
var settings = require('../boot/settings')
var mailer = require('../boot/mailer').getMailer()
var authenticator = require('../lib/authenticator')
var qs = require('qs')
var InvalidRequestError = require('../errors/InvalidRequestError')
var providers = require('../providers')

var providerInfo = {}
var providerNames = Object.keys(providers)
for (var i = 0; i < providerNames.length; i++) {
  providerInfo[ providerNames[ i ] ] = providers[ providerNames[ i ] ]
}
var visibleProviders = {}
// Only render providers that are not marked as hidden
Object.keys(settings.providers).forEach(function (providerID) {
  if (!settings.providers[ providerID ].hidden) {
    visibleProviders[ providerID ] = settings.providers[ providerID ]
  }
})

/**
 * Signin Endpoint
 */

module.exports = function (server) {
  /**
   * Signin page
   */

  server.get('/signin',
    oidc.selectConnectParams,
    oidc.verifyClient,
    oidc.validateAuthorizationParams,
    function (req, res, next) {
      res.render('signin', {
        params: qs.stringify(req.query),
        request: req.query,
        referer: req.headers['referer'],
        providers: visibleProviders,
        providerInfo: providerInfo,
        mailSupport: !!(mailer.transport)
      })
    })

  /**
   * Password signin handler
   */

  var handler = [
    oidc.selectConnectParams,
    oidc.verifyClient,
    oidc.validateAuthorizationParams,
    oidc.determineProvider,
    oidc.enforceReferrer('/signin'),
    function (req, res, next) {
      if (!req.provider) {
        next(new InvalidRequestError('Invalid provider'))
      } else {
        authenticator.dispatch(req.body.provider, req, res, next, function (err, user, info) {
          if (err) {
            res.render('signin', {
              params: qs.stringify(req.body),
              request: req.body,
              providers: visibleProviders,
              providerInfo: providerInfo,
              mailSupport: !!(mailer.transport),
              error: err.message
            })
          } else if (!user) {
            res.render('signin', {
              params: qs.stringify(req.body),
              request: req.body,
              providers: visibleProviders,
              providerInfo: providerInfo,
              mailSupport: !!(mailer.transport),
              formError: info.message
            })
          } else {
            authenticator.login(req, user)
            next()
          }
        })
      }
    },
    oidc.requireVerifiedEmail(),
    oidc.determineUserScope,
    oidc.promptToAuthorize,
    oidc.authorize
  ]

  if (oidc.beforeAuthorize) {
    handler.splice(handler.length - 1, 0, oidc.beforeAuthorize)
  }

  server.post('/signin', handler)
}
