chai      = require 'chai'
sinon     = require 'sinon'
sinonChai = require 'sinon-chai'
expect    = chai.expect


chai.use sinonChai
chai.should()


passwordless = require '../../../routes/passwordless'
passwordless = passwordless.middleware

# InvalidRequestError = require '../../../errors/InvalidRequestError'

settings = require '../../../boot/settings'
TestSettings = require '../../lib/testSettings'

InvalidRequestError = require '../../../errors/InvalidRequestError'
OneTimeToken = require '../../../models/OneTimeToken'


describe 'Passwordless middleware tests', ->


  {req,res,next,err, issuer} = {}

  tsSettings = {}


  describe 'consume link token', ->

    before ->
      tsSettings = new TestSettings(settings)
      tsSettings.addSettings
        issuer: 'https://test.issuer.com'
        providers:
          passwordless: {}

    after ->
      tsSettings.restore()

    describe 'missing token is an error', ->
      before ->
        req =
          query: {}

        next = sinon.spy()

        passwordless.consumeToken req, res, next

      it 'should continue', ->
        next.should.have.been.called

      it 'should provide an invalid request error', ->
        next.should.have.been.calledWith sinon.match.instanceOf(InvalidRequestError)

    describe 'valid token after stub OneTimeToken#consume call', ->
      {err} = {}
      {token} = {}

      before (done) ->
        req =
          query:
            token: 'the-passwordless-token'

        next = sinon.spy (error) ->
          err = error
          done()

        token = {test: 'foo'}
        sinon.stub(OneTimeToken, 'consume').callsArgWith(1, null, token)

        passwordless.consumeToken req, res, next

      after ->
        OneTimeToken.consume.restore()

      it 'should continue', ->
        next.should.have.been.called

      it 'should not provide an error', ->
        expect(err).to.be.undefined

      it 'should set token on the request', ->
        req.token.should.equal token

    describe 'token not found case in OneTimeToken#consume not found case results in next with no errors and req.token = null', ->
      {err} = {}

      before (done) ->
        req =
          query:
            token: 'the-passwordless-token'

        next = sinon.spy (error) ->
          err = error
          done()

        sinon.stub(OneTimeToken, 'consume').callsArgWith(1, null, null)

        passwordless.consumeToken req, res, next

      after ->
        OneTimeToken.consume.restore()

      it 'should continue', ->
        next.should.have.been.called

      it 'should not provide an error', ->
        expect(err).to.be.undefined

      it 'should have null token on the request', ->
        expect(req.token).to.be.null

    describe 'OneTimeToken#consume returns err reports error in next(err) call', ->
      {err} = {}

      before (done) ->
        req =
          query:
            token: 'the-passwordless-token'

        next = sinon.spy (error) ->
          err = error
          done()

        sinon.stub(OneTimeToken, 'consume').callsArgWith(1, new Error("fake A redis DB unit test error"), null)

        passwordless.consumeToken req, res, next

      after ->
        OneTimeToken.consume.restore()

      it 'should continue', ->
        next.should.have.been.called

      it 'should provide an error', ->
        next.should.have.been.calledWith sinon.match.instanceOf(Error)

      it 'should have undefined token on the request', ->
        expect(req.token).to.be.undefined
