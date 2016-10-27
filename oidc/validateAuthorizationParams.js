/**
 * Module dependencies
 */

var settings = require('../boot/settings')
var AuthorizationError = require('../errors/AuthorizationError')

/**
 * Valid response types
 */

var validResponseTypes = [
  'code',
  'token',
  'id_token',
  'none'
]

/**
 * Supported response modes
 */

var validResponseModes = [
  'query',
  'fragment'
]

/**
 * Validate Authorization Parameters
 *
 * Ensures that `response_type`, `redirect_uri`, and `client_id` are included in
 * request parameters, and that `response_type` is supported.
 */

function validateAuthorizationParams (req, res, next) {
  var params = req.connectParams

  // missing response type
  if (!params.response_type || !params.response_type.trim()) {
    return next(new AuthorizationError({
      error: 'invalid_request',
      error_description: 'Missing response type',
      redirect_uri: params.redirect_uri,
      statusCode: 302
    }))
  }

  var responseTypes = params.response_type.trim().split(' ')

  // Check that
  // - All response_types are valid
  // - If `none` response_type is given, that it is the only response_type
  var isValidResponseType = responseTypes.indexOf('none') !== -1
    ? responseTypes.length === 1
    : responseTypes.every(
      function (responseType) {
        return validResponseTypes.indexOf(responseType) !== -1
      }
    )

  // invalid response type
  if (!isValidResponseType) {
    return next(new AuthorizationError({
      error: 'unsupported_response_type',
      error_description: 'Unsupported response type',
      redirect_uri: params.redirect_uri,
      statusCode: 302
    }))
  }

  // Check that there is at least one defined set of response_types that are
  // supported together in both the settings and on the client.
  //
  // For example, if the settings allow 'code', 'id_token token', and
  // 'code id_token token', then:
  //
  // - 'code' will pass
  // - 'id_token token' will pass
  // - 'code token id_token' will pass
  // - 'token' will NOT pass
  // - 'id_token code' will NOT pass

  // Get the registered response_type sets off the client
  var registeredResponseTypeSets =

    // If the client exists and has response_types defined
    (req.client && Array.isArray(req.client.response_types))

      // Return an array of response_type sets
      ? req.client.response_types.map(function (responseTypeString) {
        return responseTypeString.trim().split(' ')
      })
      // Otherwise, return an array with the default set, [ 'code' ]
      : [ [ 'code' ] ]

  // In the array of response_types in the settings...
  var isSupportedResponseType = settings.response_types_supported

    // check each set until we find one that satisfies the following:
    .some(function (responseTypeString) {
      var responseTypeSet = responseTypeString.split(' ')

      // if there is at least one response_type set registered on the client...
      if (registeredResponseTypeSets.some(function (regResTypeSet) {
        var indices = []

        // that has the same number of response_types in it...
        return regResTypeSet.length === responseTypeSet.length &&
          regResTypeSet.every(function (responseType) {
            var index = responseTypeSet.indexOf(responseType)

            // of which there are no duplicates...
            if (indices.indexOf(index) !== -1) {
              return false
            }
            indices.push(index)

            // and where every response_type value exists in the response_type
            // set from the settings...
            return responseTypeSet.indexOf(responseType) !== -1
          })

      // then we have found a response_type set that is both permitted by the
      // server settings and registered for the current client
      })) {
        var indices = []

        // then we check to see that the response_type set received in the auth
        // request also has the same number of response_types...
        return responseTypes.length === responseTypeSet.length &&
          responseTypes.every(function (responseType) {
            var index = responseTypeSet.indexOf(responseType)

            // that there are no duplicates...
            if (indices.indexOf(index) !== -1) {
              return false
            }
            indices.push(index)

            // and that every response_type value exists in the response_type
            // set that we verified is both registered by the client and
            // permitted by the settings

            // if this is true, then we found a match, and the response_type
            // requested is valid, permitted, and registered
            return responseTypeSet.indexOf(responseType) !== -1
          })
      } else {
        // otherwise, continue on to the next response_type in the settings
        return false
      }
    })

  // unsupported response type
  if (!isSupportedResponseType) {
    return next(new AuthorizationError({
      error: 'unsupported_response_type',
      error_description: 'Unsupported response type',
      redirect_uri: params.redirect_uri,
      statusCode: 302
    }))
  }

  // unsupported response mode
  if (params.response_mode && params.response_mode.trim() &&
    validResponseModes.indexOf(params.response_mode.trim()) === -1) {
    return next(new AuthorizationError({
      error: 'unsupported_response_mode',
      error_description: 'Unsupported response mode',
      redirect_uri: params.redirect_uri,
      statusCode: 302
    }))
  }

  // missing scope
  if (!params.scope) {
    return next(new AuthorizationError({
      error: 'invalid_scope',
      error_description: 'Missing scope',
      redirect_uri: params.redirect_uri,
      statusCode: 302
    }))
  }

  // missing openid scope
  if (params.scope.split(' ').indexOf('openid') === -1) {
    return next(new AuthorizationError({
      error: 'invalid_scope',
      error_description: 'Missing openid scope',
      redirect_uri: params.redirect_uri,
      statusCode: 302
    }))
  }

  // missing nonce
  if (!params.nonce && requiresNonce(responseTypes)) {
    return next(new AuthorizationError({
      error: 'invalid_request',
      error_description: 'Missing nonce',
      redirect_uri: params.redirect_uri,
      statusCode: 302
    }))
  }

  next()
}

/**
 * Check if a nonce is required
 */

function requiresNonce (responseTypes) {
  return responseTypes.some(function (responseType) {
    return responseType === 'id_token' || responseType === 'token'
  })
}

/**
 * Exports
 */

module.exports = validateAuthorizationParams
