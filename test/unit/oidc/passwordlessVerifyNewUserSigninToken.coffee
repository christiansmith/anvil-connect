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
OneTimeToken = require '../../../models/OneTimeToken'


describe 'Passwordless middleware tests', ->


  {req,res,next,err, issuer} = {}

  tsSettings = {}


  describe 'verify new user create account and sign-in token', ->

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

        passwordless.verifyNewUserSigninToken req, res, next

      it 'should not continue', ->
        next.should.not.have.been.called

      it 'should render view with error', ->
        res.render.should.have.been.
          calledWith 'passwordless/pwlessSignup',
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

        passwordless.verifyNewUserSigninToken req, res, next

      it 'should not continue', ->
        next.should.not.have.been.called

      it 'should render view with error', ->
        res.render.should.have.been.
          calledWith 'passwordless/pwlessSignup',
          sinon.match({
            error: sinon.match.string
            })

    describe 'req.token.use is not pwless-new-user', ->
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

        passwordless.verifyNewUserSigninToken req, res, next

      it 'should not continue', ->
        next.should.not.have.been.called

      it 'should render view with error', ->
        res.render.should.have.been.
          calledWith 'passwordless/pwlessSignup',
          sinon.match({
            error: sinon.match.string
            })


    describe 'User insert fails with error', ->
      before (done) ->
        req =
          session: {}
          token:
            _id: 'token-id'
            use: 'pwless-new-user'
            sub:
              email: 'test@test.org'
        req.connectParams = {}

        res = render: sinon.spy (vw, vw_info) ->
          view = vw
          view_info = view_info
          done()

        next = sinon.spy (error) ->
          err = error
          done()

        sinon.stub(User, 'insert').callsArgWith(2, "Field foo must have format YYY/MM/DD")

        passwordless.verifyNewUserSigninToken req, res, next

      after ->
        User.insert.restore()

      it 'should not continue', ->
        next.should.not.have.been.called

      it 'should render view with error', ->
        res.render.should.have.been.
          calledWith 'passwordless/pwlessSignup',
          sinon.match({
            error: sinon.match.string
            token: sinon.match.string
            email: sinon.match.string
            })



    describe 'User insertion works', ->
      user = new User _id: 'uuid-test'
      before (done) ->
        req =
          provider:
            amr: 'test-amr'
          user_id: 'test-user-id'
          token:
            use: 'pwless-new-user'
          session: {}

        sinon.stub(User, 'insert').callsArgWith(2, null, user);

        sinon.stub(OneTimeToken, 'revoke').callsArgWith(1, null);

        res = render: sinon.spy (vw, vw_info) ->
          view = vw
          view_info = view_info
          done()

        next = sinon.spy (error) ->
          err = error
          done()

        passwordless.verifyNewUserSigninToken req, res, next

      after ->
        OneTimeToken.revoke.restore()
        User.insert.restore()

      it 'should continue', ->
        next.should.have.been.called

      it 'should not have an error', ->
        expect(err).to.be.undefined

      it 'req.user should be the user returned from User.insert call', ->
        req.user.should.equal(user)

      it 'req.session should have the user_id', ->
        req.session.user.should.equal('uuid-test')

      it 'req.session.amr should match the test seup', ->
        req.session.amr.should.have.members(['test-amr'])

      it 'req.session.opbs exists (it should contain a random value)', ->
        req.session.opbs.should.exist
