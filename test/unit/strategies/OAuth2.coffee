# Test dependencies
nock      = require 'nock'
chai      = require 'chai'
sinon     = require 'sinon'
sinonChai = require 'sinon-chai'
expect    = chai.expect




# Assertions
chai.use sinonChai
chai.should()




# Code under test
Strategy = require('passport-strategy')
OAuth2Strategy = require '../../../protocols/OAuth2'



describe 'OAuth2 Strategy', ->


  {err, res, credentials} = {}

  provider =
    id:           'id'
    name:         'Name'
    protocol:     'OAuth 2.0'
    url:          'https://domain.tld'
    redirect_uri: 'https://local.tld/callback'
    scope:        ['a', 'b']
    separator: ' '
    endpoints:
      authorize:
        url:      'https://domain.tld/authorize'
        method:   'POST'
      token:
        url:      'https://domain.tld/token'
        method:   'POST'
        auth:     'client_secret_basic'
      user:
        url:      'https://domain.tld/userinfo'
        method:   'GET'
        auth:     'bearer_token'
    mapping:
      name: 'name'

  config =
    client_id:      'id',
    client_secret:  'secret'
    scope:          ['c']

  verify = (req, res, profile) ->

  strategy = new OAuth2Strategy provider, config, verify


  describe 'instance', ->

    it 'should inherit from Strategy', ->
      expect(strategy).to.be.instanceof Strategy


  describe 'constructor', ->

    it 'should set provider', ->
      strategy.provider.should.equal provider

    it 'should set endpoints', ->
      strategy.endpoints.should.equal provider.endpoints

    it 'should set client', ->
      strategy.client.should.equal config

    it 'should set name', ->
      strategy.name.should.equal provider.id

    it 'should set verify', ->
      strategy.verify.should.equal verify



  describe 'authenticate', ->

    describe 'with new authorization request', ->

      req = query: { query: {} }
      options = state: 'st4t3'

      before ->
        sinon.stub(strategy, 'authorizationRequest')
        strategy.authenticate req, options

      after ->
        strategy.authorizationRequest.restore()

      it 'should initialize the authorization flow', ->
        strategy.authorizationRequest.should.have.been.calledWith req, options


    describe 'with access denied response', ->

      req = query: { error: 'access_denied', error_description: 'nope' }
      options = state: 'st4t3'

      before ->
        strategy.fail = sinon.spy()
        strategy.authenticate req, options

      it 'should fail to authenticate', ->
        strategy.fail.should.have.been.calledWith 'Access denied', 403

    describe 'with authorization error response', ->

      req = query: { error: 'invalid', error_description: 'Invalid' }
      options = state: 'st4t3'

      before ->
        strategy.error = sinon.spy()
        strategy.authenticate req, options

      it 'should fail to authenticate', ->
        strategy.error.should.have.been.calledWith sinon.match({
          name: 'ProviderAuthError'
        })


    describe 'with authorization code grant error response', ->

      req = query: { code: 'c0d3' }
      options = state: 'st4t3'
      error = {}

      before ->
        sinon.stub(strategy, 'authorizationCodeGrant').callsArgWith(1, error)
        strategy.error = sinon.spy()
        strategy.authenticate req, options

      after ->
        strategy.authorizationCodeGrant.restore()

      it 'should fail to authenticate', ->
        strategy.error.should.have.been.calledWith error


    describe 'with userinfo error response', ->

      req = query: { code: 'c0d3' }
      options = state: 'st4t3'
      res = access_token: 't0k3n'
      error = {}

      before ->
        sinon.stub(strategy, 'authorizationCodeGrant').callsArgWith(1, null, res)
        sinon.stub(strategy, 'userInfo').callsArgWith(1, {})
        strategy.error = sinon.spy()
        strategy.authenticate req, options

      it 'should fail to authenticate', ->
        strategy.error.should.have.been.calledWith error


    describe 'with verification error', ->

    describe 'with verify providing a null user', ->

    describe 'with successful authorization', ->




  describe 'base64credentials', ->

    before ->
      credentials = strategy.base64credentials()

    it 'should include the client_id', ->

      Buffer.from(credentials, 'base64')
        .toString().should.contain config.client_id

    it 'should include the client_secret', ->
      Buffer.from(credentials, 'base64')
        .toString().should.contain config.client_secret

    it 'should include the separator', ->
      Buffer.from(credentials, 'base64')
        .toString().should.contain ':'




  describe 'authorizationRequest', ->

    describe 'with valid configuration', ->

      req = query: { query: {} }
      options = state: 'st4t3'

      beforeEach ->
        strategy.redirect = sinon.spy()
        strategy.authorizationRequest(req, options)

      it 'should redirect', ->
        url = provider.endpoints.authorize.url
        strategy.redirect.should.have.been.calledWith sinon.match(url)

      it 'should include response_type', ->
        strategy.redirect.should.have.been.calledWith sinon.match(
          'response_type=code'
        )

      it 'should include client_id', ->
        strategy.redirect.should.have.been.calledWith sinon.match(
          'client_id=' + config.client_id
        )
      it 'should include redirect_uri', ->
        strategy.redirect.should.have.been.calledWith sinon.match(
          'redirect_uri=' + encodeURIComponent(provider.redirect_uri)
        )

      it 'should include scope', ->
        strategy.redirect.should.have.been.calledWith sinon.match(
          'scope=a%20b%20c'
        )

      it 'should include state', ->
        strategy.redirect.should.have.been.calledWith sinon.match(
          'state=' + options.state
        )




