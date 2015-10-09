# Test dependencies
chai = require 'chai'
sinon = require 'sinon'
sinonChai = require 'sinon-chai'
supertest = require 'supertest'
expect = chai.expect
qs = require 'qs'


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

describe 'Passwordless resend email route', ->

  settings = require '../../../boot/settings'
  mailer = require '../../../boot/mailer'

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

  {err, res} = {}

  describe 'GET resend/passwordless', ->

    describe 'success flow', ->


      before (done) ->

        sinon.stub(Client, 'get').callsArgWith(2, null,
          {
            client_name: 'unit test pwless_resend'
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

        query =
          client_id: '4a2c1a31-150d-49e3-9946-2909220cdb16'
          redirect_uri: 'http://localhost:9000/callback_popup.html'
          response_type: 'id_token token'
          scope: 'openid profile'
          nonce: 'KG4vsD0bfAjbEdCMurmiPxzEcpFGoguYGR7b3cj3AMs'
          email: 'foo@example.com'

        request
          .get('/resend/passwordless?' + qs.stringify(query))
          .end (error, response) ->
            err = error
            res = response
            done()

      after ->
        OneTimeToken.issue.restore()
        User.getByEmail.restore()
        Client.get.restore()

      it 'should respond 200', ->
        res.statusCode.should.equal 200

      it 'should respond with an html page', ->
        res.headers['content-type'].should.contain 'text/html'

      it 'should respond with html page containing the sender', ->
        res.text.should.contain 'from@example.com'

      it 'should respond with html page containing the resend link', ->
        res.text.should.match (new RegExp("href=\"http(s){0,1}://[^/]{0,}/resend/passwordless\\?email=foo%40example\\.com&amp;", "g"))
