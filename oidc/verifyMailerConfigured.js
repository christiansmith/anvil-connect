/**
 * Module dependencies
 */

// TODO share this with other email validations

var mailer = require('../boot/mailer')

function verifyMailerConfigured (req, res, next) {
  if (!mailer.transport) {
    return next(new Error('Mailer not configured.'))
  } else {
    return next()
  }
}

module.exports = verifyMailerConfigured
