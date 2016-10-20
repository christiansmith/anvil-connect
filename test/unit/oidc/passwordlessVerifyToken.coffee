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


  describe 'verify sign-in token', ->

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

        passwordless.verifyToken req, res, next

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

        passwordless.verifyToken req, res, next

      it 'should not continue', ->
        next.should.not.have.been.called

      it 'should render view with error', ->
        res.render.should.have.been.
          calledWith 'passwordless/pwlessSigninLinkError',
          sinon.match({
            error: sinon.match.string
            })

    describe 'req.token.use is not pwless-signin', ->
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

        passwordless.verifyToken req, res, next

      it 'should not continue', ->
        next.should.not.have.been.called

      it 'should render view with error', ->
        res.render.should.have.been.
          calledWith 'passwordless/pwlessSigninLinkError',
          sinon.match({
            error: sinon.match.string
            })


    describe 'req.user_id is undefined', ->
      before (done) ->
        req =
          token:
            use: 'pwless-signin'

        res = render: sinon.spy (vw, vw_info) ->
          view = vw
          view_info = view_info
          done()

        next = sinon.spy (error) ->
          err = error
          done()

        passwordless.verifyToken req, res, next

      it 'should not continue', ->
        next.should.not.have.been.called

      it 'should render view with error', ->
        res.render.should.have.been.
          calledWith 'passwordless/pwlessSigninLinkError',
          sinon.match({
            error: sinon.match.string
            })

    describe 'req.user_id is only whitespaces', ->
      before (done) ->
        req =
          user_id: '  '
          token:
            use: 'pwless-signin'

        res = render: sinon.spy (vw, vw_info) ->
          view = vw
          view_info = view_info
          done()

        next = sinon.spy (error) ->
          err = error
          done()

        passwordless.verifyToken req, res, next

      it 'should not continue', ->
        next.should.not.have.been.called

      it 'should render view with error', ->
        res.render.should.have.been.
          calledWith 'passwordless/pwlessSigninLinkError',
          sinon.match({
            error: sinon.match.string
            })

    describe 'error on DB call', ->
      before (done) ->
        req =
          user_id: 'test-user-id'
          token:
            use: 'pwless-signin'

        sinon.stub(User, 'patch').callsArgWith(2, new Error('database problem'))

        res = render: sinon.spy (vw, vw_info) ->
          view = vw
          view_info = view_info
          done()

        next = sinon.spy (error) ->
          err = error
          done()

        passwordless.verifyToken req, res, next

      after ->
        User.patch.restore()

      it 'should continue', ->
        next.should.have.been.called

      # Perhaps it would be better to render a more helpful message, but this is consistent with verifyEmail
      it 'should provide an error', ->
        next.should.have.been.calledWith sinon.match.instanceOf(Error)

    describe 'with an unknown user ', ->
      before (done) ->
        req =
          user_id: 'test-user-id'
          token:
            use: 'pwless-signin'

        sinon.stub(User, 'patch').callsArgWith(2, null, null)

        res = render: sinon.spy (vw, vw_info) ->
          view = vw
          view_info = view_info
          done()

        next = sinon.spy (error) ->
          err = error
          done()

        passwordless.verifyToken req, res, next

      after ->
        User.patch.restore()

      it 'should NOT continue', ->
        next.should.not.have.been.called

      it 'should render view with error', ->
        res.render.should.have.been.
          calledWith 'passwordless/pwlessSigninLinkError',
          sinon.match({
            error: sinon.match.string
            })

    describe 'for known user', ->
      user = new User _id: 'uuid-test'
      before (done) ->
        req =
          provider:
            amr: 'test-amr'
          user_id: 'test-user-id'
          token:
            use: 'pwless-signin'
          session: {}

        sinon.stub(User, 'patch').callsArgWith(2, null, user)

        res = render: sinon.spy (vw, vw_info) ->
          view = vw
          view_info = view_info
          done()

        next = sinon.spy (error) ->
          err = error
          done()

        passwordless.verifyToken req, res, next

      after ->
        User.patch.restore()

      it 'should continue', ->
        next.should.have.been.called

      it 'should not have an error', ->
        expect(err).to.be.undefined

      it 'req.user should be the user returned from DB call', ->
        req.user.should.equal(user)

      it 'req.session should have the user_id', ->
        req.session.user.should.equal('uuid-test')

      it 'req.session.amr should match the test seup', ->
        req.session.amr.should.have.members(['test-amr'])

      it 'req.session.opbs exists (it should contain a random value)', ->
        req.session.opbs.should.exist
