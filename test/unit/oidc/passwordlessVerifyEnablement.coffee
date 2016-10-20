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

  describe 'passwordless enablement', ->

    describe 'verify when enabled', ->

      before ->
        tsSettings = new TestSettings(settings)
        tsSettings.addSettings
          issuer: 'https://test.issuer.com'
          providers:
            passwordless: {}
        next = sinon.spy()
        passwordless.verifyEnabled req, res, next

      after ->
        tsSettings.restore()

      it 'should continue', ->
        next.should.have.been.called

      it 'should not provide an error', ->
        next.should.not.have.been.calledWith sinon.match.defined


    describe 'verify when not enabled', ->

      before ->
        tsSettings = new TestSettings(settings)
        tsSettings.addSettings
          issuer: 'https://test.issuer.com'
          providers: {}

        next = sinon.spy()
        passwordless.verifyEnabled req, res, next

      after ->
        tsSettings.restore()

      it 'should continue', ->
        next.should.have.been.called

      it 'should provide an error', ->
        next.should.have.been.calledWith sinon.match.instanceOf(Error)

    # boot/settings will always establish a settings.providers object.
