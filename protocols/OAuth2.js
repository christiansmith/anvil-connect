/* global Buffer */

/**
 * Module dependencies
 */

var pkg = require('../package.json')
var agent = 'Anvil Connect/' + pkg.version
var qs = require('qs')
var URL = require('url')
var util = require('util')
var Strategy = require('passport-strategy')
var request = require('superagent')
var User = require('../models/User')
var AuthorizationError = require('../errors/ProviderAuthError')

/**
 * OAuth2Strategy
 *
 * Provider is an object defining the details of the authentication API.
 * Client is an object containing provider registration info and options.
 * Verify is the Passport callback to invoke after authenticating
 */

function OAuth2Strategy (provider, client, verify) {
  Strategy.call(this)
  this.provider = provider
  this.endpoints = provider.endpoints
  this.mapping = provider.mapping
  this.client = client
  this.name = provider.id
  this.verify = verify
}

util.inherits(OAuth2Strategy, Strategy)

/**
 * Verifier
 */

function verifier (req, auth, userInfo, done) {
  User.connect(req, auth, userInfo, done)
}

OAuth2Strategy.verifier = verifier

/**
 * Initialize
 */

function initialize (provider, configuration) {
  return new OAuth2Strategy(provider, configuration, verifier)
}

OAuth2Strategy.initialize = initialize

/**
 * Authenticate
 */

function authenticate (req, options) {
  var strategy = this
  var error = req.query && req.query.error
  var code = req.query && req.query.code

  options = options || {}

  // Handle authorization endpoint error
  if (error && error === 'access_denied') {
    return strategy.fail('Access denied', 403)
  } else if (error) {
    return strategy.error(new AuthorizationError(req.query))
  }

  // Handle token response
  if (code) {
    // exchange the code for an access token
    strategy.authorizationCodeGrant(code, function (err, response) {
      if (err) { return strategy.error(err) }

      // request user info
      strategy.userInfo(response.access_token, function (err, profile) {
        if (err) { return strategy.error(err) }

        // invoke the callback
        strategy.verify(req, response, profile, function (err, user, info) {
          if (err) { return strategy.error(err) }
          if (!user) { return strategy.fail(info) }
          strategy.success(user, info)
        })
      })
    })

  // Initiate the OAuth 2.0 Authorization Code Flow
  } else {
    strategy.authorizationRequest(req, options)
  }
}

OAuth2Strategy.prototype.authenticate = authenticate

/**
 * Base64 Credentials
 *
 * Base64 encodes the user:password value for an HTTP Basic Authorization
 * header from a provider configuration object. The provider object should
 * specify a clientId and client_secret.
 */

function base64credentials () {
  var id = this.client.client_id
  var secret = this.client.client_secret
  var credentials = id + ':' + secret

  return Buffer.from(credentials).toString('base64')
}

OAuth2Strategy.prototype.base64credentials = base64credentials

/**
 * Authorization Request
 */

function authorizationRequest (req, options) {
  var provider = this.provider
  var endpoints = this.endpoints
  var config = this.client
  var url = URL.parse(endpoints.authorize.url)
  var responseType = 'code'
  var clientId = config.client_id
  var redirectUri = provider.redirect_uri
  var state = options.state

  // required authorization parameters
  url.query = {
    response_type: responseType,
    client_id: clientId,
    redirect_uri: redirectUri
  }

  // merge default and configured scopes
  if (provider.scope || config.scope) {
    var s1 = provider.scope || []
    var s2 = config.scope || []
    var sp = provider.separator || ' '

    url.query.scope = s1.concat(s2).join(sp)
  }

  if (state) {
    url.query.state = state
  }

  // Redirect to the provider. This method is
  // added at runtime by passport and not explicitly
  // defined here.
  this.redirect(URL.format(url))
}

OAuth2Strategy.prototype.authorizationRequest = authorizationRequest

/**
 * Authorization Code Grant Request
 */

function authorizationCodeGrant (code, done) {
  var endpoint = this.endpoints.token
  var provider = this.provider
  var client = this.client
  var url = endpoint.url
  var method = endpoint.method && endpoint.method.toLowerCase()
  var auth = endpoint.auth
  var parser = endpoint.parser
  var accept = endpoint.accept || 'application/json'
  var params = {}

  // required token parameters
  params.grant_type = 'authorization_code'
  params.code = code
  params.redirect_uri = provider.redirect_uri

  // start building the request
  var req = request[method || 'post'](url)

  // Authenticate the client with HTTP Basic
  if (auth === 'client_secret_basic') {
    req.set('Authorization', 'Basic ' + this.base64credentials())
  }

  // Authenticate the client with POST params
  if (auth === 'client_secret_post') {
    params.client_id = client.client_id
    params.client_secret = client.client_secret
  }

  // Add request body params and set other headers
  req.send(qs.stringify(params))
  req.set('accept', accept)
  req.set('user-agent', agent)

  // Execute the request
  return req.end(function (err, res) {
    if (err) { return done(err) }
    var response = (parser === 'x-www-form-urlencoded')
      ? qs.parse(res.text)
      : res.body

    if (res.statusCode !== 200) {
      return done(response)
    }

    done(null, response)
  })
}

OAuth2Strategy.prototype.authorizationCodeGrant = authorizationCodeGrant

/**
 * User Info
 */

function userInfo (token, done) {
  var strategy = this
  var endpoint = this.endpoints.user
  var mapping = this.mapping
  var url = endpoint.url
  var method = endpoint.method && endpoint.method.toLowerCase()
  var auth = endpoint.auth
  var params = endpoint.params
  var accept = endpoint.accept || 'application/json'

  // start building the request
  var req = request[method || 'get'](url)

  // Authenticate with custom header
  if (auth && auth.header) {
    req.set(auth.header, (auth.scheme === 'Basic')
      ? strategy.base64credentials()
      : [auth.scheme, token].join(' ')
    )
  }

  // Authenticate with a querystring parameter
  if (auth && auth.query) {
    req.query(auth.query + '=' + token)
  }

  // Additional parameters
  if (params) {
    req.query(params)
  }

  // Set other headers
  req.set('accept', accept)
  req.set('user-agent', agent)

  // Execute the request
  return req.end(function (err, res) {
    // Handle unsuccessful response
    if (err || res.statusCode !== 200) {
      return done(
        (res && new Error(res.body && res.body.error)) || err
      )
    }

    // add the strategy name to response
    res.body.provider = strategy.name

    // TODO:
    // - should we fail if we can't derive a provider user id?

    // Normalize id field
    res.body.id = (res.body.id)
      ? res.body.id.toString()
      : res.body[mapping.id] && res.body[mapping.id].toString()

    // Provide the user
    done(null, res.body)
  })
}

OAuth2Strategy.prototype.userInfo = userInfo

/**
 * Exports
 */

module.exports = OAuth2Strategy
