/**
 * Module dependencies
 */

var util = require('util')

/**
 * PasswordlessDisabledError
 */

function PasswordlessDisabledError () {
  this.name = 'PasswordlessDisabledError'
  this.message = 'Email sign-in is disabled'
  this.statusCode = 400
}

util.inherits(PasswordlessDisabledError, Error)

/**
 * Exports
 */

module.exports = PasswordlessDisabledError
