/**
 * Module dependencies
 */

var express = require('express')
var oidc = require('../oidc')
var authenticator = require('../lib/authenticator')
var passwordless = require('./passwordless')
var renderSignin = require('../render/renderSignin')
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
      renderSignin(res, req.query)
    })

  /**
   * Password signin and Passwordless post handler.
   */

  var passwordSignin = express.Router() // initialized further down.

  var handler = [
    oidc.selectConnectParams,
    oidc.verifyClient,
    oidc.validateAuthorizationParams,
    oidc.determineProvider.setup({requireProvider: true}),
    oidc.enforceReferrer('/signin'),
    function (req, res, next) {
      if (req.body.provider === 'passwordless') {
        // for passwordless flow see comments in passwordless
        passwordless.signin()(req, res, next)
      } else {
        passwordSignin(req, res, next)
      }
    }
  ]

  var passwordSigninHandler = [
    function (req, res, next) {
      authenticator.dispatch(req.body.provider, req, res, next, function (err, user, info) {
        if (err) {
          renderSignin(res, req.body, {
            error: err.message
          })
        } else if (!user) {
          renderSignin(res, req.body, {
            formError: info.message
          })
        } else {
          authenticator.login(req, user)
          next()
        }
      })
    },
    oidc.requireVerifiedEmail(),
    oidc.determineUserScope,
    oidc.promptToAuthorize,
    oidc.authorize
  ]

  if (oidc.beforeAuthorize) {
    passwordSigninHandler.splice(passwordSigninHandler.length - 1, 0, oidc.beforeAuthorize)
  }

  passwordSignin.use(passwordSigninHandler)

  server.post('/signin', handler)
}
