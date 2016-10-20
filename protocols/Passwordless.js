/**
 * Passwordless Protocol
 *
 * This is essentially empty but is used as stub object so that other
 * code dealing with protocols can stay ignorant of this.
 *
 * The logic which in other case is implemented in the
 * Protocol class is implemented in routes/passwordless.
 */

function Passwordless (provider, configuration) {
  this._provider = provider
  this._configuration = configuration
  this._emailField = 'email'
}

/**
 * Initialize
 */

function initialize (provider, configuration) {
  return new Passwordless(provider, configuration)
}

Passwordless.initialize = initialize

/*
 * Authenticate request based on the contents of a form submission.
 *
 * @param {Object} req
 * @api protected
 */
Passwordless.prototype.authenticate = function (req, options) {
  throw new Error('Passwordless authenticate must not be called')
}

/**
 * Exports
 */

module.exports = Passwordless
