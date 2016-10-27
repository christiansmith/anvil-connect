# Test dependencies
cwd         = process.cwd()
path        = require 'path'


# Test dependencies
cwd       = process.cwd()
path      = require 'path'
faker     = require 'faker'
chai      = require 'chai'
sinon     = require 'sinon'
sinonChai = require 'sinon-chai'
mockMulti = require '../lib/multi'
expect    = chai.expect




# Configure Chai and Sinon
chai.use sinonChai
chai.should()




# Code under test
settings       = require path.join(cwd, 'boot/settings')
Modinha        = require 'modinha'
AccessToken    = require path.join(cwd, 'models/AccessToken')
AccessTokenJWT = require path.join(cwd, 'models/AccessTokenJWT')
{nowSeconds}   = require '../../../lib/time-utils'




# Redis lib for spying and stubbing
Redis   = require('ioredis')
client  = new Redis(12345)
rclient = Redis.prototype
multi   = mockMulti(rclient)
AccessToken.__client = client


describe 'AccessToken', ->

  {err,validation,instance} = {}

  after ->
    rclient.multi.restore()


  #before ->

  #  # Mock data
  #  data = []

  #  for i in [0..9]
  #    data.push
  #      name:     "#{faker.Name.firstName()} #{faker.Name.lastName()}"
  #      email:    faker.Internet.email()
  #      hash:     'private'
  #      password: 'secret1337'

  #  users = User.initialize(data, { private: true })
  #  jsonUsers = users.map (d) ->
  #    User.serialize(d)
  #  ids = users.map (d) ->
  #    d._id


  describe 'schema', ->

    beforeEach ->
      instance = new AccessToken
      validation = instance.validate()

    it 'should have unique identifier', ->
      AccessToken.schema[AccessToken.uniqueId].should.be.a('object')

    it 'should generate a default access token', ->
      instance.at.length.should.equal 20

    it 'should require an access token', ->
      AccessToken.schema.at.required.should.equal true

    it 'should use the access token as unique identifier', ->
      AccessToken.uniqueId.should.equal 'at'

    it 'should have token type', ->
      AccessToken.schema.tt.type.should.equal 'string'

    it 'should enumerate token types', ->
      AccessToken.schema.tt.enum.should.contain 'Bearer'
      AccessToken.schema.tt.enum.should.contain 'mac'

    it 'should default token type to "Bearer"', ->
      instance.tt.should.equal 'Bearer'

    it 'should have expires in', ->
      AccessToken.schema.ei.type.should.equal 'number'

    it 'should default expires in to 3600 seconds', ->
      instance.ei.should.equal 3600

    it 'should have refresh token', ->
      AccessToken.schema.rt.type.should.equal 'string'

    it 'should index refresh token as unique', ->
      AccessToken.schema.rt.unique.should.equal true

    it 'should require client id', ->
      validation.errors.cid.attribute.should.equal 'required'

    it 'should require user id', ->
      validation.errors.uid.attribute.should.equal 'required'

    it 'should require scope', ->
      validation.errors.scope.attribute.should.equal 'required'

    # TIMESTAMPS

    it 'should have "created" timestamp', ->
      AccessToken.schema.created.default.should.equal Modinha.defaults.timestamp

    it 'should have "modified" timestamp', ->
      AccessToken.schema.modified.default.should.equal Modinha.defaults.timestamp




  describe 'exists', ->

    {err,exist} = {}

    describe 'with pre-existing consent', ->

      before (done) ->
        sinon.stub(rclient, 'hget')
          .callsArgWith(2, null, 'uuid1')

        AccessToken.exists 'uuid1', 'uuid2', (error, exists) ->
          err = error
          exist = exists
          done()

      it 'should provide true', ->
        exist.should.equal true

      it 'should not provide an error', ->
        expect(err).to.be.null

      after ->
        rclient.hget.restore()

    describe 'without pre-existing consent', ->
      before (done) ->
        sinon.stub(rclient, 'hget')
          .callsArgWith(2, null, null)

        AccessToken.exists 'uuid1', 'uuid2', (error, exists) ->
          err = error
          exist = exists
          done()

      after ->
        rclient.hget.restore()

      it 'should provide false', ->
        expect(exist).to.be.false

      it 'should not provide an error', ->
        expect(err).to.be.null


  describe 'indexing', ->


  describe 'exchange', ->

    {res, instance} = {}

    describe 'with invalid request', ->

      before (done) ->
        sinon.stub(AccessToken, 'insert').callsArgWith(1, new Error)
        req =
          code:
            user_id:    'uuid1'
            client_id:   false    # this will cause a validation error
            max_age:     600
            scope:      'openid profile'
        AccessToken.exchange req, (error, response) ->
          err = error
          res = response
          done()

      after ->
        AccessToken.insert.restore()

      it 'should provide an error', ->
        expect(err).to.be.an('Error')

      it 'should not provide a value', ->
        expect(res).to.equal undefined


    describe 'with valid request', ->

      before (done) ->
        instance = new AccessToken
        sinon.stub(AccessToken, 'insert').callsArgWith(1, null, instance)
        req =
          code:
            user_id:    'uuid1'
            client_id:  'uuid2'    # this will cause a validation error
            max_age:     600
            scope:      'openid profile'

        AccessToken.exchange req, (error, result) ->
          err = error
          instance = result
          done()

      after ->
        AccessToken.insert.restore()

      it 'should provide a null error', ->
        expect(err).to.be.null

      it 'should provide an instance', ->
        expect(instance).to.be.instanceof AccessToken

      it 'should provide a refresh token', ->
        AccessToken.insert.should.have.been.calledWith sinon.match({
          rt: sinon.match.string
        })

      it 'should expire in the default duration', ->
        instance.ei.should.equal AccessToken.schema.ei.default




  describe 'issue', ->

    {res} = {}

    describe 'with invalid request', ->

      describe 'with insert exception', ->

        before (done) ->
          sinon.stub(AccessToken, 'insert').callsArgWith(1, new Error)
          req =
            user: {}
            client: {}
          AccessToken.issue req, (error, response) ->
            err = error
            res = response
            done()

        after ->
          AccessToken.insert.restore()

        it 'should provide an error', ->
          expect(err).to.be.an('Error')

        it 'should not provide a value', ->
          expect(res).to.equal undefined

      describe 'with toJWT exception', ->

        before (done) ->
          instance = new AccessToken
            iss: settings.issuer
            uid: 'uuid1'
            cid: 'uuid2'
            scope: 'openid profile'
          sinon.stub(AccessToken, 'insert').callsArgWith(1, null, instance)
          sinon.stub(AccessToken.prototype, 'toJWT').throws(new Error)
          req =
            user: {}
            client: {}
          AccessToken.issue req, (error, response) ->
            err = error
            res = response
            done()

        after ->
          AccessToken.insert.restore()
          AccessToken.prototype.toJWT.restore()

        it 'should provide an error', ->
          expect(err).to.be.an('Error')

        it 'should not provide a value', ->
          expect(res).to.equal undefined

    describe 'with valid request', ->

      before (done) ->
        instance = new AccessToken
          iss: settings.issuer
          uid: 'uuid1'
          cid: 'uuid2'
          scope: 'openid profile'
        sinon.stub(AccessToken, 'insert').callsArgWith(1, null, instance)
        req =
          user:   { _id: 'uuid1' }
          client: { _id: 'uuid2' }
        AccessToken.issue req, (error, response) ->
          err = error
          res = response
          done()

      after ->
        AccessToken.insert.restore()

      it 'should provide a null error', ->
        expect(err).to.be.null

      it 'should provide an "issue" projection of the token', ->
        res.access_token.length.should.be.above 100
        options =
          key: settings.keys.sig.pub
        decoded = AccessTokenJWT.decode(res.access_token, options.key)
        decoded.payload.should.have.property('iss', settings.issuer)
        decoded.payload.should.have.property('sub', 'uuid1')
        decoded.payload.should.have.property 'iat'
        decoded.payload.should.have.property 'exp'
        decoded.payload.should.have.property 'scope'

      it 'should expire in the default duration', ->
        res.expires_in.should.equal AccessToken.schema.ei.default


    describe 'with max_age parameter', ->

      before (done) ->
        instance = new AccessToken
          iss: settings.issuer
          uid: 'uuid1'
          cid: 'uuid2'
          scope: 'openid profile'
        sinon.stub(AccessToken, 'insert').callsArgWith(1, null, instance)
        req =
          user:   { _id: 'uuid1' }
          client: { _id: 'uuid2', default_max_age: 7777 }
          connectParams: { max_age: '1000' }
        AccessToken.issue req, (error, response) ->
          err = error
          res = response
          done()

      after ->
        AccessToken.insert.restore()

      it 'should set expires_in from max_age', ->
        AccessToken.insert.should.have.been.calledWith sinon.match({
          ei: 1000
        })


    describe 'with client default_max_age property', ->

      before (done) ->
        instance = new AccessToken
          iss: settings.issuer
          uid: 'uuid1'
          cid: 'uuid2'
          scope: 'openid profile'
        sinon.stub(AccessToken, 'insert').callsArgWith(1, null, instance)
        req =
          user:   { _id: 'uuid1' }
          client: { _id: 'uuid2', default_max_age: 7777 }
        AccessToken.issue req, (error, response) ->
          err = error
          res = response
          done()

      after ->
        AccessToken.insert.restore()

      it 'should set expires_in from default_max_age', ->
        AccessToken.insert.should.have.been.calledWith sinon.match({
          ei: 7777
        })




  describe 'refresh', ->

    describe 'with unknown refresh token', ->

      before (done) ->
        sinon.stub(AccessToken, 'getByRt').callsArgWith(1, null, null)
        AccessToken.refresh 'r3fr3sh', 'uuid', (error, result) ->
          err = error
          instance = result
          done()

      after ->
        AccessToken.getByRt.restore()

      it 'should provide an error', ->
        expect(err).to.be.instanceof AccessToken.InvalidTokenError

      it 'should not provide a token', ->
        expect(instance).to.be.undefined


    describe 'with mismatching client id', ->

      before (done) ->
        sinon.stub(AccessToken, 'getByRt').callsArgWith(1, null, { cid: 'uuid' })
        AccessToken.refresh 'r3fr3sh', 'wrong', (error, result) ->
          err = error
          instance = result
          done()

      after ->
        AccessToken.getByRt.restore()

      it 'should provide an error', ->
        expect(err).to.be.instanceof AccessToken.InvalidTokenError

      it 'should not provide a token', ->
        expect(instance).to.be.undefined


    describe 'with valid token', ->

      before (done) ->
        sinon.stub(multi, 'exec').callsArgWith 0, null, []
        sinon.stub(AccessToken, 'delete').callsArgWith(1, null)
        sinon.stub(AccessToken, 'getByRt').callsArgWith(1, null, {
          at:     't0k3n'
          uid:    'uuid1'
          cid:    'uuid2'
          ei:      600
          scope:  'openid profile'
        })
        sinon.spy(AccessToken, 'insert')
        AccessToken.refresh 'r3fr3sh', 'uuid2', (error, result) ->
          err = error
          instance = result
          done()

      after ->
        multi.exec.restore()
        AccessToken.delete.restore()
        AccessToken.insert.restore()
        AccessToken.getByRt.restore()

      it 'should delete the existing token', ->
        AccessToken.delete.should.have.been.calledWith 't0k3n'

      it 'should provide a null error', ->
        expect(err).to.be.null

      it 'should provide a new token instance', ->
        expect(instance).to.be.instanceof AccessToken

      it 'should persist the new token instance with a refresh_token and same client_id', ->
        AccessToken.insert.should.have.been.calledWith sinon.match({
          cid: 'uuid2'
          rt: sinon.match.string
        })

      it 'should provide a new value for the refresh_token', ->
        AccessToken.insert.should.have.not.been.calledWith sinon.match({
          rt: 'r3fr3sh'
        })




  describe 'toJWT', ->

    {token,issued,decoded} = {}

    describe 'with missing secret', ->

    describe 'with invalid secret', ->

    describe 'with invalid payload', ->

    describe 'with valid payload and secret', ->

      before ->
        token = new AccessToken
          iss:     settings.issuer
          uid:    'uid'
          cid:    'cid'
          scope:  'openid'
        issued = token.toJWT(settings.keys.sig.prv)
        decoded = AccessTokenJWT.decode(issued, settings.keys.sig.pub)


      it 'should issue a signed JWT', ->
        issued.split('.').length.should.equal 3

      it 'should set the jti claim to the access token identifier', ->
        decoded.payload.jti.should.equal token.at

      it 'should set iss to the issuer', ->
        decoded.payload.iss.should.equal settings.issuer

      it 'should calculate exp', ->
        decoded.payload.exp.should.equal(
          decoded.payload.iat + token.ei
        )




  describe 'revoke', ->

    {deleted} = {}

    beforeEach (done) ->
      token = new AccessToken
        uid: 'uuid-1'
        cid: 'uuid-2'
      sinon.stub(client, 'hget').callsArgWith 2, null, 'fakeId'
      sinon.stub(AccessToken, 'delete').callsArgWith 1, null, true
      AccessToken.revoke token.uid, token.cid, (error, result) ->
        err = error
        deleted = result
        done()

    afterEach ->
      client.hget.restore()
      AccessToken.delete.restore()

    it 'should provide a null error', ->
      expect(err).to.be.null

    it 'should provide confirmation', ->
      deleted.should.be.true




  describe 'verify', ->

    {claims} = {}
    describe 'with undecodable JWT', ->

      before (done) ->
        token = 'bad.jwt'
        options =
          key: settings.keys.sig.pub
        AccessToken.verify token, options, (error, data) ->
          err    = error
          claims = data
          done()

      it 'should provide an error', ->
        expect(err).to.be.instanceof Error

      it 'should not provide claims', ->
        expect(claims).to.be.undefined


    describe 'with decodable JWT and mismatching issuer', ->

      before (done) ->
        token = (new AccessTokenJWT({
          at: 'r4nd0m',
          iss: 'https://MISMATCHING'
          uid: 'uuid1'
          cid: 'uuid2'
          scope: 'openid'
        })).encode(settings.keys.sig.prv)
        options =
          iss: settings.issuer
          key: settings.keys.sig.pub
        AccessToken.verify token, options, (error, data) ->
          err    = error
          claims = data
          done()

      it 'should provide an error', ->
        err.error.should.equal 'invalid_token'

      it 'should provide an error description', ->
        err.error_description.should.equal 'Mismatching issuer'

      it 'should provide a status code', ->
        err.statusCode.should.equal 403


    describe 'with decodable JWT that has expired', ->

      before (done) ->
        token = (new AccessTokenJWT({
          at: 'r4nd0m',
          iss: settings.issuer
          uid: 'uuid1'
          cid: 'uuid2'
          exp: nowSeconds(-1)
          scope: 'openid'
        })).encode(settings.keys.sig.prv)
        options =
          iss: settings.issuer
          key: settings.keys.sig.pub
        AccessToken.verify token, options, (error, data) ->
          err    = error
          claims = data
          done()

      it 'should provide an error', ->
        err.error.should.equal 'invalid_token'

      it 'should provide an error description', ->
        err.error_description.should.equal 'Expired access token'

      it 'should provide a status code', ->
        err.statusCode.should.equal 403


    describe 'with decodable JWT that has insufficient scope', ->

      before (done) ->
        token = (new AccessTokenJWT({
          at: 'r4nd0m',
          iss: settings.issuer
          uid: 'uuid1'
          cid: 'uuid2'
          scope: 'openid'
        })).encode(settings.keys.sig.prv)
        options =
          iss: settings.issuer
          key: settings.keys.sig.pub
          scope: 'other'
        AccessToken.verify token, options, (error, data) ->
          err    = error
          claims = data
          done()

      it 'should provide an error', ->
        err.error.should.equal 'insufficient_scope'

      it 'should provide an error description', ->
        err.error_description.should.equal 'Insufficient scope'

      it 'should provide a status code', ->
        err.statusCode.should.equal 403


    describe 'with random string and unknown token', ->

      before (done) ->
        sinon.stub(AccessToken, 'get').callsArgWith(1, null, null)
        token = 'r4nd0m'
        options =
          iss: settings.issuer
          key: settings.keys.sig.pub
        AccessToken.verify token, options, (error, data) ->
          err    = error
          claims = data
          done()

      after ->
        AccessToken.get.restore()

      it 'should provide an error', ->
        err.error.should.equal 'invalid_request'

      it 'should provide an error description', ->
        err.error_description.should.equal 'Unknown access token'

      it 'should provide a status code', ->
        err.statusCode.should.equal 401


    describe 'with random string and mismatching issuer', ->

      before (done) ->
        sinon.stub(AccessToken, 'get').callsArgWith(1, null, {
          iss: 'MISMATCH'
        })
        token = 'r4nd0m'
        options =
          iss: settings.issuer
          key: settings.keys.sig.pub
        AccessToken.verify token, options, (error, data) ->
          err    = error
          claims = data
          done()

      after ->
        AccessToken.get.restore()

      it 'should provide an error', ->
        err.error.should.equal 'invalid_token'

      it 'should provide an error description', ->
        err.error_description.should.equal 'Mismatching issuer'

      it 'should provide a status code', ->
        err.statusCode.should.equal 403


    describe 'with random string and expired token', ->

      before (done) ->
        sinon.stub(AccessToken, 'get').callsArgWith(1, null, {
          iss:      settings.issuer
          ei:       -10000
          created:  nowSeconds()
        })
        token = 'r4nd0m'
        options =
          iss: settings.issuer
          key: settings.keys.sig.pub
        AccessToken.verify token, options, (error, data) ->
          err    = error
          claims = data
          done()

      after ->
        AccessToken.get.restore()

      it 'should provide an error', ->
        err.error.should.equal 'invalid_token'

      it 'should provide an error description', ->
        err.error_description.should.equal 'Expired access token'

      it 'should provide a status code', ->
        err.statusCode.should.equal 403


    describe 'with random string and insufficient scope', ->

      before (done) ->
        sinon.stub(AccessToken, 'get').callsArgWith(1, null, {
          iss:      settings.issuer
          ei:       10000
          scope:    'openid'
          created:  nowSeconds()
        })
        token = 'r4nd0m'
        options =
          iss: settings.issuer
          key: settings.keys.sig.pub
          scope: 'other'
        AccessToken.verify token, options, (error, data) ->
          err    = error
          claims = data
          done()

      after ->
        AccessToken.get.restore()

      it 'should provide an error', ->
        err.error.should.equal 'insufficient_scope'

      it 'should provide an error description', ->
        err.error_description.should.equal 'Insufficient scope'

      it 'should provide a status code', ->
        err.statusCode.should.equal 403


    describe 'valid token', ->

      before (done) ->
        instance =
          at:       'r4nd0m'
          iss:      settings.issuer
          uid:      'uuid1'
          cid:      'uuid2'
          ei:       10
          scope:    'openid'
          created:  nowSeconds()

        sinon.stub(AccessToken, 'get').callsArgWith(1, null, instance)
        token = 'r4nd0m'
        options =
          iss: settings.issuer
          key: settings.keys.sig.pub
        AccessToken.verify token, options, (error, data) ->
          err    = error
          claims = data
          done()

      after ->
        AccessToken.get.restore()

      it 'should provide a null error', ->
        expect(err).to.be.null

      it 'should provide "jti" claim', ->
        claims.jti.should.equal instance.at

      it 'should provide "iss" claim', ->
        claims.iss.should.equal instance.iss

      it 'should provide "sub" claim', ->
        claims.sub.should.equal instance.uid

      it 'should provide "aud" claim', ->
        claims.aud.should.equal instance.cid

      it 'should provide "iat" claim', ->
        claims.iat.should.equal instance.created

      it 'should provide "exp" claim', ->
        claims.exp.should.equal instance.created + instance.ei

      it 'should provide "scope" claim', ->
        claims.scope.should.equal instance.scope




