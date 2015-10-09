var crypto = require('crypto')
var client = require('../boot/redis').getClient()

/**
 * OneTimeToken
 *
 * OneTimeToken is an expiring (TTL) token class
 * used for any process that requires an expiring
 * token such as email verification and password
 * reset.
 *
 * The constructor generates a random string suitable
 * for use as a public token, and stores metadata
 * such as when the token expires, what the token
 * should be used for, and the identifier of the
 * subject in question (user, client, etc).
 */

function OneTimeToken (options) {
  this._id = options._id || crypto.randomBytes(32).toString('hex')
  this.exp = options.exp
  this.use = options.use
  this.sub = options.sub

  if (options.ttl) {
    this.exp = Math.round(Date.now() / 1000) + options.ttl
  }
}

/**
 * Peek
 *
 * Peek gets a persisted token from the data store
 * and attempts to parse the result. If there is no
 * token found, or the token is expired, the callback
 * in invoked with null error and value. If the token
 * value can't be parsed as JSON, the callback is invoked
 * with an error. Otherwise, the callback is invoked
 * with a null error and an instance of OneTimeToken.
 */

OneTimeToken.peek = function (id, callback) {
  client.get('onetimetoken:' + id, function (err, result) {
    if (err) { return callback(err) }
    if (!result) { return callback(null, null) }

    try {
      var token = new OneTimeToken(JSON.parse(result))
    } catch (err) {
      return callback(err)
    }

    if (Math.round(Date.now() / 1000) > token.exp) {
      return callback(null, null)
    }

    callback(null, token)
  })
}

/**
 * Revoke
 */

OneTimeToken.revoke = function (id, callback) {
  client.del('onetimetoken:' + id, function (err) {
    callback(err)
  })
}

/**
 * Consume
 *
 * Consume retrieves a OneTimeToken instance from
 * the data store and immediately deletes it before
 * invoking the callback with the token.
 */

OneTimeToken.consume = function (id, callback) {
  OneTimeToken.peek(id, function (err, token) {
    if (err) { return callback(err) }

    if (!id) {
      callback(null, null)
    } else {
      OneTimeToken.revoke(id, function (err) {
        if (err) { return callback(err) }
        callback(null, token)
      })
    }
  })
}

/**
 * Issue
 *
 * Issue creates a new OneTimeToken from options and
 * stores the token in the datastore with a TTL.
 */

OneTimeToken.issue = function (options, callback) {
  var token
  if (options instanceof OneTimeToken) {
    token = options
  } else {
    token = new OneTimeToken(options)
  }

  // transaction
  var multi = client.multi()
  multi.set('onetimetoken:' + token._id, JSON.stringify(token))

  // only expire if "exp" is set on the token
  if (token.exp) {
    multi.expireat('onetimetoken:' + token._id, token.exp)
  }

  multi.exec(function (err, results) {
    if (err) { return callback(err) }
    callback(null, token)
  })
}

module.exports = OneTimeToken
