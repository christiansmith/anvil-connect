chai      = require 'chai'
sinon     = require 'sinon'
sinonChai = require 'sinon-chai'
expect    = chai.expect




chai.use sinonChai
chai.should()



IDToken = require '../../../models/IDToken'
AccessToken = require '../../../models/AccessToken'
AuthorizationCode  = require '../../../models/AuthorizationCode'
authorize = require('../../../oidc').authorize




describe 'Authorize', ->


  {req,res,next,err} = {}


  describe 'with consent and "code" response type', ->

    before (done) ->
      sinon.stub(AuthorizationCode, 'insert').callsArgWith(1, null, {
        code: '1234'
      })

      req =
        session: {}
        client:
          _id: 'uuid1'
        user:
          _id: 'uuid2'
        connectParams:
          authorize:      'true'
          response_type:  'code'
          redirect_uri:   'https://host/callback'
          state:          'r4nd0m'
      res =
        redirect: sinon.spy()
      next = sinon.spy()

      authorize req, res, next
      done()

    after ->
      AuthorizationCode.insert.restore()

    it 'should set default max_age if none is provided', ->
      AuthorizationCode.insert.should.have.been.calledWith sinon.match({
        max_age: undefined
      })

    it 'should redirect to the redirect_uri', ->
      res.redirect.should.have.been.calledWith sinon.match(
        req.connectParams.redirect_uri
      )

    it 'should provide a query string', ->
      res.redirect.should.have.been.calledWith sinon.match('?')

    it 'should provide authorization code', ->
      res.redirect.should.have.been.calledWith sinon.match 'code=1234'

    it 'should provide state', ->
      res.redirect.should.have.been.calledWith sinon.match 'state=r4nd0m'

    it 'should not provide session_state', ->
      res.redirect.should.not.have.been.calledWith sinon.match('session_state=')

  describe 'with consent,  "code" response type and "form_post" response_mode', ->

    before (done) ->
      sinon.stub(AuthorizationCode, 'insert').callsArgWith(1, null, {
        code: '1234'
      })

      req =
        session: {}
        client:
          _id: 'uuid1'
        user:
          _id: 'uuid2'
        connectParams:
          authorize:      'true'
          response_type:  'code'
          response_mode:  'form_post'
          redirect_uri:   'https://host/callback'
          state:          'r4nd0m'
      res =
        set: sinon.spy()
        render: sinon.spy()
      next = sinon.spy()

      authorize req, res, next
      done()

    after ->
      AuthorizationCode.insert.restore()

    it 'should set default max_age if none is provided', ->
      AuthorizationCode.insert.should.have.been.calledWith sinon.match({
        max_age: undefined
      })

    it 'should set cache-control headers', ->
      res.set.should.have.been.calledWithExactly({
        'Cache-Control': 'no-cache, no-store',
        'Pragma': 'no-cache'
      })

    it 'should respond with the form_post', ->
      res.render.should.have.been.calledWithExactly(
        "form_post", {
          redirect_uri: req.connectParams.redirect_uri
          state: req.connectParams.state
          access_token: undefined
          id_token: undefined
          code: '1234'
        }
      )


  describe 'with consent and "code" response type and "max_age" param', ->

    before (done) ->
      sinon.stub(AuthorizationCode, 'insert').callsArgWith(1, null, {
        code: '1234'
      })

      req =
        session: {}
        client:
          _id: 'uuid1'
        user:
          _id: 'uuid2'
        connectParams:
          authorize:      'true'
          response_type:  'code'
          redirect_uri:   'https://host/callback'
          state:          'r4nd0m'
          max_age:        1000
      res =
        redirect: sinon.spy()
      next = sinon.spy()

      authorize req, res, next
      done()

    after ->
      AuthorizationCode.insert.restore()

    it 'should set max_age from params', ->
      AuthorizationCode.insert.should.have.been.calledWith sinon.match({
        max_age: req.connectParams.max_age
      })




  describe 'with consent and "code" response type and client "default_max_age"', ->

    before (done) ->
      sinon.stub(AuthorizationCode, 'insert').callsArgWith(1, null, {
        code: '1234'
      })

      req =
        session: {}
        client:
          _id: 'uuid1'
          default_max_age: 2000
        user:
          _id: 'uuid2'
        connectParams:
          authorize:      'true'
          response_type:  'code'
          redirect_uri:   'https://host/callback'
          state:          'r4nd0m'
      res =
        redirect: sinon.spy()
      next = sinon.spy()

      authorize req, res, next
      done()

    after ->
      AuthorizationCode.insert.restore()

    it 'should set max_age from client default_max_age', ->
      AuthorizationCode.insert.should.have.been.calledWith sinon.match({
        max_age: req.client.default_max_age
      })




  describe 'with consent and "code token" response type', ->

    before (done) ->
      sinon.stub(AuthorizationCode, 'insert').callsArgWith(1, null, {
        code: '1234'
      })
      response = AccessToken.initialize().project('issue')
      sinon.stub(AccessToken, 'issue').callsArgWith(1, null, response)

      req =
        session: {}
        client:
          _id: 'uuid1'
        user:
          _id: 'uuid2'
        connectParams:
          authorize:      'true'
          response_type:  'code token'
          redirect_uri:   'https://host/callback'
          scope:          'openid profile'
          state:          'r4nd0m'
      res =
        redirect: sinon.spy()
      next = sinon.spy()

      authorize req, res, next
      done()

    after ->
      AuthorizationCode.insert.restore()
      AccessToken.issue.restore()

    it 'should redirect to the redirect_uri', ->
      res.redirect.should.have.been.calledWith sinon.match(
        req.connectParams.redirect_uri
      )

    it 'should provide a uri fragment', ->
      res.redirect.should.have.been.calledWith sinon.match('#')

    it 'should provide authorization code', ->
      res.redirect.should.have.been.calledWith sinon.match 'code=1234'

    it 'should provide access_token', ->
      res.redirect.should.have.been.calledWith sinon.match('access_token=')

    it 'should provide token_type', ->
      res.redirect.should.have.been.calledWith sinon.match('token_type=Bearer')

    it 'should provide expires_in', ->
      res.redirect.should.have.been.calledWith sinon.match('expires_in=3600')

    it 'should not provide id_token', ->
      res.redirect.should.not.have.been.calledWith sinon.match('id_token=')

    it 'should provide state', ->
      res.redirect.should.have.been.calledWith sinon.match req.connectParams.state

    it 'should provide session_state', ->
      res.redirect.should.have.been.calledWith sinon.match('session_state=')




  describe 'with consent and "code id_token" response type', ->

    before (done) ->
      sinon.stub(AuthorizationCode, 'insert').callsArgWith(1, null, {
        code: '1234'
      })
      sinon.spy(IDToken.prototype, 'initializePayload')

      req =
        session:
          amr: ['sms', 'otp']
        client:
          _id: 'uuid1'
        user:
          _id: 'uuid2'
        connectParams:
          authorize:      'true'
          response_type:  'code id_token'
          redirect_uri:   'https://host/callback'
          state:          'r4nd0m'
      res =
        redirect: sinon.spy()
      next = sinon.spy()

      authorize req, res, next
      done()

    after ->
      AuthorizationCode.insert.restore()
      IDToken.prototype.initializePayload.restore()

    it 'should set default max_age if none is provided', ->
      AuthorizationCode.insert.should.have.been.calledWith sinon.match({
        max_age: undefined
      })

    it 'should redirect to the redirect_uri', ->
      res.redirect.should.have.been.calledWith sinon.match(
        req.connectParams.redirect_uri
      )

    it 'should provide a uri fragment', ->
      res.redirect.should.have.been.calledWith sinon.match('#')

    it 'should provide authorization code', ->
      res.redirect.should.have.been.calledWith sinon.match 'code=1234'

    it 'should provide id_token', ->
      res.redirect.should.have.been.calledWith sinon.match('id_token=')

    it 'should not provide access_token', ->
      res.redirect.should.not.have.been.calledWith sinon.match('access_token=')

    it 'should provide state', ->
      res.redirect.should.have.been.calledWith sinon.match 'state=r4nd0m'

    it 'should provide session_state', ->
      res.redirect.should.have.been.calledWith sinon.match('session_state=')

    it 'should include `amr` claim in id_token', ->
      IDToken.prototype.initializePayload.should.have.been.calledWith(
        sinon.match amr: req.session.amr
      )



  describe 'with consent and "id_token token" response type', ->

    before (done) ->
      response = AccessToken.initialize().project('issue')
      sinon.stub(AccessToken, 'issue').callsArgWith(1, null, response)
      sinon.spy(IDToken.prototype, 'initializePayload')

      req =
        session:
          amr: ['otp']
        client:
          _id: 'uuid1'
        user:
          _id: 'uuid2'
        connectParams:
          authorize:      'true'
          response_type:  'id_token token'
          redirect_uri:   'https://host/callback'
          nonce:          'n0nc3'
          state:          'r4nd0m'
      res =
        redirect: sinon.spy()
      next = sinon.spy()

      authorize req, res, next
      done()

    after ->
      AccessToken.issue.restore()
      IDToken.prototype.initializePayload.restore()

    it 'should redirect to the redirect_uri', ->
      res.redirect.should.have.been.calledWith sinon.match(
        req.connectParams.redirect_uri
      )

    it 'should provide a uri fragment', ->
      res.redirect.should.have.been.calledWith sinon.match('#')

    it 'should provide access_token', ->
      res.redirect.should.have.been.calledWith sinon.match('access_token=')

    it 'should provide token_type', ->
      res.redirect.should.have.been.calledWith sinon.match('token_type=Bearer')

    it 'should provide expires_in', ->
      res.redirect.should.have.been.calledWith sinon.match('expires_in=3600')

    it 'should provide id_token', ->
      res.redirect.should.have.been.calledWith sinon.match('id_token=')

    it 'should provide state', ->
      res.redirect.should.have.been.calledWith sinon.match req.connectParams.state

    it 'should provide session_state', ->
      res.redirect.should.have.been.calledWith sinon.match('session_state=')

    it 'should include `amr` claim in id_token', ->
      IDToken.prototype.initializePayload.should.have.been.calledWith(
        sinon.match amr: req.session.amr
      )



  describe 'with consent and "code id_token token" response type', ->

    before (done) ->
      sinon.stub(AuthorizationCode, 'insert').callsArgWith(1, null, {
        code: '1234'
      })
      response = AccessToken.initialize().project('issue')
      sinon.stub(AccessToken, 'issue').callsArgWith(1, null, response)
      sinon.spy(IDToken.prototype, 'initializePayload')

      req =
        session:
          amr: ['pwd']
        client:
          _id: 'uuid1'
        user:
          _id: 'uuid2'
        connectParams:
          authorize:      'true'
          response_type:  'code id_token token'
          redirect_uri:   'https://host/callback'
          scope:          'openid profile'
          state:          'r4nd0m'
      res =
        redirect: sinon.spy()
      next = sinon.spy()

      authorize req, res, next
      done()

    after ->
      AuthorizationCode.insert.restore()
      AccessToken.issue.restore()
      IDToken.prototype.initializePayload.restore()

    it 'should redirect to the redirect_uri', ->
      res.redirect.should.have.been.calledWith sinon.match(
        req.connectParams.redirect_uri
      )

    it 'should provide a uri fragment', ->
      res.redirect.should.have.been.calledWith sinon.match('#')

    it 'should provide authorization code', ->
      res.redirect.should.have.been.calledWith sinon.match 'code=1234'

    it 'should provide access_token', ->
      res.redirect.should.have.been.calledWith sinon.match('access_token=')

    it 'should provide token_type', ->
      res.redirect.should.have.been.calledWith sinon.match('token_type=Bearer')

    it 'should provide expires_in', ->
      res.redirect.should.have.been.calledWith sinon.match('expires_in=3600')

    it 'should provide id_token', ->
      res.redirect.should.have.been.calledWith sinon.match('id_token=')

    it 'should provide state', ->
      res.redirect.should.have.been.calledWith sinon.match req.connectParams.state

    it 'should provide session_state', ->
      res.redirect.should.have.been.calledWith sinon.match('session_state=')

    it 'should include `amr` claim in id_token', ->
      IDToken.prototype.initializePayload.should.have.been.calledWith(
        sinon.match amr: req.session.amr
      )


  describe 'with consent and "none" response type', ->

    before (done) ->
      sinon.stub(AuthorizationCode, 'insert').callsArgWith(1, null, {
        code: '1234'
      })

      req =
        session: {}
        client:
          _id: 'uuid1'
        user:
          _id: 'uuid2'
        connectParams:
          authorize:      'true'
          response_type:  'none'
          redirect_uri:   'https://host/callback'
          state:          'r4nd0m'
      res =
        redirect: sinon.spy()
      next = sinon.spy()

      authorize req, res, next
      done()

    after ->
      AuthorizationCode.insert.restore()

    it 'should redirect to the redirect_uri', ->
      res.redirect.should.have.been.calledWith sinon.match(
        req.connectParams.redirect_uri
      )

    it 'should provide a query string', ->
      res.redirect.should.have.been.calledWith sinon.match('?')

    it 'should not provide authorization code', ->
      res.redirect.should.not.have.been.calledWith sinon.match 'code=1234'

    it 'should provide state', ->
      res.redirect.should.have.been.calledWith sinon.match 'state=r4nd0m'

    it 'should not provide session_state', ->
      res.redirect.should.not.have.been.calledWith sinon.match('session_state=')



  describe 'with consent and response mode query', ->

    before (done) ->
      response = AccessToken.initialize().project('issue')
      sinon.stub(AccessToken, 'issue').callsArgWith(1, null, response)

      req =
        session: {}
        client:
          _id: 'uuid1'
        user:
          _id: 'uuid2'
        connectParams:
          authorize:      'true'
          response_type:  'id_token token'
          response_mode:  'query'
          redirect_uri:   'https://host/callback'
          nonce:          'n0nc3'
          state:          'r4nd0m'
      res =
        redirect: sinon.spy()
      next = sinon.spy()

      authorize req, res, next
      done()

    after ->
      AccessToken.issue.restore()

    it 'should redirect to the redirect_uri', ->
      res.redirect.should.have.been.calledWith sinon.match(
        req.connectParams.redirect_uri
      )

    it 'should provide a query string', ->
      res.redirect.should.have.been.calledWith sinon.match('?')

  describe 'with consent and response mode form_post', ->
    response = AccessToken.initialize().project('issue')

    before (done) ->
      sinon.stub(AccessToken, 'issue').callsArgWith(1, null, response)

      req =
        session: {}
        client:
          _id: 'uuid1'
        user:
          _id: 'uuid2'
        connectParams:
          authorize:      'true'
          response_type:  'id_token token'
          response_mode:  'form_post'
          redirect_uri:   'https://host/callback'
          nonce:          'n0nc3'
          state:          'r4nd0m'
      res =
        set: sinon.spy()
        render: sinon.spy()
      next = sinon.spy()

      authorize req, res, next
      done()

    after ->
      AccessToken.issue.restore()

    it 'should set cache-control headers', ->
      res.set.should.have.been.calledWithExactly({
        'Cache-Control': 'no-cache, no-store',
        'Pragma': 'no-cache'
      })

    it "should respond with form_post", ->
      res.render.should.have.been.calledWithExactly(
        "form_post", {
          redirect_uri: req.connectParams.redirect_uri
          state: req.connectParams.state
          access_token: response.access_token
          id_token: response.id_token
          code: undefined
        }
      )


  describe 'without consent', ->

    before (done) ->

      req =
        client:
          _id: 'uuid1'
        user:
          _id: 'uuid2'
        connectParams:
          response_type:  'id_token token'
          redirect_uri:   'https://host/callback'
          nonce:          'n0nc3'
          state:          'r4nd0m'
      res =
        redirect: sinon.spy()
      next = sinon.spy()

      authorize req, res, next
      done()

    it 'should redirect to the redirect_uri', ->
      res.redirect.should.have.been.calledWith sinon.match(
        req.connectParams.redirect_uri
      )

    it 'should provide an "access_denied" error', ->
      res.redirect.should.have.been.calledWith sinon.match('error=access_denied')



