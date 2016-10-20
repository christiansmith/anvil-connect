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
server = require '../../../server'
Client = require('../../../models/Client')
User = require('../../../models/User')
OneTimeToken = require '../../../models/OneTimeToken'

TestSettings = require '../../lib/testSettings'

request = supertest(server)

describe 'Passwordless signin post', ->

  settings = require '../../../boot/settings'
  mailer = require '../../../boot/mailer'

  tsSettings = {}
  tsMailer = {}

  before ->
    tsSettings = new TestSettings(settings,
      _.pick(settings, ['response_types_supported']))

    tsSettings.addSettings
      issuer: 'https://test.issuer.com'
      providers:
        passwordless:
          "tokenTTL-foo": 600

    tsMailer = new TestSettings(mailer,
      from: "from@example.com"
      render: {}
      sendMail: (tmpl, loc, opts, cb) ->
        cb()
      transport: {}
      )

  after ->
    tsMailer.restore()
    tsSettings.restore()

  {fields, err, res} = {}


  describe 'POST signin body passwordless', ->

    describe 'success flow new user', ->

      before (done) ->

        sinon.stub(Client, 'get').callsArgWith(2, null,
          {
            client_name: 'unit test pwless_signin'
            redirect_uris: [
              'http://localhost:9000/callback_popup.html'
            ]
            trusted: true
            response_types: ['id_token token']
            grant_types: ['implicit']
          })

        sinon.stub(User, 'getByEmail').callsArgWith(1, null, null)

        sinon.stub(OneTimeToken, 'issue')
          .callsArgWith(1, null, new OneTimeToken {})
        # the exp, sub and use will be checked when verifying the link.
        # However this is not needed in this test, only the generated token id.

        sinon.stub(mailer, 'sendMail').callsArgWith 3, null, null

        fields =
          client_id: '4a2c1a31-150d-49e3-9946-2909220cdb16'
          redirect_uri: 'http://localhost:9000/callback_popup.html'
          response_type: 'id_token token'
          scope: 'openid profile'
          nonce: 'KG4vsD0bfAjbEdCMurmiPxzEcpFGoguYGR7b3cj3AMs'
          email: 'user@test.com'
          provider: 'passwordless'

        request
          .post('/signin')
          .set('referer', settings.issuer + '/signin')
          .send(fields)
          .end (error, response) ->
            err = error
            res = response
            done()

      after ->
        mailer.sendMail.restore()
        OneTimeToken.issue.restore()
        User.getByEmail.restore()
        Client.get.restore()

      it 'should issue an expiring token', ->
        OneTimeToken.issue.should.have.been.calledWith sinon.match({
          ttl: sinon.match.number
        })

      it 'should issue a token for passwordless sign-UP', ->
        OneTimeToken.issue.should.have.been.calledWith sinon.match({
          use: 'pwless-signup'
        })

      it 'should send email to the user', ->
        mailer.sendMail.should.have.been
          .calledWith 'passwordlessSignup', sinon.match.object, sinon.match({
            to: fields.email
          })

      it 'should provide a subject', ->
        mailer.sendMail.should.have.been
          .calledWith 'passwordlessSignup', sinon.match.object, sinon.match({
            subject: sinon.match.string
          })

      it 'should render with the user email', ->
        mailer.sendMail.should.have.been
          .calledWith 'passwordlessSignup', sinon.match({
            email: fields.email
          })

      it 'should render with the verification url', ->
        mailer.sendMail.should.have.been
          .calledWith 'passwordlessSignup', sinon.match({
            verifyURL: sinon.match.string
          })

      it 'should respond 200', ->
        res.statusCode.should.equal 200

      it 'should respond with an html page', ->
        res.headers['content-type'].should.contain 'text/html'

      it 'should respond with html page containing the sender', ->
        res.text.should.contain 'from@example.com'

      it 'should respond with html page containing a resend link', ->
        res.text.should.match (new RegExp("href=\"https://test.issuer.com/resend/passwordless\\?email=user%40test\\.com&amp;", "g"))

      it 'resend link should contain redirect_uri', ->
        res.text.should.match (new RegExp("href=\"https://test.issuer.com/resend/passwordless\\?.*redirect_uri=", "g"))

      it 'resend link should contain client_id', ->
        res.text.should.match (new RegExp("href=\"https://test.issuer.com/resend/passwordless\\?.*client_id=", "g"))

      it 'resend link should contain response_type', ->
        res.text.should.match (new RegExp("href=\"https://test.issuer.com/resend/passwordless\\?.*response_type=", "g"))

      it 'resend link should contain scope', ->
        res.text.should.match (new RegExp("href=\"https://test.issuer.com/resend/passwordless\\?.*scope=", "g"))

      it 'resend link should contain nonce', ->
        res.text.should.match (new RegExp("href=\"https://test.issuer.com/resend/passwordless\\?.*nonce=", "g"))

    describe 'success flow existing user', ->

      before (done) ->

        sinon.stub(Client, 'get').callsArgWith(2, null,
          {
            client_name: 'unit test pwless_signin'
            redirect_uris: [
              'http://localhost:9000/callback_popup.html'
            ]
            trusted: true
            response_types: ['id_token token']
            grant_types: ['implicit']
          })

        sinon.stub(User, 'getByEmail').callsArgWith(1, null,
          new User
            email: 'doe@test.com'
            _id: 'uuid-of-doe'
            givenName: 'john'
            familyName: 'doe-family'
            )

        sinon.stub(OneTimeToken, 'issue')
          .callsArgWith(1, null, new OneTimeToken {})
        # the exp, sub and use will be checked when verifying the link.
        # However this is not needed in this test, only the generated token id.

        sinon.stub(mailer, 'sendMail').callsArgWith 3, null, null

        fields =
          client_id: '4a2c1a31-150d-49e3-9946-2909220cdb16'
          redirect_uri: 'http://localhost:9000/callback_popup.html'
          response_type: 'id_token token'
          scope: 'openid profile'
          nonce: 'KG4vsD0bfAjbEdCMurmiPxzEcpFGoguYGR7b3cj3AMs'
          email: 'doe@test.com'
          provider: 'passwordless'

        request
          .post('/signin')
          .set('referer', settings.issuer + '/signin')
          .send(fields)
          .end (error, response) ->
            err = error
            res = response
            done()

      after ->
        mailer.sendMail.restore()
        OneTimeToken.issue.restore()
        User.getByEmail.restore()
        Client.get.restore()

      it 'should issue an expiring token', ->
        OneTimeToken.issue.should.have.been.calledWith sinon.match({
          ttl: sinon.match.number
        })

      it 'should issue a token for passwordless sign-IN', ->
        OneTimeToken.issue.should.have.been.calledWith sinon.match({
          use: 'pwless-signin'
        })

      it 'should send email to the user', ->
        mailer.sendMail.should.have.been
          .calledWith 'passwordlessSignin', sinon.match.object, sinon.match({
            to: fields.email
          })

      it 'should provide a subject', ->
        mailer.sendMail.should.have.been
          .calledWith 'passwordlessSignin', sinon.match.object, sinon.match({
            subject: sinon.match.string
          })

      it 'should render with the user email', ->
        mailer.sendMail.should.have.been
          .calledWith 'passwordlessSignin', sinon.match({
            email: fields.email
          })

      it 'should render with the verification url', ->
        mailer.sendMail.should.have.been
          .calledWith 'passwordlessSignin', sinon.match({
            verifyURL: sinon.match.string
          })

      it 'should respond 200', ->
        res.statusCode.should.equal 200

      it 'should respond with an html page', ->
        res.headers['content-type'].should.contain 'text/html'

      it 'should respond with html page containing the sender', ->
        res.text.should.contain 'from@example.com'

      it 'should respond with html page containing a resend link', ->
        res.text.should.match (new RegExp("href=\"https://test.issuer.com/resend/passwordless\\?email=doe%40test\\.com&amp;", "g"))

      it 'resend link should contain redirect_uri', ->
        res.text.should.match (new RegExp("href=\"https://test.issuer.com/resend/passwordless\\?.*redirect_uri=", "g"))

      it 'resend link should contain client_id', ->
        res.text.should.match (new RegExp("href=\"https://test.issuer.com/resend/passwordless\\?.*client_id=", "g"))

      it 'resend link should contain response_type', ->
        res.text.should.match (new RegExp("href=\"https://test.issuer.com/resend/passwordless\\?.*response_type=", "g"))

      it 'resend link should contain scope', ->
        res.text.should.match (new RegExp("href=\"https://test.issuer.com/resend/passwordless\\?.*scope=", "g"))

      it 'resend link should contain nonce', ->
        res.text.should.match (new RegExp("href=\"https://test.issuer.com/resend/passwordless\\?.*nonce=", "g"))
