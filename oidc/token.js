/**
 * Module dependencies
 */

var settings = require('../boot/settings')
var AccessToken = require('../models/AccessToken')
var ClientToken = require('../models/ClientToken')
var IDToken = require('../models/IDToken')
var nowSeconds = require('../lib/time-utils').nowSeconds
var sessionState = require('../oidc/sessionState')

/**
 * Exchange code for token
 */

var privateKey = settings.keys.sig.prv

function token (req, res, next) {
  var params = req.body
  var client = req.client
  var ac = req.code

  function tokenResponse (err, token) {
    if (err) {
      return next(err)
    }

    var idToken
    var response = token.project('issue')

    if (req.client.access_token_type !== 'random') {
      response.access_token = token.toJWT(privateKey)
    }

    if (ac) {
      idToken = new IDToken({
        iss: settings.issuer,
        sub: ac.user_id,
        aud: ac.client_id,
        exp: nowSeconds(token.ei),
        amr: req.session.amr
      })

      if (ac.nonce) {
        idToken.payload.nonce = ac.nonce
      }
    } else {
      idToken = new IDToken({
        iss: settings.issuer,
        sub: token.uid,
        aud: token.cid,
        exp: nowSeconds(token.ei),
        amr: req.session.amr
      })
    }

    var opbs = req.session.opbs
    response.id_token = idToken.encode(privateKey)
    response.session_state = sessionState(client, client.client_uri, opbs)

    if (params.state) {
      response.state = params.state
    }

    res.set({
      'Cache-Control': 'no-store',
      'Pragma': 'no-cache'
    })

    res.json(response)
  }

  // AUTHORIZATION CODE GRANT
  if (params.grant_type === 'authorization_code') {
    AccessToken.exchange(req, tokenResponse)

  // REFRESH GRANT
  } else if (params.grant_type === 'refresh_token') {
    var refreshToken = params.refresh_token
    var clientId = req.client._id

    AccessToken.refresh(refreshToken, clientId, tokenResponse)

  // CLIENT CREDENTIALS GRANT (OAuth 2.0)
  } else if (params.grant_type === 'client_credentials') {
    ClientToken.issue({
      iss: settings.issuer,
      sub: req.client._id,
      aud: req.client._id,
      exp: (req.client.default_max_age ? nowSeconds(req.client.default_max_age) : undefined),
      scope: req.scope
    }, privateKey, function (err, token) {
      if (err) { return next(err) }

      res.set({
        'Cache-Control': 'no-store',
        'Pragma': 'no-cache'
      })

      var response = {
        access_token: token,
        token_type: 'Bearer'
      }

      if (req.client.default_max_age) {
        response.expires_in = nowSeconds(req.client.default_max_age)
      }

      res.json(response)
    })
  } else {
    // ????
  }
}

/**
 * Exports
 */

module.exports = token
