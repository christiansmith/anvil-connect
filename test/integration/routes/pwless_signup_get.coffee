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

describe 'Passwordless signup get route', ->

  settings = require '../../../boot/settings'

  tsSettings = {}

  before ->
    tsSettings = new TestSettings(settings,
      _.pick(settings, ['response_types_supported']))

    tsSettings.addSettings
      issuer: 'https://test.issuer.com'
      providers:
        passwordless: {}


  after ->
    tsSettings.restore()

  {err, res} = {}

  describe 'GET signup/passwordless', ->

    describe 'success flow', ->

      sub =
        email: 'test@test.org'
        redirect_uri: 'https://test.org/callback'
        client_id: 'test-client-id'
        response_type: 'token id_token'
        scope: 'openid profile'
        nonce: 'test-nonce'
        unexpected: 'test-unexpected'

      signupToken = new OneTimeToken {
        use: 'pwless-signup'
        sub: sub
      }

      newUserToken = new OneTimeToken {
        _id: 'id-new-use-token'
        use: 'pwless-new-user'
        sub: sub
      }


      before (done) ->

        sinon.stub(OneTimeToken, 'consume')
          .callsArgWith(1, null, signupToken)

        sinon.stub(Client, 'get').callsArgWith(2, null,
          {
            client_name: 'unit test pwless_resend'
            redirect_uris: [
              'https://test.org/callback'
            ]
            trusted: true
            response_types: ['id_token token']
            grant_types: ['implicit']
          })

        sinon.stub(OneTimeToken, 'issue')
          .callsArgWith(1, null, newUserToken)

        query =
          token: 'token-id'

        request
          .get('/signup/passwordless?' + qs.stringify(query))
          .end (error, response) ->
            err = error
            res = response
            done()

      after ->
        OneTimeToken.issue.restore()
        Client.get.restore()
        OneTimeToken.consume.restore()

      it 'should respond 200', ->
        res.statusCode.should.equal 200

      it 'should respond with an html page', ->
        res.headers['content-type'].should.contain 'text/html'

      it 'should respond with html page containing the sender', ->
        res.text.should.contain 'test@test.org'

      it 'should respond with html page containing the token', ->
        res.text.should.contain 'id-new-use-token'
