chai = require 'chai'
sinon = require 'sinon'
sinonChai = require 'sinon-chai'
expect = chai.expect
chai.use sinonChai
chai.should()




{getBearerToken} = require '../../oidc'




describe 'Get Bearer Token', ->


  {req,res,next,err} = {}


  describe 'with no token present', ->

    before (done) ->
      req = { headers: {}, authorization: {} }
      res = {}
      next = sinon.spy (error) ->
        done()

      getBearerToken(req, res, next)

    it 'should not set token on the request', ->
      expect(req.bearer).to.be.undefined

    it 'should continue', ->
      expect(err).to.be.undefined




  describe 'with authorization header and query parameter', ->

    before (done) ->
      req =
        authorization:
          scheme: 'bearer'
          credentials: 'whatever'
        query:
          access_token: 'whatever'
      res = {}
      next = sinon.spy (error) ->
        err = error
        done()

      getBearerToken(req, res, next)

    it 'should provide an error', ->
      err.error.should.equal 'invalid_request'

    it 'should provide an error description', ->
      err.error_description.should.equal 'Multiple authentication methods'

    it 'should provide a status code', ->
      err.statusCode.should.equal 400




  describe 'with query parameter and request body parameter', ->

    before (done) ->
      req =
        authorization: {}
        query:
          access_token: 'whatever'
        body:
          access_token: 'whatever'
      res = {}
      next = sinon.spy (error) ->
        err = error
        done()

      getBearerToken(req, res, next)

    it 'should provide an error', ->
      err.error.should.equal 'invalid_request'

    it 'should provide an error description', ->
      err.error_description.should.equal 'Multiple authentication methods'

    it 'should provide a status code', ->
      err.statusCode.should.equal 400




  describe 'with authorization header and request body parameter', ->

    before (done) ->
      req =
        authorization:
          scheme: 'bearer'
          credentials: 'whatever'
        body:
          access_token: 'whatever'
      res = {}
      next = sinon.spy (error) ->
        err = error
        done()

      getBearerToken(req, res, next)

    it 'should provide an error', ->
      err.error.should.equal 'invalid_request'

    it 'should provide an error description', ->
      err.error_description.should.equal 'Multiple authentication methods'

    it 'should provide a status code', ->
      err.statusCode.should.equal 400




  describe 'with request body parameter and invalid content type', ->

    before (done) ->
      req =
        authorization: {}
        headers: {}
        body:
          access_token: 'whatever'
      res = {}
      next = sinon.spy (error) ->
        err = error
        done()

      getBearerToken(req, res, next)

    it 'should provide an error', ->
      err.error.should.equal 'invalid_request'

    it 'should provide an error description', ->
      err.error_description.should.equal 'Invalid content-type'

    it 'should provide a status code', ->
      err.statusCode.should.equal 400




  describe 'with valid (parsed) authorization header', ->

    before (done) ->
      req =
        authorization:
          scheme: 'bearer'
          credentials: 'whatever'
      res = {}
      next = sinon.spy (error) ->
        err = error
        done()

      getBearerToken(req, res, next)

    it 'should set token on the request', ->
      req.bearer.should.equal 'whatever'

    it 'should continue', ->
      next.firstCall.args.length.should.equal 0




  describe 'with query parameter', ->

    before (done) ->
      req =
        authorization: {}
        query:
          access_token: 'whatever'
      res = {}
      next = sinon.spy (error) ->
        err = error
        done()

      getBearerToken(req, res, next)

    it 'should set token on the request', ->
      req.bearer.should.equal 'whatever'

    it 'should continue', ->
      next.firstCall.args.length.should.equal 0




  describe 'with request body parameter', ->

    before (done) ->
      req =
        authorization: {}
        headers:
          'content-type': 'application/x-www-form-urlencoded'
        body:
          access_token: 'whatever'
      res = {}
      next = sinon.spy (error) ->
        err = error
        done()

      getBearerToken(req, res, next)

    it 'should set token on the request', ->
      req.bearer.should.equal 'whatever'

    it 'should continue', ->
      next.firstCall.args.length.should.equal 0
