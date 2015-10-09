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

User = require '../../../models/User'


describe 'Passwordless middleware tests', ->


  {req,res,next,err, issuer} = {}

  tsSettings = {}


  describe 'render invalid email error', ->

    {view, view_info} = {}

    before ->
      tsSettings = new TestSettings(settings)
      tsSettings.addSettings
        issuer: 'https://test.issuer.com'
        providers:
          passwordless: {}

    after ->
      tsSettings.restore()

    describe 'req.connectParams.email is undefined', ->
      before (done) ->
        req =
          connectParams: {}

        res = render: sinon.spy (vw, vw_info) ->
          view = vw
          view_info = view_info
          done()

        next = sinon.spy (error) ->
          err = error
          done()

        passwordless.renderInvalidEmail req, res, next

      it 'should not continue', ->
        next.should.not.have.been.called

      it 'should render signin view with error', ->
        res.render.should.have.been.
          calledWith 'signin',
          sinon.match({
            formError: sinon.match.string
            })

    describe 'req.connectParams.email is something', ->
      before (done) ->
        req =
          connectParams:
            email: 'foo@test.org'

        res = render: sinon.spy (vw, vw_info) ->
          view = vw
          view_info = view_info
          done()

        next = sinon.spy (error) ->
          err = error
          done()

        passwordless.renderInvalidEmail req, res, next

      it 'should continue', ->
        next.should.have.been.called

      it 'should not have an error', ->
        expect(err).to.be.undefined
