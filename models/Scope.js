/**
 * Module dependencies
 */

var client = require('../boot/redis').getClient()
var Modinha = require('modinha')
var Document = require('modinha-redis')

/**
 * Model definition
 */

var Scope = Modinha.define('scopes', {
  name: {
    type: 'string',
    required: true,
    uniqueId: true
  },
  description: {
    type: 'string',
    required: true
  },
  restricted: {
    type: 'boolean',
    default: true,
    secondary: true
  },
  attributes: {
    type: 'object'
  }
})

/**
 * Document persistence
 */

Scope.extend(Document)
Scope.__client = client

/**
 * Scope intersections
 */

Scope.intersects('roles')

/**
 * Determine
 *
 * Given a scope string (req.connectParams.scope) and a subject
 * (User or Client instance, or any object implementing
 * `authorizedScope(callback)`), this function makes a determination
 * on scope that can be issued.
 *
 * Scope.determine provides it's callback with an error,
 * scope string, and array of scope objects.
 */

Scope.determine = function (scopes, subject, callback) {
  Scope.get(scopes.split(' '), function (err, scopes) {
    if (err) { return callback(err) }

    var knownScope = scopes.reduce(function (list, scope) {
      if (scope instanceof Scope) {
        list.push(scope)
      }
      return list
    }, [])

    subject.authorizedScope(function (err, authorizedScope) {
      if (err) { return callback(err) }

      // filter authorized scope
      scopes = knownScope.filter(function (scope) {
        var found;
        if (typeof authorizedScope === 'object') {
          authorizedScope.map(function(result) {
            found = found || (result.indexOf(scope.name) !== -1);
          });
        }
        
        return !scope.restricted || found || authorizedScope.indexOf(scope.name) !== -1
      })

      // extract scope names
      var scope = scopes.map(function (scope) {
        return scope.name
      }).join(' ')

      callback(null, scope, scopes)
    })
  })
}

/**
 * Exports
 */

module.exports = Scope
