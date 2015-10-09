# Test dependencies
chai = require 'chai'
sinon = require 'sinon'
sinonChai = require 'sinon-chai'
supertest = require 'supertest'
expect = chai.expect


# Assertions
chai.use sinonChai
chai.should()


_ = require 'lodash'

# Code under test
express = require 'express'
server = require '../../../server'
Client = require('../../../models/Client')
User = require('../../../models/User')
OneTimeToken = require '../../../models/OneTimeToken'
Scope = require('../../../models/Scope')
IDToken = require '../../../models/IDToken'
AccessToken = require '../../../models/AccessToken'

http = require 'http'

TestSettings = require '../../lib/testSettings'

request = supertest(server)

describe 'Passwordless signin link activation', ->

  settings = require '../../../boot/settings'

  tsSettings = {}

  before ->
    tsSettings = new TestSettings(settings,
      _.pick(settings, ['response_types_supported', 'keys']))

    tsSettings.addSettings
      issuer: 'https://test.issuer.com'
      providers:
        passwordless:
          "tokenTTL-foo": 600

  after ->
    tsSettings.restore()

  {err, res} = {}


  describe 'success flow existing user sign-IN', ->

    session = {}

    tokenOptions =
      exp: Math.round(Date.now() / 1000) + 3600
      use: 'pwless-signin'
      sub:
        email: 'peter@mary.com'
        client_id: '4a2c1a31-150d-49e3-9946-2909220cdb16'
        redirect_uri: 'http://localhost:9000/callback_popup.html'
        response_type: 'id_token token'
        scope: 'openid profile'
        nonce: 'KG4vsD0bfAjbEdCMurmiPxzEcpFGoguYGR7b3cj3AMs'
        user: 'peters-user-uuid'

    client =
      client_name: 'unit test pwless_signin'
      _id: '4a2c1a31-150d-49e3-9946-2909220cdb16'
      redirect_uris: [
        'http://localhost:9000/callback_popup.html'
      ]
      trusted: true
      response_types: ['id_token token']
      grant_types: ['implicit']

    {scope,scopes} = {}

    before (done) ->

      # If redis is not running req.session remains undefined
      # causing an error in oidc/setSessionAmr.js which ultimately
      # result in a internal server error by oidc/error.js
      http.IncomingMessage.prototype.session = session

      sinon.stub(OneTimeToken, 'consume')
        .callsArgWith(1, null, new OneTimeToken tokenOptions)

      sinon.stub(Client, 'get').callsArgWith(2, null, client)

      user = new User _id: tokenOptions.sub.user

      sinon.stub(User, 'patch').callsArgWith(2, null, user)

      scope  = 'openid profile developer'
      scopes = [
        new Scope name: 'openid'
        new Scope name: 'profile'
        new Scope name: 'developer'
      ]
      sinon.stub(Scope, 'determine').callsArgWith(2, null, scope, scopes)

      response = AccessToken.initialize().project('issue')
      sinon.stub(AccessToken, 'issue').callsArgWith(1, null, response)
      sinon.spy(IDToken.prototype, 'initializePayload')

      sinon.spy(express.response, 'redirect')

      query =
        token: 'token-id-random-stuff'

      request
        .get('/signin/passwordless')
        .redirects(0)
        .query(query)
        .end (error, response) ->
          err = error
          res = response
          done()

    after ->
      express.response.redirect.restore();
      AccessToken.issue.restore()
      IDToken.prototype.initializePayload.restore()
      Scope.determine.restore()
      User.patch.restore()
      OneTimeToken.consume.restore()
      Client.get.restore()
      delete http.IncomingMessage.prototype.session

    it 'should consume token with the id taken of the link query', ->
      OneTimeToken.consume.should.have.been.calledWith 'token-id-random-stuff'

    it 'should respond with an http redirect', ->
      res.statusCode.should.equal 302

    it 'should redirect to the callback', ->
      express.response.redirect.should.have.been.calledWith sinon.match( client.redirect_uris[0] )

    it 'should provide a uri fragment', ->
      express.response.redirect.should.have.been.calledWith sinon.match('#')

    it 'should provide access_token', ->
      express.response.redirect.should.have.been.calledWith sinon.match('access_token=')

    it 'should provide token_type', ->
      express.response.redirect.should.have.been.calledWith sinon.match('token_type=Bearer')

    it 'should provide expires_in', ->
      express.response.redirect.should.have.been.calledWith sinon.match('expires_in=3600')

    it 'should provide id_token', ->
      express.response.redirect.should.have.been.calledWith sinon.match('id_token=')

    # TODO: should there be a state here?
    # it 'should provide state', ->
    #   express.response.redirect.should.have.been.calledWith # sinon.match req.connectParams.state

    it 'should provide session_state', ->
      express.response.redirect.should.have.been.calledWith sinon.match('session_state=')

    it 'should include `amr` claim in id_token', ->
      IDToken.prototype.initializePayload.should.have.been.calledWith(
        sinon.match amr: session.amr
      )

    it 'should include `amr` claim `email` in id_token', ->
      IDToken.prototype.initializePayload.should.have.been.calledWith(
        sinon.match amr: ['email']
      )
