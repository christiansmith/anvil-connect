/**
 * Module dependencies
 */

var oidc = require('../oidc')
var settings = require('../boot/settings')
var Client = require('../models/Client')
var ClientToken = require('../models/ClientToken')
var ValidationError = require('../errors/ValidationError')
var NotFoundError = require('../errors/NotFoundError')

/**
 * Dynamic Client Registration Endpoints
 */

module.exports = function (server) {
  /**
   * Client Registration Endpoint
   */

  server.post('/register',
    oidc.parseAuthorizationHeader,
    oidc.getBearerToken,

    // We'll check downstream for the
    // presence and scope of the token.
    oidc.verifyAccessToken({
      iss: settings.issuer,
      key: settings.keys.sig.pub,
      required: false
    }),

    // relies on verifyAccessToken upstream.
    oidc.verifyClientRegistration,

    function (req, res, next) {
      // client should reference user if possible
      if (req.claims && req.claims.sub) {
        req.body.userId = req.claims.sub
      }

      req.body.trusted = req.body.trusted === 'true'

      Client.insert(req.body, function (err, client) {
        if (err) {
          // QUICK AND DIRTY WRAPPER AROUND MODINHA ERROR
          // CONTEMPLATING A BETTER WAY TO DO THIS.
          return next(
            (err.name === 'ValidationError')
              ? new ValidationError(err)
              : err
          )
        }

        ClientToken.issue({
          iss: settings.issuer,
          sub: client._id,
          aud: client._id

        }, settings.keys.sig.prv, function (err, token) {
          if (err) { return next(err) }

          res.set({
            'Cache-Control': 'no-store',
            'Pragma': 'no-cache'
          })

          res.status(201).json(client.configuration(settings, token))
        })
      })
    })

  /**
   * Client Configuration Endpoint
   */

  server.get('/register/:clientId',
    oidc.verifyClientToken,
    oidc.verifyClientIdentifiers,
    function (req, res, next) {
      Client.get(req.token.payload.sub, function (err, client) {
        if (err) { return next(err) }
        if (!client) { return next(new NotFoundError()) }
        res.json(client.configuration(settings))
      })
    })

  server.patch('/register/:clientId',
    oidc.verifyClientToken, // should do this or...
    // oidc.verifyClientRegistration
    // with dynamic client registration it should probably stay as is?
    // except what if they pass "trusted"? do we need to add checks for that
    // to `verifyClientToken`?
    // with token/scoped registration we should be using `verifyClientRegistration`?
    oidc.verifyClientIdentifiers,
    function (req, res, next) {
      if (req.is('json')) {
        if (req.body.trusted === 'true') {
          req.body.trusted = true
        } else if (req.body.trusted === 'false') {
          req.body.trusted = false
        } else {
          delete req.body.trusted
        }

        Client.patch(req.token.payload.sub, req.body, function (err, client) {
          if (err) { return next(err) }
          if (!client) { return next(new NotFoundError()) }
          res.json(client.configuration(settings))
        })

      // Wrong Content-type
      } else {
        var err = new Error()
        err.error = 'invalid_request'
        err.error_description = 'Content-type must be application/json'
        err.statusCode = 400
        next(err)
      }
    })
}
