chai = require 'chai'
should = chai.should()
expect = chai.expect

_ = require 'lodash'

{verifyMailerConfigured} = require '../../../oidc'
mailer = require '../../../boot/mailer'
mailer_state  = {}

# these are not used in this middleware.
# TODO: perhaps this check should not be a middleware check
# as it is not actually looking at the request.
req = {}
res = {}
err = {}

describe 'Verify Mailer Configuration', ->

  before (done) ->
    _.assign(mailer_state, mailer)
    done()

  after ->
    _.assign(mailer, mailer_state)

  describe 'with missing mailer configuration data', ->

    before (done) ->
      delete mailer.transport

      verifyMailerConfigured req, res, (error) ->
        err = error
        done()

    it 'should call next with an Error', ->
      err.name.should.equal 'Error'

    it 'Error should reveal that mailer is not configured', ->
      err.message.should.equal 'Mailer not configured.'

  describe 'with mailer configuration data', ->

    before (done) ->
      mailer.transport = {}

      verifyMailerConfigured req, res, (error) ->
        err = error
        done()

    it 'should call next with no error', ->
      should.not.exist(err)
