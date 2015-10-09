/**
 * Module dependencies
 */

var url = require('url')
var revalidator = require('revalidator')
var settings = require('../boot/settings')
var mailer = require('../boot/mailer')
var User = require('../models/User')
var OneTimeToken = require('../models/OneTimeToken')
var PasswordsDisabledError = require('../errors/PasswordsDisabledError')

/**
 * Account Recovery
 *
 * Recovery flow:
 *
 * 1. Accept user e-mail
 * 2. Validate input as valid e-mail, display error if not
 * 3. Verify user account exists with specified e-mail
 * 4. If user account exists, issue token and send e-mail
 * 5. Regardless of success/failure, direct user to emailSent view
 *
 * Password reset flow:
 *
 * 1. When user clicks on link, verify token exists and is for pw reset
 * 2. Direct user to resetPassword view
 * 3. Verify password fulfills password strength requirements
 * 4. If error, re-display resetPassword view, but with error message
 * 5. Update user object and revoke token
 * 6. Send user an e-mail notifying them that their password was changed
 * 7. Direct user to passwordReset view
 *
 * Default expiry time for tokens is 1 day
 */

function verifyPasswordsEnabled (req, res, next) {
  if (!settings.providers.password) {
    return next(new PasswordsDisabledError())
  } else {
    return next()
  }
}

function verifyMailerConfigured (req, res, next) {
  if (!mailer.transport) {
    return next(new Error('Mailer not configured.'))
  } else {
    return next()
  }
}

function verifyPasswordResetToken (req, res, next) {
  if (!req.query.token) {
    return res.render('recovery/resetPassword', {
      error: 'Invalid reset code.'
    })
  }

  OneTimeToken.peek(req.query.token, function (err, token) {
    if (err) { return next(err) }
    if (!token || token.use !== 'resetPassword') {
      return res.render('recovery/resetPassword', {
        error: 'Invalid reset code.'
      })
    }

    req.passwordResetToken = token
    next()
  })
}

module.exports = function (server) {
  server.get('/recovery',
    verifyPasswordsEnabled,
    verifyMailerConfigured,
    function (req, res, next) {
      res.render('recovery/start')
    }
  )

  server.post('/recovery',
    verifyPasswordsEnabled,
    verifyMailerConfigured,
    function (req, res, next) {
      if (
        !req.body.email ||
        !revalidator.validate.formats.email.test(req.body.email)
      ) {
        return res.render('recovery/start', {
          error: 'Please enter a valid e-mail address.'
        })
      }

      User.getByEmail(req.body.email, function (err, user) {
        if (err) { return next(err) }
        if (!user) { return res.render('recovery/emailSent') }

        OneTimeToken.issue({
          sub: user._id,
          ttl: 3600 * 24, // 1 day
          use: 'resetPassword'
        }, function (err, token) {
          if (err) { return next(err) }

          var resetPasswordURL = url.parse(settings.issuer)
          resetPasswordURL.pathname = 'resetPassword'
          resetPasswordURL.query = { token: token._id }

          mailer.sendMail('resetPassword', {
            email: user.email,
            resetPasswordURL: url.format(resetPasswordURL)
          }, {
            to: user.email,
            subject: 'Reset your password'
          }, function (err, responseStatus) {
            if (err) { }
            // TODO: REQUIRES REFACTOR TO MAIL QUEUE
            res.render('recovery/emailSent')
          })
        })
      })
    }
  )

  server.get('/resetPassword',
    verifyPasswordsEnabled,
    verifyMailerConfigured,
    verifyPasswordResetToken,
    function (req, res, next) {
      res.render('recovery/resetPassword')
    }
  )

  server.post('/resetPassword',
    verifyPasswordsEnabled,
    verifyMailerConfigured,
    verifyPasswordResetToken,
    function (req, res, next) {
      var uid = req.passwordResetToken.sub

      if (req.body.password !== req.body.confirmPassword) {
        return res.render('recovery/resetPassword', {
          validationError: 'Passwords do not match.'
        })
      }

      User.changePassword(uid, req.body.password, function (err, user) {
        if (err && (
          err.name === 'PasswordRequiredError' ||
          err.name === 'InsecurePasswordError'
          )) {
          return res.render('recovery/resetPassword', {
            validationError: err.message
          })
        }

        if (err) { return next(err) }

        OneTimeToken.revoke(req.passwordResetToken._id, function (err) {
          if (err) { return next(err) }

          var recoveryURL = url.parse(settings.issuer)
          recoveryURL.pathname = 'recovery'

          mailer.sendMail('passwordChanged', {
            email: user.email,
            recoveryURL: url.format(recoveryURL)
          }, {
            to: user.email,
            subject: 'Your password has been changed'
          }, function (err, responseStatus) {
            if (err) { }
            // TODO: REQUIRES REFACTOR TO MAIL QUEUE
            res.render('recovery/passwordReset')
          })
        })
      })
    }
  )
}
