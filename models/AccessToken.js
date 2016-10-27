/**
 * Module dependencies
 */

var async = require('async')
var client = require('../boot/redis').getClient()
var settings = require('../boot/settings')
var Modinha = require('modinha')
var Document = require('modinha-redis')
var random = Modinha.defaults.random
var AccessTokenJWT = require('../models/AccessTokenJWT')
var InvalidTokenError = require('../errors/InvalidTokenError')
var UnauthorizedError = require('../errors/UnauthorizedError')
var InsufficientScopeError = require('../errors/InsufficientScopeError')
var nowSeconds = require('../lib/time-utils').nowSeconds

/**
 * Model definition
 */

var AccessToken = Modinha.define('accesstokens', {
  // access token
  at: {
    type: 'string',
    required: true,
    default: random(10),
    uniqueId: true
  },

  // token type
  tt: {
    type: 'string',
    enum: ['Bearer', 'mac'],
    default: 'Bearer'
  },

  // expires in
  ei: {
    type: 'number',
    default: 3600
  },

  // refresh token
  rt: {
    type: 'string',
    unique: true
  },

  // issuer
  iss: {
    type: 'string'
  },

  // client id
  cid: {
    type: 'string',
    required: true
  },

  // user id
  uid: {
    type: 'string',
    required: true
  },

  // scope
  scope: {
    type: 'string',
    required: true
  },

  // jwt?????
  jwt: {
    type: 'string'
  }

})

/**
 * Document persistence
 */

AccessToken.extend(Document)
AccessToken.__client = client

/**
 * Index the token to manage a list
 * of authorized clients for a user.
 */

AccessToken.defineIndex({
  type: 'sorted',
  key: ['users:$:clients', 'uid'],
  score: 'created',
  member: 'cid'
})

/**
 * Index a token by it's user/client pair.
 * This makes it possible to resuse an access token
 * instead of issuing a new one.
 */

AccessToken.defineIndex({
  type: 'hash',
  key: 'user:client:token',
  field: ['$:$', 'uid', 'cid'],
  value: 'at'
})

/**
 *
 */

AccessToken.exists = function (userId, clientId, callback) {
  var key = 'user:client:token'
  var field = userId + ':' + clientId

  this.__client.hget(key, field, function (err, id) {
    if (err) return callback(err)
    return callback(null, Boolean(id))
  })
}

/**
 * Mappings
 */

AccessToken.mappings.issue = {
  'at': 'access_token',
  'tt': 'token_type',
  'ei': 'expires_in',
  'rt': 'refresh_token'
}

AccessToken.mappings.exchange = {
  'cid': 'client_id',
  'uid': 'user_id',
  'ei': 'max_age',
  'scope': 'scope'
}

/**
 * Exchange authorization code for access token
 */

// TODO: Need to modify modinha-redis
// insert method to merge options for
// initialization so we can use the
// mapping directly with insert.
AccessToken.exchange = function (request, callback) {
  var token = AccessToken.initialize(request.code, { mapping: 'exchange' })
  token.iss = settings.issuer
  token.rt = random(settings.refresh_token_bytes_range)()
  this.insert(token, function (err, token) {
    if (err) { return callback(err) }
    callback(null, token)
  })
}

/**
 * Issue access token
 */

AccessToken.issue = function (request, callback) {
  if (!request.user || !request.client) {
    return callback(new Error('invalid_request'))
  }

  this.insert({
    iss: settings.issuer,
    uid: request.user._id,
    cid: request.client._id,
    ei: (
      request.connectParams &&
      parseInt(request.connectParams.max_age, 10)
    ) ||
      request.client.default_max_age,
    scope: request.scope
  }, function (err, token) {
    if (err) { return callback(err) }
    var response = token.project('issue')

    // Unless the client is set to issue a random token,
    // transform it to a signed JWT.
    if (request.client.access_token_type !== 'random') {
      try {
        response.access_token = token.toJWT(settings.keys.sig.prv)
      } catch (err) {
        return callback(err)
      }
    }

    callback(null, response)
  })
}

