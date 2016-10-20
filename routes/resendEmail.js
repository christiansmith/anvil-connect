/**
 * Module dependencies
 */

var mailer = require('../boot/mailer')
var oidc = require('../oidc')
var User = require('../models/User')

/**
 * Resend e-mail verification message endpoint
 */

module.exports = function (server) {
  server.get('/email/resend', [
    oidc.selectConnectParams,
    oidc.verifyRedirectURI,
    function (req, res, next) {
      var params = {
        message: req.query.email
          ? 'If we have this e-mail address on file, then we have sent it a ' +
          'verification request.' : '',
        error: !req.query.email ? 'No e-mail address specified.' : '',
        email: req.query.email,
        from: mailer.from,
        redirect_uri: req.connectParams.redirect_uri,
        client_id: req.connectParams.client_id,
        response_type: req.connectParams.response_type,
        scope: req.connectParams.scope,
        resendURL: req.url
      }

      var emailParams = {
        redirect_uri: req.connectParams.redirect_uri,
        client_id: req.connectParams.client_id,
        response_type: req.connectParams.response_type,
        scope: req.connectParams.scope
      }

      if (!req.client) {
        delete params.redirect_uri
        delete params.client_id
        delete params.response_type
        delete params.scope

        delete emailParams.redirect_uri
        delete emailParams.client_id
        delete emailParams.response_type
        delete emailParams.scope
      }

      User.getByEmail(req.query.email, function (err, user) {
        if (err) { return next(err) }

        // We don't notify the end-user if the e-mail was not found in the
        // database or if the account found was already verified because
        // we don't want to allow a malicious user to use this endpoint to
        // scrape connect for registered accounts by e-mail (even though
        // those accounts would have to have unverified e-mail addresses)

        if (user && !user.emailVerified) {
          req.sendVerificationEmail = true
          oidc.sendVerificationEmail(req, res, function () {
            res.render('requireVerifiedEmail', params)
          })
        }
      })
    }
  ])
}
