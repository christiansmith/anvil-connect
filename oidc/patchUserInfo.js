/**
 * Module dependencies
 */

var User = require('../models/User')
var NotFoundError = require('../errors/NotFoundError')

/**
 * Export
 */

function patchUserInfo (req, res, next) {
  // Map updates given in the request body to attributes
  // in the scopes authorized by the access token.
  var scopeUserAttributes = []
  var authorizedUpdates = {}
  req.scopes.forEach(function (scope) {
    scope.attributes && scope.attributes.user && scope.attributes.user.forEach(function (key) {
      scopeUserAttributes.push(key)
      if (req.body && req.body[key] !== undefined) {
        authorizedUpdates[key] = req.body[key]
      }
    })
  })

  // Do the update and return the usual userinfo data
  // after the update is complete.
  User.patch(req.claims.sub, authorizedUpdates, {
    mapping: 'userinfo'
  }, function (err, user) {
    if (err) { return next(err) }
    if (!user) { return next(new NotFoundError()) }

    var projection = user.project('userinfo')
    var userInfo = { sub: projection.sub }

    scopeUserAttributes.forEach(function (key) {
      if (typeof projection[key] !== 'undefined') {
        userInfo[key] = projection[key]
      }
    })

    res.status(200).json(userInfo)
  })
}

module.exports = patchUserInfo
