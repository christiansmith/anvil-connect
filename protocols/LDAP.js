/**
 * Module dependencies
 */

var async = require('async')
var ADStrategy = require('passport-adauth').Strategy
var LdapStrategy = require('passport-ldapauth').Strategy
var User = require('../models/User')
var Role = require('../models/Role')

/**
 * Regexes for utility functions
 */

var domainDnRegex = /,?\s*((?:dc=[^,=\s][^,=]+[^,=\s],?\s*){2,})$/i
var dnPartRegex = /([a-z]+)=([^,\\ ][^,\\]*(?:\\.[^,\\]*)*)/gi
var badExtra = /[^,\s]/g

/**
 * Extracts a lowercased domain from a distinguished name for comparison
 * purposes.
 *
 * e.g. "CN=User,OU=MyBusiness,DC=example,DC=com" will return "example.com."
 */

function dnToDomain (dn) {
  if (!dn || typeof dn !== 'string') { return null }
  var matches = domainDnRegex.exec(dn)
  if (matches) {
    return matches[1].replace(dnPartRegex, '$1.').toLowerCase()
  } else {
    return null
  }
}

/**
 * Normalizes distinguished names, removing any extra whitespace, lowercasing
 * the DN, and running some basic validation checks.
 *
 * If the DN is found to be malformed, will return null.
 */

function normalizeDN (dn) {
  if (!dn || typeof dn !== 'string') { return null }
  var normalizedDN = ''
  // Take advantage of replace() to grab the matched segments of the DN. If what
  // is left over contains unexpected characters, we assume the original DN was
  // malformed.
  var extra = dn.replace(dnPartRegex, function (match) {
    normalizedDN += match.toLowerCase() + ','
    return ''
  })
  if (!normalizedDN) { return null }
  if (badExtra.test(extra)) { return null }
  return normalizedDN.substr(0, normalizedDN.length - 1)
}

/**
 * Verifier
 */

function verifier (provider, config) {
  return function (req, user, done) {
    user.id = (config.serverType || provider.serverType) === 'AD'
      ? user.objectGUID : user[provider.mapping.id]

    User.connect(req, null, user, function (err, connectUser, info) {
      if (err) { return done(err) }
      if (connectUser && user._groups) {
        // Put the distinguished names of the directory server groups the user is
        // in into an array.
        var rolesToAdd = user._groups.map(function (group) {
          return group.dn
        })

        var rolesToRemove = []

        // Create an object which maps normalized DNs to their original format
        var ldapGroupDNs = {}
        rolesToAdd.forEach(function (dn) {
          ldapGroupDNs[normalizeDN(dn)] = dn
        })

        Role.listByUsers(connectUser, function (err, roles) {
          if (err) { return done(err) }

          var userDomain = dnToDomain(user.dn)

          roles.forEach(function (role) {
            if (role) {
              var roleDN = normalizeDN(role.name)

              // Only modify existing user roles if they are:
              //  * A valid distinguished name
              //  * In the same domain as the directory server
              if (roleDN && dnToDomain(role.name) === userDomain) {
                if (ldapGroupDNs[roleDN]) {
                  rolesToAdd.splice(rolesToAdd.indexOf(ldapGroupDNs[roleDN]), 1)
                } else {
                  rolesToRemove.push(role.name)
                }
              }
            }
          })

          // Does not create roles if they have not been defined yet in Connect.
          // This is intentional. It allows Connect's roles to remain free of
          // clutter, holding only the directory server groups that are needed as
          // roles in Connect.
          //
          // Likewise, if a group is deleted or renamed in the directory server,
          // it is up to the administrator to remove or update the related role in
          // Connect.

          async.parallel([

            function (next) {
              async.each(rolesToAdd, function (roleName, callback) {
                Role.get(roleName, function (err, role) {
                  if (err) { return callback(err) }
                  if (!role) { return callback() }

                  User.addRoles(connectUser, roleName, function (err, result) {
                    if (err) { return callback(err) }
                    rolesToAdd.splice(rolesToAdd.indexOf(roleName), 1)
                    callback()
                  })
                })
              }, next)
            },

            function (next) {
              async.each(rolesToRemove, function (roleName, callback) {
                User.removeRoles(connectUser, roleName, function (err, result) {
                  if (err) { return callback(err) }
                  rolesToRemove.splice(rolesToRemove.indexOf(roleName), 1)
                  callback()
                })
              }, next)
            }

          ], function (err) {
            done(err, connectUser, info)
          })
        })
      } else if (connectUser) {
        done(err, connectUser, info)
      } else {
        done(null, null, info)
      }
    })
  }
}

LdapStrategy.verifier = verifier

/**
 * Initialize
 */

function initialize (provider, configuration) {
  var serverType = configuration.serverType || provider.serverType || 'LDAP'
  var strategy
  if (serverType === 'AD') {
    strategy = new ADStrategy(
      { server: configuration, passReqToCallback: true },
      verifier(provider, configuration)
    )
  } else {
    strategy = new LdapStrategy(
      { server: configuration, passReqToCallback: true },
      verifier(provider, configuration)
    )
  }
  return strategy
}

LdapStrategy.initialize = initialize

/**
 * Exports
 */

module.exports = LdapStrategy
