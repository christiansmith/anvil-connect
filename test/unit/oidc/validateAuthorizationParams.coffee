chai = require 'chai'
chai.should()
expect = chai.expect




{validateAuthorizationParams} = require '../../../oidc'
settings = require '../../../boot/settings'




req = (params) -> connectParams: params, cookies: { 'connect.sid': 'secret' }
res = {}
err = null




describe 'Validate Authorization Parameters', ->

  describe 'all requests', ->

    describe 'with missing response_type', ->

      before (done) ->
        params = { redirect_uri: 'https://redirect.uri' }
        validateAuthorizationParams req(params), res, (error) ->
          err = error
          done()

      it 'should provide an AuthorizationError', ->
        err.name.should.equal 'AuthorizationError'

      it 'should provide an error code', ->
        err.error.should.equal 'invalid_request'

      it 'should provide an error description', ->
        err.error_description.should.equal 'Missing response type'

      it 'should provide a redirect_uri', ->
        err.redirect_uri.should.equal 'https://redirect.uri'

      it 'should provide a status code', ->
        err.statusCode.should.equal 302




    describe 'with only whitespace for a response_type', ->

      before (done) ->
        params =
          redirect_uri: 'https://redirect.uri'
          response_type: '    '
        validateAuthorizationParams req(params), res, (error) ->
          err = error
          done()

      it 'should provide an AuthorizationError', ->
        err.name.should.equal 'AuthorizationError'

      it 'should provide an error code', ->
        err.error.should.equal 'invalid_request'

      it 'should provide an error description', ->
        err.error_description.should.equal 'Missing response type'

      it 'should provide a redirect_uri', ->
        err.redirect_uri.should.equal 'https://redirect.uri'

      it 'should provide a status code', ->
        err.statusCode.should.equal 302




    describe 'with invalid response_type', ->

      before (done) ->
        params =
          redirect_uri: 'https://redirect.uri'
          response_type: 'invalid'

        validateAuthorizationParams req(params), res, (error) ->
          err = error
          done()

      it 'should provide an AuthorizationError', ->
        err.name.should.equal 'AuthorizationError'

      it 'should provide an error code', ->
        err.error.should.equal 'unsupported_response_type'

      it 'should provide an error description', ->
        err.error_description.should.equal 'Unsupported response type'

      it 'should provide a redirect_uri', ->
        err.redirect_uri.should.equal 'https://redirect.uri'

      it 'should provide a status code', ->
        err.statusCode.should.equal 302




    describe 'with unsupported response_type', ->

      supportedResponseTypes = settings.response_types_supported

      before (done) ->
        settings.response_types_supported = [
          'code',
          'id_token token',
          'code id_token token'
        ]

        params =
          redirect_uri: 'https://redirect.uri'
          response_type: 'code token'

        validateAuthorizationParams req(params), res, (error) ->
          err = error
          done()

      after ->
        settings.response_types_supported = supportedResponseTypes

      it 'should provide an AuthorizationError', ->
        err.name.should.equal 'AuthorizationError'

      it 'should provide an error code', ->
        err.error.should.equal 'unsupported_response_type'

      it 'should provide an error description', ->
        err.error_description.should.equal 'Unsupported response type'

      it 'should provide a redirect_uri', ->
        err.redirect_uri.should.equal 'https://redirect.uri'

      it 'should provide a status code', ->
        err.statusCode.should.equal 302




    describe 'with unregistered response_type', ->

      supportedResponseTypes = settings.response_types_supported

      before (done) ->
        settings.response_types_supported = [
          'code',
          'id_token token',
          'code id_token token'
        ]

        request =
          connectParams:
            redirect_uri: 'https://redirect.uri/cb'
            response_type: 'code'
          client:
            response_types: [ 'code id_token' ]
        res  = {}

        validateAuthorizationParams request, res, (error) ->
          err = error
          done()

      after ->
        settings.response_types_supported = supportedResponseTypes

      it 'should provide an AuthorizationError', ->
        err.name.should.equal 'AuthorizationError'

      it 'should provide an error code', ->
        err.error.should.equal 'unsupported_response_type'

      it 'should provide an error description', ->
        err.error_description.should.equal 'Unsupported response type'

      it 'should provide a redirect_uri', ->
        err.redirect_uri.should.equal 'https://redirect.uri/cb'

      it 'should provide a status code', ->
        err.statusCode.should.equal 302




    describe 'with duplicated response_type', ->

      supportedResponseTypes = settings.response_types_supported

      before (done) ->
        settings.response_types_supported = [
          'code',
          'id_token token',
          'code id_token token'
        ]

        request =
          connectParams:
            redirect_uri: 'https://redirect.uri/cb'
            response_type: 'token code token'
          client:
            response_types: [ 'code id_token token' ]
        res  = {}

        validateAuthorizationParams request, res, (error) ->
          err = error
          done()

      after ->
        settings.response_types_supported = supportedResponseTypes

      it 'should provide an AuthorizationError', ->
        err.name.should.equal 'AuthorizationError'

      it 'should provide an error code', ->
        err.error.should.equal 'unsupported_response_type'

      it 'should provide an error description', ->
        err.error_description.should.equal 'Unsupported response type'

      it 'should provide a redirect_uri', ->
        err.redirect_uri.should.equal 'https://redirect.uri/cb'

      it 'should provide a status code', ->
        err.statusCode.should.equal 302





    describe 'with extraneous response_type', ->

      before (done) ->
        params =
          redirect_uri: 'https://redirect.uri'
          response_type: 'none code'
          client_id: 'uuid'
          scope: 'openid'

        validateAuthorizationParams req(params), res, (error) ->
          err = error
          done()

      it 'should provide an AuthorizationError', ->
        err.name.should.equal 'AuthorizationError'

      it 'should provide an error code', ->
        err.error.should.equal 'unsupported_response_type'

      it 'should provide an error description', ->
        err.error_description.should.equal 'Unsupported response type'

      it 'should provide a redirect_uri', ->
        err.redirect_uri.should.equal 'https://redirect.uri'

      it 'should provide a status code', ->
        err.statusCode.should.equal 302




    describe 'with supported and rearranged response_type', ->

      supportedResponseTypes = settings.response_types_supported

      before (done) ->
        settings.response_types_supported = [
          'code',
          'id_token token',
          'code id_token token'
        ]

        request =
          connectParams:
            redirect_uri: 'https://redirect.uri'
            response_type: 'code token id_token'
            scope: 'openid'
            nonce: 'nonce'
          client:
            response_types: [ 'code id_token token' ]

        validateAuthorizationParams request, res, (error) ->
          err = error
          done()

      after ->
        settings.response_types_supported = supportedResponseTypes

      it 'should not provide an error', ->
        expect(err).to.not.be.ok




    describe 'with unsupported response_mode', ->

      before (done) ->
        params =
          redirect_uri: 'https://redirect.uri'
          response_type: 'code'
          response_mode: 'unsupported'

        validateAuthorizationParams req(params), res, (error) ->
          err = error
          done()

      it 'should provide an AuthorizationError', ->
        err.name.should.equal 'AuthorizationError'

      it 'should provide an error code', ->
        err.error.should.equal 'unsupported_response_mode'

      it 'should provide an error description', ->
        err.error_description.should.equal 'Unsupported response mode'

      it 'should provide a redirect_uri', ->
        err.redirect_uri.should.equal 'https://redirect.uri'

      it 'should provide a status code', ->
        err.statusCode.should.equal 302




    describe 'with missing scope', ->

      before (done) ->
        params =
          redirect_uri: 'https://redirect.uri'
          response_type: 'code'
          client_id: 'uuid'

        validateAuthorizationParams req(params), res, (error) ->
          err = error
          done()

      it 'should provide an AuthorizationError', ->
        err.name.should.equal 'AuthorizationError'

      it 'should provide an error code', ->
        err.error.should.equal 'invalid_scope'

      it 'should provide an error description', ->
        err.error_description.should.equal 'Missing scope'

      it 'should provide a redirect_uri', ->
        err.redirect_uri.should.equal 'https://redirect.uri'

      it 'should provide a status code', ->
        err.statusCode.should.equal 302




    describe 'with missing or malformed "openid" scope', ->

      before (done) ->
        params =
          redirect_uri: 'https://redirect.uri'
          response_type: 'code'
          client_id: 'uuid'
          scope: 'openidinsufficient'

        validateAuthorizationParams req(params), res, (error) ->
          err = error
          done()

      it 'should provide an AuthorizationError', ->
        err.name.should.equal 'AuthorizationError'

      it 'should provide an error code', ->
        err.error.should.equal 'invalid_scope'

      it 'should provide an error description', ->
        err.error_description.should.equal 'Missing openid scope'

      it 'should provide a redirect_uri', ->
        err.redirect_uri.should.equal 'https://redirect.uri'

      it 'should provide a status code', ->
        err.statusCode.should.equal 302




  describe 'for implicit flow requests', ->

    describe 'with missing nonce', ->

      supportedResponseTypes = settings.response_types_supported

      before (done) ->
        settings.response_types_supported = [
          'code',
          'id_token token',
          'code id_token token'
        ]

        request =
          connectParams:
            redirect_uri: 'https://redirect.uri'
            response_type: 'id_token token'
            client_id: 'uuid'
            scope: 'openid'
          client:
            response_types: [ 'token id_token' ]

        validateAuthorizationParams request, res, (error) ->
          err = error
          done()

      after ->
        settings.response_types_supported = supportedResponseTypes

      it 'should provide an AuthorizationError', ->
        err.name.should.equal 'AuthorizationError'

      it 'should provide an error code', ->
        err.error.should.equal 'invalid_request'

      it 'should provide an error description', ->
        err.error_description.should.equal 'Missing nonce'

      it 'should provide a redirect_uri', ->
        err.redirect_uri.should.equal 'https://redirect.uri'

      it 'should provide a status code', ->
        err.statusCode.should.equal 302
