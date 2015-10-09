chai      = require 'chai'
sinon     = require 'sinon'
sinonChai = require 'sinon-chai'
expect    = chai.expect

chai.use sinonChai
chai.should()

{sendVerificationEmail} = require '../../../oidc'
OneTimeToken = require '../../../models/OneTimeToken'

TestSettings = require '../../lib/testSettings'

describe 'Send Verification Email', ->

  mailer = require '../../../boot/mailer'
  tsMailer = {}

  before ->
    tsMailer = new TestSettings(mailer,
      sendMail : (tmpl, loc, opts, cb) ->
        cb()
      )

  after ->
    tsMailer.restore()


  {req,res,next} = {}

  describe 'when not requested', ->

    before ->
      req =
        provider:
          emailVerification:
            enable: false
        sendVerificationEmail: false
      res = {}
      next = sinon.spy()

      sinon.spy(OneTimeToken, 'issue')
      sinon.spy(mailer, 'sendMail')

      sendVerificationEmail req, res, next

    after ->
      OneTimeToken.issue.restore()
      mailer.sendMail.restore()

    it 'should continue', ->
      next.should.have.been.called

    it 'should not issue a OneTimeToken', ->
      OneTimeToken.issue.should.not.have.been.called

    it 'should not send an email', ->
      mailer.sendMail.should.not.have.been.called



  describe 'when requested', ->

    before ->
      req =
        connectParams:
          redirect_uri:  'https://example.com/callback'
          client_id:     'client-uuid'
          response_type: 'id_token token'
          scope:         'openid profile'
        provider:
          emailVerification:
            enable: true
        sendVerificationEmail: true
        user:
          _id: 'uuid'
          email: 'joe@example.com'
          givenName: 'joe'
          familyName: 'johnson'
      res = {}
      next = sinon.spy()

      sinon.stub(OneTimeToken, 'issue')
        .callsArgWith(1, null, new OneTimeToken {
          sub: req.user._id
          ttl: 3600 * 24 * 7
          use: 'emailVerification'
        })
      sinon.stub(mailer, 'sendMail').callsArgWith 3, null, null

      sendVerificationEmail req, res, next

    after ->
      OneTimeToken.issue.restore()
      mailer.sendMail.restore()

    it 'should issue a token to the user', ->
      OneTimeToken.issue.should.have.been.calledWith sinon.match({
        sub: req.user._id
      })

    it 'should issue an expiring token', ->
      OneTimeToken.issue.should.have.been.calledWith sinon.match({
        ttl: sinon.match.number
      })

    it 'should issue a token for email verification', ->
      OneTimeToken.issue.should.have.been.calledWith sinon.match({
        use: 'emailVerification'
      })

    it 'should send to the user', ->
      mailer.sendMail.should.have.been
        .calledWith 'verifyEmail', sinon.match.object, sinon.match({
          to: req.user.email
        })

    it 'should provide a subject', ->
      mailer.sendMail.should.have.been
        .calledWith 'verifyEmail', sinon.match.object, sinon.match({
          subject: sinon.match.string
        })

    it 'should render with the user email', ->
      mailer.sendMail.should.have.been
        .calledWith 'verifyEmail', sinon.match({
          email: req.user.email
        })

    it 'should render with the user given name', ->
      mailer.sendMail.should.have.been
        .calledWith 'verifyEmail', sinon.match({
          name: {
            first: req.user.givenName
          }
        })

    it 'should render with the user family name', ->
      mailer.sendMail.should.have.been
        .calledWith 'verifyEmail', sinon.match({
          name: {
            last: req.user.familyName
          }
        })

    it 'should render with the verification url', ->
      mailer.sendMail.should.have.been
        .calledWith 'verifyEmail', sinon.match({
          verifyURL: sinon.match.string
        })

    it 'should continue', ->
      next.should.have.been.called
      next.should.not.have.been.calledWith sinon.match.any