/**
 * Refresh access token
 */

AccessToken.refresh = function (refreshToken, clientId, callback) {
  AccessToken.getByRt(refreshToken, function (err, at) {
    if (err) {
      return callback(err)
    }

    if (!at) {
      return callback(new InvalidTokenError('Unknown refresh token'))
    }

    if (at.cid !== clientId) {
      return callback(new InvalidTokenError('Mismatching client id'))
    }

    AccessToken.insert({
      iss: settings.issuer,
      uid: at.uid,
      cid: at.cid,
      ei: at.ei,
      rt: random(settings.refresh_token_bytes_range)(),
      scope: at.scope
    }, function (err, token) {
      if (err) { return callback(err) }

      // we should destroy the current token
      AccessToken.delete(at.at, function (err) {
        if (err) { return callback(err) }
        callback(null, token)
      })
    })
  })
}

/**
 * Revoke access token
 */

AccessToken.revoke = function (userId, clientId, callback) {
  var key = 'user:client:token'
  var field = userId + ':' + clientId

  this.__client.hget(key, field, function (err, id) {
    if (err) { return callback(err) }
    if (!id) { return callback(null, null) }

    AccessToken.delete(id, function (err, result) {
      if (err) { return callback(err) }
      callback(null, result)
    })
  })
}

/**
 * Verify access token
 */

AccessToken.verify = function (token, options, callback) {
  async.parallel({
    // Handle JWT
    jwt: function (done) {
      // the token is a JWT
      if (token.indexOf('.') !== -1) {
        var decoded = AccessTokenJWT.decode(token, options.key)
        if (!decoded || decoded instanceof Error) {
          done(new UnauthorizedError({
            realm: 'user',
            error: 'invalid_token',
            error_description: 'Invalid access token',
            statusCode: 401
          }))
        } else {
          done(null, decoded)
        }

      // the token is not a JWT
      } else {
        done()
      }
    },

    // Fetch from database
    random: function (done) {
      // the token is random
      if (token.indexOf('.') === -1) {
        AccessToken.get(token, function (err, instance) {
          if (err) {
            return done(err)
          }

          if (!instance) {
            return done(new UnauthorizedError({
              realm: 'user',
              error: 'invalid_request',
              error_description: 'Unknown access token',
              statusCode: 401
            }))
          }

          done(null, {
            jti: instance.at,
            iss: instance.iss,
            sub: instance.uid,
            aud: instance.cid,
            iat: instance.created,
            exp: instance.created + instance.ei,
            scope: instance.scope
          })
        })

      // the token is not random
      } else {
        done()
      }
    }

  }, function (err, result) {
    if (err) { return callback(err) }

    var claims = result.random || result.jwt.payload
    var issuer = options.iss
    var scope = options.scope

    // mismatching issuer
    if (claims.iss !== issuer) {
      return callback(new UnauthorizedError({
        error: 'invalid_token',
        error_description: 'Mismatching issuer',
        statusCode: 403
      }))
    }

    // expired token
    if (nowSeconds() > claims.exp) {
      return callback(new UnauthorizedError({
        realm: 'user',
        error: 'invalid_token',
        error_description: 'Expired access token',
        statusCode: 403
      }))
    }

    // insufficient scope
    if (scope && claims.scope.indexOf(scope) === -1) {
      return callback(new UnauthorizedError({
        realm: 'user',
        error: 'insufficient_scope',
        error_description: 'Insufficient scope',
        statusCode: 403
      }))
    }

    callback(null, claims)
  })
}

/**
 * Convert an AccessToken instance into a JWT
 */

AccessToken.prototype.toJWT = function (secret) {
  var jwt = new AccessTokenJWT(this)
  jwt.payload.exp = nowSeconds(this.ei)
  return jwt.encode(secret)
}

/**
 * Errors
 */

AccessToken.InvalidTokenError = InvalidTokenError
AccessToken.InsufficientScopeError = InsufficientScopeError

/**
 * Exports
 */

module.exports = AccessToken
