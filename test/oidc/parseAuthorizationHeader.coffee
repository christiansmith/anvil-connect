chai = require 'chai'
sinon = require 'sinon'
sinonChai = require 'sinon-chai'
expect = chai.expect
chai.use sinonChai
chai.should()




{parseAuthorizationHeader} = require '../../oidc'




describe 'Parse Authorization Header', ->


  {req,res,next,err} = {}


  describe 'with no authorization header', ->

    before (done) ->
      req = { headers: {} }
      res = {}
      next = sinon.spy (error) ->
        done()

      parseAuthorizationHeader(req, res, next)

    it 'should add an empty authorization object to the request', ->
      req.authorization.should.eql {}

    it 'should continue', ->
      next.firstCall.args.length.should.equal 0




  describe 'with malformed header value', ->

    before (done) ->
      req =
        headers:
          authorization: 'Malformed Header Value'
      res = {}
      next = sinon.spy (error) ->
        err = error
        done()

      parseAuthorizationHeader(req, res, next)

    it 'should provide an error', ->
      err.error.should.equal 'invalid_request'

    it 'should provide an error description', ->
      err.error_description.should.equal 'Invalid authorization header'

    it 'should provide a status code', ->
      err.statusCode.should.equal 400




  describe 'with unrecognized scheme', ->

    before (done) ->
      req =
        headers:
          authorization: 'Unrecognized scheme'
      res = {}
      next = sinon.spy (error) ->
        err = error
        done()

      parseAuthorizationHeader(req, res, next)

    it 'should provide an error', ->
      err.error.should.equal 'invalid_request'

    it 'should provide an error description', ->
      err.error_description.should.equal 'Invalid authorization scheme'

    it 'should provide a status code', ->
      err.statusCode.should.equal 400




  describe 'with valid header', ->

    before (done) ->
      req =
        headers:
          authorization: 'Bearer token'
      res = {}
      next = sinon.spy (error) ->
        err = error
        done()

      parseAuthorizationHeader(req, res, next)

    it 'should add scheme to authorization object', ->
      req.authorization.scheme.should.equal 'Bearer'

    it 'should add credentials to authorization object', ->
      req.authorization.credentials.should.equal 'token'
