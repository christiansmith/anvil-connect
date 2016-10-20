/**
 * Module dependencies
 */

var settings = require('../boot/settings')
var oidc = require('../oidc')
var authenticator = require('../lib/authenticator')
var NotFoundError = require('../errors/NotFoundError')
var renderSignin = require('../render/renderSignin')

/**
 * Third Party Provider Authorization Endpoints
 */

module.exports = function (server) {
  /**
   * Initiate Third Party Authorization
   */

  server.get('/connect/:provider',
    oidc.selectConnectParams,
    oidc.verifyClient,
    oidc.validateAuthorizationParams,
    oidc.stashParams,
    oidc.determineProvider,
    function (req, res, next) {
      var provider = req.params.provider
      var config = settings.providers[provider]

      // Authorize
      if (config) {
        authenticator.dispatch(provider, req, res, next, {
          scope: config.scope,
          state: req.authorizationId
        })

      // NOT FOUND
      } else {
        next(new NotFoundError())
      }
    })

  /**
   * Handle Third Party Authorization
   */

  var handler = [
    oidc.unstashParams,
    oidc.verifyClient,
    oidc.determineProvider,

    function (req, res, next) {
      if (settings.providers[req.params.provider]) {
        authenticator.dispatch(req.params.provider, req, res, next, function (err, user, info) {
          if (err) { return next(err) }

          // render the signin screen with an error
          if (!user) {
            renderSignin(res, req.body, {
              error: info.message
            })
          // login the user
          } else {
            authenticator.login(req, user)
            next()
          }
        })

      // NOT FOUND
      } else {
        next(new NotFoundError())
      }
    },

    oidc.sendVerificationEmail,
    oidc.requireVerifiedEmail(),
    oidc.determineUserScope,
    oidc.promptToAuthorize,
    oidc.authorize
  ]

  if (oidc.beforeAuthorize) {
    handler.splice(handler.length - 1, 0, oidc.beforeAuthorize)
  }

  server.get('/connect/:provider/callback', handler)
  server.post('/connect/:provider/callback', handler)

  /**
   * Revoke Third Party Authorization
   */

  server.all('/connect/:provider/revoke',
    oidc.parseAuthorizationHeader,
    oidc.getBearerToken,
    oidc.verifyAccessToken({
      iss: settings.issuer,
      key: settings.keys.sig.pub
    }),
    oidc.revoke
  )
}
