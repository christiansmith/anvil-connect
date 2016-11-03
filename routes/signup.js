/* global __dirname:true, process:true */

/**
 * Module dependencies
 */

var oidc = require('../oidc')
var settings = require('../boot/settings')
var passwordProvider = require('../providers').password
var authenticator = require('../lib/authenticator')
var qs = require('qs')
var User = require('../models/User')
var PasswordsDisabledError = require('../errors/PasswordsDisabledError')

/**
 * Signup Endpoint
 */

module.exports = function (server) {
  /**
   * Signup page
   */

  var getSignupHandler = [
    oidc.selectConnectParams,
    oidc.verifyClient,
    oidc.validateAuthorizationParams,
    function (req, res, next) {
      res.render('signup', {
        params: qs.stringify(req.query),
        request: req.query,
        referer: req.headers['referer'],
        providers: settings.providers
      })
    }
  ]

  /**
   * Password signup handler
   */

  function createUser (req, res, next) {
    User.insert(req.body, { private: true }, function (err, user) {
      if (err) {
        res.render('signup', {
          params: qs.stringify(req.body),
          request: req.body,
          providers: settings.providers,
          error: err.message
        })
      } else {
        authenticator.dispatch('password', req, res, next, function (err, user, info) {
          if (err) { return next(err) }
          if (!user) {
          } else {
            authenticator.login(req, user)
            req.sendVerificationEmail =
              req.provider.emailVerification.enable
            req.flash('isNewUser', true)
            next()
          }
        })
      }
    })
  }

  function usePasswordProvider (req, res, next) {
    req.provider = passwordProvider
    next()
  }

  var postSignupHandler = [
    oidc.selectConnectParams,
    oidc.verifyClient,
    oidc.validateAuthorizationParams,
    usePasswordProvider,
    oidc.enforceReferrer('/signup'),
    createUser,
    oidc.sendVerificationEmail,
    oidc.requireVerifiedEmail(),
    oidc.determineUserScope,
    oidc.promptToAuthorize,
    oidc.authorize
  ]

  if (oidc.beforeAuthorize) {
    postSignupHandler.splice(postSignupHandler.length - 1, 0, oidc.beforeAuthorize)
  }

  /**
   * Passwords Disabled Handler
   */

  function passwordsDisabledHandler (req, res, next) {
    next(new PasswordsDisabledError())
  }

  // Only register the password signup handlers
  // if the password protocol is enabled.
  if (settings.providers.password) {
    server.get('/signup', getSignupHandler)
    server.post('/signup', postSignupHandler)
  } else {
    server.get('/signup', passwordsDisabledHandler)
    server.post('/signup', passwordsDisabledHandler)
  }
}
