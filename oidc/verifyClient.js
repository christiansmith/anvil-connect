/**
 * Module dependencies
 */

var Client = require('../models/Client')
var AuthorizationError = require('../errors/AuthorizationError')

/**
 * Verify Client
 *
 * This route-specific middleware retrieves a registered client and adds it
 * to the request object for use downstream. It verifies that the client is
 * registered and that the redirect_uri parameter matches the configuration
 * of the registered client.
 */

function verifyClient (req, res, next) {
  var params = req.connectParams

  // missing redirect uri
  if (!params.redirect_uri) {
    return next(new AuthorizationError({
      error: 'invalid_request',
      error_description: 'Missing redirect uri',
      statusCode: 400
    }))
  }

  // missing client id
  if (!params.client_id) {
    return next(new AuthorizationError({
      error: 'unauthorized_client',
      error_description: 'Missing client id',
      statusCode: 403
    }))
  }

  Client.get(params.client_id, {
    private: true
  }, function (err, client) {
    if (err) { return next(err) }

    // The client must be registered.
    if (!client) {
      return next(new AuthorizationError({
        error: 'unauthorized_client',
        error_description: 'Unknown client',
        statusCode: 401
      }))
    }

    // Make client available to downstream middleware.
    req.client = client

    // Redirect URI must be configured for this client.
    if (!client.redirect_uris || client.redirect_uris.indexOf(params.redirect_uri) === -1) {
      return next(new AuthorizationError({
        error: 'invalid_request',
        error_description: 'Mismatching redirect uri',
        statusCode: 400
      }))
    }

    next()
  })
}

/**
 * Exports
 */

module.exports = verifyClient
