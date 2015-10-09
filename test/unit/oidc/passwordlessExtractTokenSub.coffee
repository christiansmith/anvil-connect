chai      = require 'chai'
sinon     = require 'sinon'
sinonChai = require 'sinon-chai'
expect    = chai.expect


chai.use sinonChai
chai.should()


passwordless = require '../../../routes/passwordless'
passwordless = passwordless.middleware

settings = require '../../../boot/settings'
TestSettings = require '../../lib/testSettings'

describe 'Passwordless middleware tests', ->


  {req,res,next,err, issuer} = {}

  tsSettings = {}

  describe 'extract sub info from token', ->

    before ->
      tsSettings = new TestSettings(settings)
      tsSettings.addSettings
        issuer: 'https://test.issuer.com'
        providers:
          passwordless: {}

    after ->
      tsSettings.restore()

    describe 'req.token is null', ->
      before (done) ->
        req =
          token: null

        next = sinon.spy (error) ->
          err = error
          done()

        passwordless.extractTokenSub req, res, next

      it 'should continue', ->
        next.should.have.been.called

      it 'should not provide an error', ->
        expect(err).to.be.undefined

      it 'req.token should remain null', ->
        expect(req.token).to.be.null

    describe 'req.token is undefined (this is unexpected)', ->
      before (done) ->
        req =
          token: undefined

        next = sinon.spy (error) ->
          err = error
          done()

        passwordless.extractTokenSub req, res, next

      it 'should continue', ->
        next.should.have.been.called

      it 'should not provide an error', ->
        expect(err).to.be.undefined

      it 'req.token should remain undefined', ->
        expect(req.token).to.be.undefined

    describe 'req.token has no sub ', ->
      token = {id: 'foo'}
      before (done) ->
        req =
          token: token

        next = sinon.spy (error) ->
          err = error
          done()

        passwordless.extractTokenSub req, res, next

      it 'should continue', ->
        next.should.have.been.called

      it 'should not provide an error', ->
        expect(err).to.be.undefined

      it 'req.token should remain unchanged', ->
        req.token.should.equal(token)

    describe 'req.token with sub ', ->
      token = {sub: '3.14'}
      before (done) ->
        req =
          token: token

        next = sinon.spy (error) ->
          err = error
          done()

        passwordless.extractTokenSub req, res, next

      it 'should continue', ->
        next.should.have.been.called

      it 'should not provide an error', ->
        expect(err).to.be.undefined

      it 'req.connectParams should not be undefined', ->
        req.connectParams.should.not.be.undefined

    describe 'req.token has expected connectParams and more in sub ', ->
      sub =
        email: 'test@test.org'
        redirect_uri: 'https://test.org/callback'
        client_id: 'test-client-id'
        response_type: 'test-response-type'
        scope: 'test-scope'
        nonce: 'test-nonce'
        unexpected: 'test-unexpected'

      token = {sub: sub}

      before (done) ->
        req =
          token: token

        next = sinon.spy (error) ->
          err = error
          done()

        passwordless.extractTokenSub req, res, next

      it 'should continue', ->
        next.should.have.been.called

      it 'should not provide an error', ->
        expect(err).to.be.undefined

      it 'req.connectParams to have property email', ->
        expect(req.connectParams).property('email', 'test@test.org')

      it 'req.connectParams to have property redirect_uri', ->
        expect(req.connectParams).property('redirect_uri', 'https://test.org/callback')

      it 'req.connectParams to have property client_id', ->
        expect(req.connectParams).property('client_id', 'test-client-id')

      it 'req.connectParams to have property response_type', ->
        expect(req.connectParams).property('response_type', 'test-response-type')

      it 'req.connectParams to have property scope', ->
        expect(req.connectParams).property('scope', 'test-scope')

      it 'req.connectParams to have property nonce', ->
        expect(req.connectParams).property('nonce', 'test-nonce')

      it 'req.connectParams to not have property unexpected', ->
        expect(req.connectParams.unexpected).to.be.undefined

    describe 'req.token has sub with only some of the expected connectParams', ->
      sub =
        email: 'test@test.org'
        redirect_uri: 'https://test.org/callback'
        client_id: 'test-client-id'
        response_type: 'test-response-type'

      token = {sub: sub}

      before (done) ->
        req =
          token: token

        next = sinon.spy (error) ->
          err = error
          done()

        passwordless.extractTokenSub req, res, next

      it 'should continue', ->
        next.should.have.been.called

      it 'should not provide an error', ->
        expect(err).to.be.undefined

      it 'req.connectParams to have property email', ->
        expect(req.connectParams).property('email', 'test@test.org')

      it 'req.connectParams to have property redirect_uri', ->
        expect(req.connectParams).property('redirect_uri', 'https://test.org/callback')

      it 'req.connectParams to have property response_type', ->
        expect(req.connectParams).property('response_type', 'test-response-type')

      it 'req.connectParams to NOT have property scope', ->
        expect(req.connectParams.scope).to.be.undefined

      it 'req.connectParams to NOT have property nonce', ->
        expect(req.connectParams.nonce).to.be.undefined

    describe 'req.token has sub user', ->
      sub =
        user: 'test-user-id'

      token = {sub: sub}

      before (done) ->
        req =
          token: token

        next = sinon.spy (error) ->
          err = error
          done()

        passwordless.extractTokenSub req, res, next

      it 'should continue', ->
        next.should.have.been.called

      it 'should not provide an error', ->
        expect(err).to.be.undefined

      it 'req to have property user_id', ->
        expect(req).property('user_id', 'test-user-id')
