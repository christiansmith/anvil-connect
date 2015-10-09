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

OneTimeToken = require '../../../models/OneTimeToken'


describe 'Passwordless middleware tests', ->


  {req,res,next,err, issuer} = {}

  tsSettings = {}


  describe 'verify sign-up token', ->

    {view, view_info} = {}

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

        res = render: sinon.spy (vw, vw_info) ->
          view = vw
          view_info = view_info
          done()

        next = sinon.spy (error) ->
          err = error
          done()

        passwordless.verifySignupToken req, res, next

      it 'should not continue', ->
        next.should.not.have.been.called

      it 'should render view with error', ->
        res.render.should.have.been.
          calledWith 'passwordless/pwlessSigninLinkError',
          sinon.match({
            error: sinon.match.string
            })

    describe 'req.token is undefined', ->
      before (done) ->
        req = {}

        res = render: sinon.spy (vw, vw_info) ->
          view = vw
          view_info = view_info
          done()

        next = sinon.spy (error) ->
          err = error
          done()

        passwordless.verifySignupToken req, res, next

      it 'should not continue', ->
        next.should.not.have.been.called

      it 'should render view with error', ->
        res.render.should.have.been.
          calledWith 'passwordless/pwlessSigninLinkError',
          sinon.match({
            error: sinon.match.string
            })

    describe 'req.token.use is not pwless-signup', ->
      before (done) ->
        req =
          token:
            use: 'foo'

        res = render: sinon.spy (vw, vw_info) ->
          view = vw
          view_info = view_info
          done()

        next = sinon.spy (error) ->
          err = error
          done()

        passwordless.verifySignupToken req, res, next

      it 'should not continue', ->
        next.should.not.have.been.called

      it 'should render view with error', ->
        res.render.should.have.been.
          calledWith 'passwordless/pwlessSigninLinkError',
          sinon.match({
            error: sinon.match.string
            })


    describe 'error on DB call to issue new Token', ->
      before (done) ->
        req =
          token:
            use: 'pwless-signup'

        sinon.stub(OneTimeToken, 'issue').callsArgWith(1, new Error('database problem'))

        res = render: sinon.spy (vw, vw_info) ->
          view = vw
          view_info = view_info
          done()

        next = sinon.spy (error) ->
          err = error
          done()

        passwordless.verifySignupToken req, res, next

      after ->
        OneTimeToken.issue.restore()

      it 'should continue', ->
        next.should.have.been.called

      # Perhaps it would be better to render a more helpful message, but this is consistent with verifyEmail
      it 'should provide an error', ->
        next.should.have.been.calledWith sinon.match.instanceOf(Error)

    describe 'successful with a new signup token ', ->
      before (done) ->
        req =
          user_id: 'test-user-id'
          token:
            use: 'pwless-signup'
            sub:
              email: 'test@test.org'

        sinon.stub(OneTimeToken, 'issue').callsArgWith(1, null, new OneTimeToken {} )

        res = render: sinon.spy (vw, vw_info) ->
          view = vw
          view_info = view_info
          done()

        next = sinon.spy (error) ->
          err = error
          done()

        passwordless.verifySignupToken req, res, next

      after ->
        OneTimeToken.issue.restore()

      it 'should NOT continue', ->
        next.should.not.have.been.called

      it 'should render view with email and token', ->
        res.render.should.have.been.
          calledWith 'passwordless/pwlessSignup',
          sinon.match({
            email: sinon.match.string,
            token: sinon.match.string
            })
