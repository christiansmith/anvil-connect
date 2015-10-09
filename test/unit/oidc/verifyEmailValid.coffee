chai      = require 'chai'
sinon     = require 'sinon'
sinonChai = require 'sinon-chai'
expect    = chai.expect




chai.use sinonChai
should = chai.should()

{selectConnectParams, verifyEmailValid} = require '../../../oidc'


describe 'Verify Email Valid', ->


  {req,res,next,err} = {}

  describe 'with missing email', ->

    before (done) ->
      req = { connectParams: {} }
      err = 'foo'
      verifyEmailValid req, res, (error) ->
        err = error
        done()

    it 'should call callback with no error', ->
      should.not.exist(err)

  describe 'with missing connectParams', ->

    before (done) ->
      req = {}
      err = 'foo'
      done()

    it 'should throw TypeError', ->
      expect( ->
        verifyEmailValid req, res, (error) ->
          err = error
        ).to.throw TypeError

  describe 'requires selectConnectParams to be called first', ->
    before (done) ->
      req = { method: 'GET' }
      err = 'foo'
      selectConnectParams req, res, (error) ->
        verifyEmailValid req, res, (error2) ->
          err = error2
          done()

    it 'should call callback with no error', ->
      should.not.exist(err)


  describe 'with email in query', ->
    before (done) ->
      req =
        method: 'GET'
        query:
          email: "bar@example.com"
      err = 'foo'
      selectConnectParams req, res, (error) ->
        verifyEmailValid req, res, (error2) ->
          err = error2
          done()

    it 'should call callback with no error', ->
      should.not.exist(err)

    it 'should leave connectParams email alone.', ->
      req.connectParams.email.should.equal('bar@example.com')

  describe 'with bad email in body', ->
    before (done) ->
      req =
        method: 'POST'
        query:
          email: "bar@salamander@example.com"
      err = 'foo'
      selectConnectParams req, res, (error) ->
        verifyEmailValid req, res, (error2) ->
          err = error2
          done()

    it 'should call callback with no error', ->
      should.not.exist(err)

    it 'should delete connectParams email.', ->
      should.not.exist(req.connectParams.email)
