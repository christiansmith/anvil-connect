/**
 * Module dependencies
 */

var crypto = require('crypto')
var async = require('async')
var qs = require('qs')
var settings = require('../boot/settings')
var IDToken = require('../models/IDToken')
var AccessToken = require('../models/AccessToken')
var AuthorizationCode = require('../models/AuthorizationCode')
var nowSeconds = require('../lib/time-utils').nowSeconds
var sessionState = require('../oidc/sessionState')

/**
 * Authorize
 *
 * By the time we get here, we can assume the params
 * are valid, the client is authenticated, and the user
 * is authenticated.
 *
 * This function should issue an authorization code or
 * a set of security tokens, depending on the params.
 */

function authorize (req, res, next) {
  var params = req.connectParams
  var responseTypes = params.response_type.trim().split(' ')
  var responseMode = params.response_mode && params.response_mode.trim()
  var responseModeSeparator = responseMode ||
    (params.response_type === 'code' ||
      params.response_type === 'none') ? '?' : '#'

  // ACCESS GRANTED
  if (params.authorize === 'true') {
    // compose the response
    async.waterfall([

      function includeAccessToken (callback) {
        if (responseTypes.indexOf('token') !== -1) {
          AccessToken.issue(req, function (err, response) {
            if (err) { return callback(err) }
            callback(null, response)
          })

        // initialize an empty response
        } else {
          callback(null, {})
        }
      },

      function includeAuthorizationCode (response, callback) {
        if (responseTypes.indexOf('code') !== -1) {
          AuthorizationCode.insert({
            client_id: req.client._id,
            redirect_uri: params.redirect_uri,
            nonce: params.nonce,
            max_age: parseInt(params.max_age, 10) || req.client.default_max_age,
            user_id: req.user._id,
            scope: req.scope

          }, function (err, ac) {
            if (err) { return callback(err) }
            response.code = ac.code
            callback(null, response)
          })

        // pass through to next
        } else {
          callback(null, response)
        }
      },

      function includeIDToken (response, callback) {
        if (responseTypes.indexOf('id_token') !== -1) {
          var shasum, hash, atHash

          if (response.access_token) {
            shasum = crypto.createHash('sha256')
            shasum.update(response.access_token)
            hash = shasum.digest('hex')
            atHash = hash.slice(0, hash.length / 2)
          }

          var idToken = new IDToken({
            iss: settings.issuer,
            sub: req.user._id,
            aud: req.client._id,
            exp: nowSeconds(response.expires_in),
            nonce: params.nonce,
            at_hash: atHash,
            amr: req.session.amr
          })

          response.id_token = idToken.encode(settings.keys.sig.prv)
        }

        callback(null, response)
      }

    ], function (err, response) {
      if (err) { return next(err) }

      if (params.state) {
        response.state = params.state
      }

      // Set the OP browser state.
      var opbs = req.session.opbs

      // if responseTypes includes id_token or token
      // calculate session_state and add to response
      if (responseTypes.indexOf('id_token') !== -1 ||
        responseTypes.indexOf('token') !== -1) {
        var session = sessionState(req.client, req.client.client_uri, opbs)
        response.session_state = session
      }
      if (responseMode === 'form_post') {
        res.set({
          'Cache-Control': 'no-cache, no-store',
          'Pragma': 'no-cache'
        })
        res.render('form_post', {
          redirect_uri: params.redirect_uri,
          state: params.state,
          access_token: response.access_token,
          id_token: response.id_token,
          code: response.code
        })
      } else {
        res.redirect(
          params.redirect_uri + responseModeSeparator + qs.stringify(response)
        )
      }
    })

  // ACCESS DENIED
  } else {
    res.redirect(params.redirect_uri + '?error=access_denied')
  }
}

/**
 * Export
 */

module.exports = authorize
