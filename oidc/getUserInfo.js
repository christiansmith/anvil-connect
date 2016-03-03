/**
 * Module dependencies
 */

var User = require('../models/User')
var NotFoundError = require('../errors/NotFoundError')

/**
 * Export
 */

function getUserInfo (req, res, next) {
  // Respond with userinfo based on authorized scopes
  User.get(req.claims.sub, function (err, user) {
    if (err) { return next(err) }
    if (!user) { return next(new NotFoundError()) }

    // project the retrieved user with the
    // userinfo mapping
    var projection = user.project('userinfo')
    var userInfo = { sub: projection.sub }

    // send only attributes the user has scope
    // to read
    req.scopes.forEach(function (scope) {
      scope.attributes && scope.attributes.user && scope.attributes.user.forEach(function (key) {
        if (typeof projection[key] !== 'undefined') {
          userInfo[key] = projection[key]
        }
      })
    })

    res.status(200).json(userInfo)
  })
}

module.exports = getUserInfo
