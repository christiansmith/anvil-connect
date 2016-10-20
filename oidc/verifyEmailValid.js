/**
 * Module dependencies
 */

// TODO share this with other email validations

var revalidator = require('revalidator')

/**
 * Verify Email in req.connectParams.email is valid.
 *
 * This checks the validate on a syntax level.
 *
 * This middleware will not cause any errors, but instead remove
 * the invalid values off of req.connectParams object.
 */

function verifyEmailValid (req, res, next) {
  if (
    !req.connectParams.email ||
    !revalidator.validate.formats.email.test(req.connectParams.email)
  ) {
    delete req.connectParams.email
  }
  next()
}

/**
 * Exports
 */

module.exports = verifyEmailValid
