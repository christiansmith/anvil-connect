/* global process, Buffer */

/**
 * Module dependencies
 */

var client = require('../boot/redis').getClient()
var Modinha = require('modinha')
var Document = require('modinha-redis')
var User = require('./User')
var AuthorizationError = require('../errors/AuthorizationError')
var base64url = require('base64url')
var url = require('url')

/**
 * Client model
 */

var Client = Modinha.define('clients', {
  /**
   * Client Metadata
   *
   * http://openid.net/specs/openid-connect-registration-1_0.html#ClientMetadata
   *
   * Clients have metadata associated with their unique Client Identifier at the
   * Authorization Server. These can range from human-facing display strings, such
   * as a Client name, to items that impact the security of the protocol, such as
   * the list of valid redirect URIs.
   *
   * The Client Metadata values are used in two ways:
   *
   *   * as input values to registration requests, and
   *   * as output values in registration responses and read responses.
   *
   * These Client Metadata values are used by OpenID Connect:
   *
   * redirect_uris
   *    REQUIRED. Array of Redirection URI values used by the Client. One of these
   *    registered Redirection URI values MUST exactly match the redirect_uri
   *    parameter value used in each Authorization Request, with the matching
   *    performed as described in Section 6.2.1 of [RFC3986] (Simple String
   *    Comparison).
   */

  redirect_uris: {
    type: 'array',
    required: true,
    format: 'url',
    messages: {
      message: 'invalid_redirect_uri',
      format: 'Must contain valid URIs',
      conform: 'Must follow guidelines in OpenID Connect Registration 1.0 ' +
        'specification for client metadata'
    },
    trim: true,
    conform: function (value, instance) {
      var valid = true
      var inDevelopment = process.env.NODE_ENV === 'development' ||
        !process.env.NODE_ENV

      // Proceed with validation if there are redirect URIs defined
      if (Array.isArray(value)) {
        // Native clients
        if (
          instance.application_type === 'native'
        ) {
          // Check each redirect URI
          value.forEach(function (uri) {
            try {
              var parsedURI = url.parse(uri)

              // Native clients must register with http://localhost[:PORT]
              // Here, we check if they are not
              if (
                parsedURI.hostname !== 'localhost' ||
                parsedURI.protocol !== 'http:'
              ) {
                // If they don't, then they must use a custom scheme
                // Here, we check if they are not
                if (
                  parsedURI.protocol === 'https:' ||
                  parsedURI.protocol === 'http:'
                ) {
                  // Fail validation if the client has redirect URIs that are
                  // neither http://localhost[:PORT] or using a custom scheme
                  valid = false
                }
              }
            } catch (err) {
              // Fail validation in the unlikely event that URI cannot be parsed
              valid = false
            }
          })

        // Web clients with implicit grant type (not enforced in development)
        } else if (
          !inDevelopment &&
          Array.isArray(instance.grant_types) &&
          instance.grant_types.indexOf('implicit') !== -1
        ) {
          // Check each redirect URI
          value.forEach(function (uri) {
            try {
              var parsedURI = url.parse(uri)

              // Web clients must register with https and NOT with localhost
              // Here, we check if they don't obey this rule
              if (
                parsedURI.hostname === 'localhost' ||
                parsedURI.protocol !== 'https:'
              ) {
                // Fail validation
                valid = false
              }
            } catch (err) {
              // Fail validation in the unlikely event that URI cannot be parsed
              valid = false
            }
          })
        }
      }

      return valid
    }
  },

  /**
   * response_types
   *    OPTIONAL. JSON array containing a list of the OAuth 2.0 response_type
   *    values that the Client is declaring that it will restrict itself to
   *    using. If omitted, the default is that the Client will use only the code
   *    Response Type.
   */

  response_types: {
    type: 'array',
    required: true,
    default: ['code'],
    messages: {
      conform: 'Invalid response_type or insufficient grant_types defined ' +
        'for desired response_types'
    },
    conform: function (value, instance) {
      var valid = true

      // authorization_code grant type is default if grant_types are not defined
      var hasAuthorizationCodeGrant = true
      var hasImplicitGrant = false

      if (Array.isArray(instance.grant_types)) {
        hasAuthorizationCodeGrant =
          instance.grant_types.indexOf('authorization_code') !== -1

        hasImplicitGrant =
          instance.grant_types.indexOf('implicit') !== -1
      }

      // Proceed with validation if there are response types defined
      if (Array.isArray(value)) {
        // Check each response type
        value.forEach(function (responseTypeString) {
          var responseTypeSet = responseTypeString.split(' ')
          responseTypeSet.forEach(function (responseType) {
            if (
              // invalid response_type value
              ['code', 'id_token', 'token', 'none']
                .indexOf(responseType) === -1 ||
              // none response_type with other response_type values in the same
              // set, e.g. "none code"
              (responseType === 'none' && responseTypeSet.length !== 1) ||
              // code response_type but no authorization_code grant_type
              (responseType === 'code' && !hasAuthorizationCodeGrant) ||
              // id_token response_type but no implicit grant_type
              (responseType === 'id_token' && !hasImplicitGrant) ||
              // token response_type but no implicit grant_type
              (responseType === 'token' && !hasImplicitGrant)
            ) {
              // Fail validation
              valid = false
            }
          })
        })
      }

      return valid
    }
  },

  /**
   * grant_types
   *    OPTIONAL. JSON array containing a list of the OAuth 2.0 Grant Types that
   *    the Client is declaring that it will restrict itself to using. The Grant
   *    Type values used by OpenID Connect are:
   *
   *      * authorization_code: The Authorization Code Grant Type described in
   *        OAuth 2.0 Section 4.1.
   *      * implicit: The Implicit Grant Type described in OAuth 2.0 Section 4.2.
   *      * refresh_token: The Refresh Token Grant Type described in OAuth 2.0
   *        Section 6.
   *
   *    The following table lists the correspondence between response_type values
   *    that the Client will use and grant_type values that MUST be included in the
   *    registered grant_types list:
   *
   *      * code: authorization_code
   *      * id_token: implicit
   *      * token id_token: implicit
   *      * code id_token: authorization_code, implicit
   *      * code token: authorization_code, implicit
   *      * code token id_token: authorization_code, implicit
   *
   *    If omitted, the default is that the Client will use only the
   *    authorization_code Grant Type.
   */

  grant_types: {
    type: 'array',
    required: true,
    default: ['authorization_code'],
    enum: [
      'authorization_code',
      'implicit',
      'refresh_token',
      'client_credentials'
    ]
  },

  /**
   * application_type
   *      OPTIONAL. Kind of the application. The default, if omitted, is web. The
   *      defined values are native or web. Web Clients using the OAuth Implicit
   *      Grant Type MUST only register URLs using the https scheme as redirect_uris
   *      they MUST NOT use localhost as the hostname. Native Clients MUST only
   *      register redirect_uris using custom URI schemes or URLs using the http:
   *      scheme with localhost as the hostname. Authorization Servers MAY place
   *      additional constraints on Native Clients. Authorization Servers MAY reject
   *      Redirection URI values using the http scheme, other than the localhost case
   *      for Native Clients. The Authorization Server MUST verify that all the
   *      registered redirect_uris conform to these constraints. This prevents
   *      sharing a Client ID across different types of Clients.
   */

  application_type: {
    type: 'string',
    default: 'web',
    enum: [
      'web',
      'native',
      'service'
    ]
  },

  /**
   * contacts
   *      OPTIONAL. Array of e-mail addresses of people responsible for this
   *      Client. This might be used by some providers to enable a Web user
   *      interface to modify the Client information.
   */

  contacts: {
    type: 'array',
    format: 'email'
  },

  /**
   * client_name
   *    OPTIONAL. Name of the Client to be presented to the End-User. If desired,
   *    representation of this Claim in different languages and scripts is
   *    represented as described in Section 2.1.
   */

  client_name: {
    type: 'string'
  },

  /**
   * logo_uri
   *    OPTIONAL. URL that references a logo for the Client application. If
   *    present, the server SHOULD display this image to the End-User during
   *    approval. The value of this field MUST point to a valid image file. If
   *    desired, representation of this Claim in different languages and scripts
   *    is represented as described in Section 2.1.
   */

  logo_uri: {
    type: 'string',
    format: 'url'
  },

  /**
   * client_uri
   *    OPTIONAL. URL of the home page of the Client. The value of this field
   *    MUST point to a valid Web page. If present, the server SHOULD display
   *    this URL to the End-User in a followable fashion. If desired,
   *    representation of this Claim in different languages and scripts is
   *    represented as described in Section 2.1.
   */

  client_uri: {
    type: 'string',
    format: 'url'
  },

  /**
   *policy_uri
   *    OPTIONAL. URL that the Relying Party Client provides to the End-User to
   *    read about the how the profile data will be used. The value of this field
   *    MUST point to a valid web page. The OpenID Provider SHOULD display this
   *    URL to the End-User if it is given. If desired, representation of this
   *    Claim in different languages and scripts is represented as described in
   *    Section 2.1.
   */

  policy_uri: {
    type: 'string',
    format: 'url'
  },

  /**
   * tos_uri
   *    OPTIONAL. URL that the Relying Party Client provides to the End-User to
   *    read about the Relying Party's terms of service. The value of this field
   *    MUST point to a valid web page. The OpenID Provider SHOULD display this
   *    URL to the End-User if it is given. If desired, representation of this
   *    Claim in different languages and scripts is represented as described in
   *    Section 2.1.
   */

  tos_uri: {
    type: 'string',
    format: 'url'
  },

  /**
   * jwks_uri
   *    OPTIONAL. URL for the Client's JSON Web Key Set [JWK] document. If the
   *    Client signs requests to the Server, it contains the signing key(s) the
   *    Server uses to validate signatures from the Client. The JWK Set MAY also
   *    contain the Client's encryption keys(s), which are used by the Server to
   *    encrypt responses to the Client. When both signing and encryption keys
   *    are made available, a use (Key Use) parameter value is REQUIRED for all
   *    keys in the referenced JWK Set to indicate each key's intended usage.
   *    Although some algorithms allow the same key to be used for both
   *    signatures and encryption, doing so is NOT RECOMMENDED, as it is less
   *    secure. The JWK x5c parameter MAY be used to provide X.509
   *    representations of keys provided. When used, the bare key values MUST
   *    still be present and MUST match those in the certificate.
   */

  jwks_uri: {
    type: 'string',
    format: 'url',
    conform: function (value, instance) {
      return !(value && instance.jwks)
    },
    messages: {
      conform: 'Cannot use jwks_uri at the same time as jwks'
    }
  },

  /**
   * jwks
   *    OPTIONAL. Client's JSON Web Key Set [JWK] document, passed by value. The
   *    semantics of the jwk parameter are the same as the jwk_uri parameter,
   *    other than that The JWK Set is passed by value, rather than by reference.
   *    This parameter is intended only to be used by Clients that, for some
   *    reason, are unable to use the jwk_uri parameter, for instance, by native
   *    applications that might not have a location to host the contents of the JWK
   *    Set. If a Client can use jwk_uri, it MUST NOT use jwk. One significant
   *    downside of jwk is that it does not enable key rotation (which jwk_uri
   *    does, as described in Section 10 of OpenID Connect Core 1.0
   *    [OpenID.Core]). The jwk_uri and jwk parameters MAY NOT be used together.
   */

  jwks: {
    type: 'string',
    conform: function (value, instance) {
      return !(value && instance.jwks_uri)
    },
    messages: {
      conform: 'Cannot use jwks at the same time as jwks_uri'
    }
  },

  /**
   * sector_identifier_uri
   *    OPTIONAL. URL using the https scheme to be used in calculating
   *    Pseudonymous Identifiers by the OP. The URL references a file with a
   *    single JSON array of redirect_uri values. Please see Section 5. Providers
   *    that use pairwise sub (subject) values SHOULD utilize the
   *    sector_identifier_uri value provided in the Subject Identifier
   *    calculation for pairwise identifiers.
   */

  sector_identifier_uri: {
    type: 'string',
    format: 'url'
  },

  /**
   * subject_type
   *    OPTIONAL. subject_type requested for responses to this Client. The
   *    subject_types_supported Discovery parameter contains a list of the
   *    supported subject_type values for this server. Valid types include
   *    pairwise and public.
   */

  subject_type: {
    type: 'string',
    enum: ['pairwise', 'public']
  },

  /**
   * id_token_signed_response_alg
   *    OPTIONAL. JWS alg algorithm [JWA] REQUIRED for signing the ID Token
   *    issued to this Client. The value none MUST NOT be used as the ID Token
   *    alg value unless the Client uses only Response Types that return no ID
   *    Token from the Authorization Endpoint (such as when only using the
   *    Authorization Code Flow). The default, if omitted, is RS256. The
   *    public key for validating the signature is provided by retrieving the JWK
   *    Set referenced by the jwks_uri element from OpenID Connect Discovery 1.0
   *    [OpenID.Discovery].
   */

  id_token_signed_response_alg: {
    type: 'string'
  },

  /**
   * id_token_encrypted_response_alg
   *    OPTIONAL. JWE alg algorithm [JWA] REQUIRED for encrypting the ID Token
   *    issued to this Client. If this is requested, the response will be signed
   *    then encrypted, with the result being a Nested JWT, as defined in [JWT].
   *    The default, if omitted, is that no encryption is performed.
   */

  id_token_encrypted_response_alg: {
    type: 'string'
  },

  /**
   * id_token_encrypted_response_enc
   *    OPTIONAL. JWE enc algorithm [JWA] REQUIRED for encrypting the ID Token
   *    issued to this Client. If id_token_encrypted_response_alg is specified,
   *    the default for this value is A128CBC-HS256. When
   *    id_token_encrypted_response_enc is included,
   *    id_token_encrypted_response_alg MUST also be provided.
   */

  id_token_encrypted_response_enc: {
    type: 'string'
  },

  /**
   * userinfo_signed_response_alg
   *    OPTIONAL. JWS alg algorithm [JWA] REQUIRED for signing UserInfo
   *    Responses. If this is specified, the response will be JWT [JWT]
   *    serialized, and signed using JWS. The default, if omitted, is for the
   *    UserInfo Response to return the Claims as a UTF-8 encoded JSON object
   *    using the application/json content-type.
   */

  userinfo_signed_response_alg: { type: 'string' },

  /**
   * userinfo_encrypted_response_alg
   *    OPTIONAL. JWE [JWE] alg algorithm [JWA] REQUIRED for encrypting UserInfo
   *    Responses. If both signing and encryption are requested, the response
   *    will be signed then encrypted, with the result being a Nested JWT, as
   *    defined in [JWT]. The default, if omitted, is that no encryption is
   *    performed.
   */

  userinfo_encrypted_response_alg: { type: 'string' },

  /**
   * userinfo_encrypted_response_enc
   *    OPTIONAL. JWE enc algorithm [JWA] REQUIRED for encrypting UserInfo
   *    Responses. If userinfo_encrypted_response_alg is specified, the default
   *    for this value is A128CBC-HS256. When userinfo_encrypted_response_enc is
   *    included, userinfo_encrypted_response_alg MUST also be provided.
   */

  userinfo_encrypted_response_enc: {
    type: 'string'
  },

  /**
   * request_object_signing_alg
   *    OPTIONAL. JWS [JWS] alg algorithm [JWA] that MUST be used for signing
   *    Request Objects sent to the OP. All Request Objects from this Client MUST
   *    be rejected, if not signed with this algorithm. Request Objects are
   *    described in Section 6.1 of OpenID Connect Core 1.0 [OpenID.Core]. This
   *    algorithm MUST be used both when the Request Object is passed by value
   *    (using the request parameter) and when it is passed by reference (using
   *    the request_uri parameter). Servers SHOULD support RS256. The value
   *    none MAY be used. The default, if omitted, is that any algorithm
   *    supported by the OP and the RP MAY be used.
   */

  request_object_signing_alg: {
    type: 'string'
  },

  /**
   * request_object_encryption_alg
   *    OPTIONAL. JWE [JWE] alg algorithm [JWA] the RP is declaring that it may
   *    use for encrypting Request Objects sent to the OP. This parameter SHOULD
   *    be included when symmetric encryption will be used, since this signals to
   *    the OP that a client_secret value needs to be returned from which the
   *    symmetric key will be derived, that might not otherwise be returned. The
   *    RP MAY still use other supported encryption algorithms or send
   *    unencrypted Request Objects, even when this parameter is present. If both
   *    signing and encryption are requested, the Request Object will be signed
   *    then encrypted, with the result being a Nested JWT, as defined in [JWT].
   *    The default, if omitted, is that the RP is not declaring whether it might
   *    encrypt any Request Objects.
   */

  request_object_encryption_alg: {
    type: 'string'
  },

  /**
   * request_object_encryption_enc
   *    OPTIONAL. JWE enc algorithm [JWA] the RP is declaring that it may use for
   *    encrypting Request Objects sent to the OP. If
   *    request_object_encryption_alg is specified, the default for this value is
   *    A128CBC-HS256. When request_object_encryption_enc is included,
   *    request_object_encryption_alg MUST also be provided.
   */

  request_object_encryption_enc: {
    type: 'string'
  },

  /**
   * token_endpoint_auth_method
   *    OPTIONAL. Requested Client Authentication method for the Token Endpoint.
   *    The options are client_secret_post, client_secret_basic,
   *    client_secret_jwt, private_key_jwt, and none, as described in Section 9 of
   *    OpenID Connect Core 1.0 [OpenID.Core]. Other authentication methods MAY be
   *    defined by extensions. If omitted, the default is client_secret_basic --
   *    the HTTP Basic Authentication Scheme specified in Section 2.3.1 of OAuth
   *    2.0 [RFC6749].
   */

  token_endpoint_auth_method: {
    type: 'string',
    enum: [
      'client_secret_basic',
      'client_secret_post',
      'client_secret_jwt',
      'private_key_jwt'
    // 'none'
    ],
    default: 'client_secret_basic'
  },

  /**
   * token_endpoint_auth_signing_alg
   *    OPTIONAL. JWS [JWS] alg algorithm [JWA] that MUST be used for signing the
   *    JWT [JWT] used to authenticate the Client at the Token Endpoint for the
   *    private_key_jwt and client_secret_jwt authentication methods. All Token
   *    Requests using these authentication methods from this Client MUST be
   *    rejected, if the JWT is not signed with this algorithm. Servers SHOULD
   *    support RS256. The value none MUST NOT be used. The default, if omitted,
   *    is that any algorithm supported by the OP and the RP MAY be used.
   */

  token_endpoint_auth_signing_alg: {
    type: 'string'
  },

  /**
   * default_max_age
   *    OPTIONAL. Default Maximum Authentication Age. Specifies that the End-User
   *    MUST be actively authenticated if the End-User was authenticated longer
   *    ago than the specified number of seconds. The max_age request parameter
   *    overrides this default value. If omitted, no default Maximum
   *    Authentication Age is specified.
   */

  default_max_age: {
    type: 'number'
  },

  /**
   * require_auth_time
   *    OPTIONAL. Boolean value specifying whether the auth_time Claim in the ID
   *    Token is REQUIRED. It is REQUIRED when the value is true. (If this is
   *    false, the auth_time Claim can still be dynamically requested as an
   *    individual Claim for the ID Token using the claims request parameter
   *    described in Section 5.5.1 of OpenID Connect Core 1.0 [OpenID.Core].)
   *    If omitted, the default value is false.
   */

  require_auth_time: {
    type: 'boolean'
  },

  /**
   * default_acr_values
   *    OPTIONAL. Default requested Authentication Context Class Reference
   *    values. Array of strings that specifies the default acr values that the
   *    OP is being requested to use for processing requests from this Client,
   *    with the values appearing in order of preference. The Authentication Context
   *    Class satisfied by the authentication performed is returned as the acr
   *    Claim Value in the issued ID Token. The acr Claim is requested as a
   *    Voluntary Claim by this parameter. The acr_values_supported discovery
   *    element contains a list of the supported acr values supported by this
   *    server. Values specified in the acr_values request parameter or an
   *    individual acr Claim request override these default values.
   */

  default_acr_values: {
    type: 'array'
  },

  /**
   * initiate_login_uri
   *    OPTIONAL. URI using the https scheme that a third party can use to
   *    initiate a login by the RP, as specified in Section 4 of OpenID Connect
   *    Core 1.0 [OpenID.Core]. The URI MUST accept requests via both GET and
   *    POST. The Client MUST understand the login_hint and iss parameters and
   *    SHOULD support the target_link_uri parameter.
   */

  initiate_login_uri: {
    type: 'string',
    format: 'url'
  },

  /**
   * request_uris
   *    OPTIONAL. Array of request_uri values that are pre-registered by the RP
   *    for use at the OP. Servers MAY cache the contents of the files referenced
   *    by these URIs and not retrieve them at the time they are used in a
   *    request. OPs can require that request_uri values used be
   *    pre-registered with the require_request_uri_registration discovery
   *    parameter.
   *    If the contents of the request file could ever change, these URI values
   *    SHOULD include the base64url encoded SHA-256 hash value of the file
   *    contents referenced by the URI as the value of the URI fragment. If the
   *    fragment value used for a URI changes, that signals the server that its
   *    cached value for that URI with the old fragment value is no longer valid.
   */

  request_uris: {
    type: 'array',
    format: 'url'
  },

  /**
   * Additional Client Metadata parameters MAY also be used. Some are defined by
   * other specifications, such as OpenID Connect Session Management 1.0
   * [OpenID.Session].
   */

  /**
   * OpenID Connect Session Management 1.0
   * Client Registration Metadata
   *
   * http://openid.net/specs/openid-connect-session-1_0.html#ClientMetadata
   *
   * This Client Metadata parameter MAY be included in the Client's Registration
   * information when Session Management and Dynamic Registration are supported:
   *
   * post_logout_redirect_uris
   *     OPTIONAL. Array of URLs supplied by the RP to which it MAY request that
   *     the End-User's User Agent be redirected using the post_logout_redirect_uri
   *     parameter after a logout has been performed.
   */

  post_logout_redirect_uris: {
    type: 'array',
    format: 'url',
    message: 'invalid_post_logout_redirect_uri',
    messages: {
      format: 'Must contain valid URIs'
    }
  },

  /**
   * client_secret
   */

  client_secret: {
    type: 'string',
    default: Modinha.defaults.random(10)
  },

  /**
   * Anvil Connect specific properties
   */

  /**
   * trusted_client
   *    Flag that indicates whether or not the client is within the sercurity
   *    realm of the authorization server. This can be used to suppress the user-
   *    consent prompt when the Relying Party is owned by the owner of the
   *    authorization server.
   */

  trusted: {
    type: 'boolean',
    default: false,
    secondary: true
  },

  /**
   * default_client_scope
   *    Property used to specify default scope for client access tokens issued
   *    by the /token endpoint during "client_credentials" grant.
   *    (Two-legged OAuth)
   */

  default_client_scope: {
    type: 'string'
  },

  /**
   * user_id
   *    The UUID of the user who registered the client.
   */

  userId: {
    type: 'string',
    reference: User
  },

  /**
   * origins
   *    List of URIs for this client from which requests to the authorization
   *    server can originate.
   */

  origins: {
    type: 'array',
    format: 'url'
  },

  /**
   * scopes
   *    List of user-authorized scopes required to display this client at the
   *    applications endpoint.
   *
   *    In the future, this value may be used to restrict users from signing into
   *    clients they have no permissions for.
   */

  scopes: {
    type: 'array',
    default: []
  }

})

/**
 * Document persistence
 */

Client.extend(Document)
Client.__client = client

/**
 * Client intersections
 */

Client.intersects('roles')

/**
 * Authorized scope
 */

Client.prototype.authorizedScope = function (callback) {
  var client = Client.__client

  client.zrange('clients:' + this._id + ':roles', 0, -1, function (err, roles) {
    if (err) { return callback(err) }

    if (!roles || roles.length === 0) {
      return callback(null, [])
    }

    var multi = client.multi()

    roles.forEach(function (role) {
      multi.zrange('roles:' + role + ':scopes', 0, -1)
    })

    multi.exec(function (err, results) {
      if (err) { return callback(err) }
      
      if (!results || results.length === 0) {
        return callback(null, [])
      }

      callback(null, results.map(function (result) {
        return result[1][0]
      }))
    })
  })
}

/**
 * Authorized by user
 */

Client.listAuthorizedByUser = function (userId, options, callback) {
  if (!callback) {
    callback = options
    options = {}
  }

  options.index = 'users:' + userId + ':clients'
  options.select = [
    '_id',
    'client_name',
    'client_uri',
    'logo_uri',
    'trusted'
  ]

  Client.list(options, function (err, clients) {
    if (err) { return callback(err) }
    callback(null, clients)
  })
}

/**
 * Mappings
 */

Client.mappings.registration = {
  _id: 'client_id',
  client_secret: 'client_secret',
  client_name: 'client_name',
  logo_uri: 'logo_uri',
  contacts: 'contacts',
  token_endpoint_auth_method: 'token_endpoint_auth_method',
  application_type: 'application_type',
  redirect_uris: 'redirect_uris',
  request_uris: 'request_uris',
  created: 'client_id_issued_at'
}

/**
 * Client Configuration
 */

Client.prototype.configuration = function (settings, token) {
  var configuration = this.project('registration')
  var registrationClientUri = settings.issuer + '/register/' + this._id

  configuration.registration_client_uri = registrationClientUri

  if (token) {
    configuration.registration_access_token = token
  }

  return configuration
}

/**
 * Authenticate
 */

Client.authenticate = function (req, callback) {
  var method

  // Use HTTP Basic Authentication Method
  if (req.headers && req.headers.authorization) {
    method = 'client_secret_basic'
  }

  // Use HTTP Post Authentication Method
  if (req.body && req.body.client_secret) {
    // Fail if multiple authentication methods are attempted
    if (method) {
      return callback(new AuthorizationError({
        error: 'unauthorized_client',
        error_description: 'Must use only one authentication method',
        statusCode: 400
      }))
    }

    method = 'client_secret_post'
  }

  // Use Client JWT Authentication Method
  if (req.body && req.body.client_assertion_type) {
    var type = 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer'

    // Fail if multiple authentication methods are attempted
    if (method) {
      return callback(new AuthorizationError({
        error: 'unauthorized_client',
        error_description: 'Must use only one authentication method',
        statusCode: 400
      }))
    }

    // Invalid client assertion type
    if (req.body.client_assertion_type !== type) {
      return callback(new AuthorizationError({
        error: 'unauthorized_client',
        error_description: 'Invalid client assertion type',
        statusCode: 400
      }))
    }

    // Missing client assertion
    if (!req.body.client_assertion) {
      return callback(new AuthorizationError({
        error: 'unauthorized_client',
        error_description: 'Missing client assertion',
        statusCode: 400
      }))
    }

    method = 'client_secret_jwt'
  }

  // Missing authentication parameters
  if (!method) {
    return callback(new AuthorizationError({
      error: 'unauthorized_client',
      error_description: 'Missing client credentials',
      statusCode: 400
    }))
  }

  // Apply the appropriate authentication method
  authenticators[method](req, callback)
}

/**
 *
 */

var authenticators = {
  /**
   * HTTP Basic Authentication w/client_id and client_secret
   */

  'client_secret_basic': function (req, callback) {
    var authorization = req.headers.authorization.split(' ')
    var scheme = authorization[0]
    var credentials = Buffer.from(authorization[1], 'base64')
      .toString('ascii')
      .split(':')
    var clientId = credentials[0]
    var clientSecret = credentials[1]

    // malformed credentials
    if (credentials.length !== 2) {
      return callback(new AuthorizationError({
        error: 'unauthorized_client',
        error_description: 'Malformed HTTP Basic credentials',
        statusCode: 400
      }))
    }

    // invalid authorization scheme
    if (!/^Basic$/i.test(scheme)) {
      return callback(new AuthorizationError({
        error: 'unauthorized_client',
        error_description: 'Invalid authorization scheme',
        statusCode: 400
      }))
    }

    // missing credentials
    if (!clientId || !clientSecret) {
      return callback(new AuthorizationError({
        error: 'unauthorized_client',
        error_description: 'Missing client credentials',
        statusCode: 400
      }))
    }

    Client.get(clientId, function (err, client) {
      if (err) { return callback(err) }

      // Unknown client
      if (!client) {
        return callback(new AuthorizationError({
          error: 'unauthorized_client',
          error_description: 'Unknown client identifier',
          statusCode: 401
        }))
      }

      // Mismatching secret
      if (client.client_secret !== clientSecret) {
        return callback(new AuthorizationError({
          error: 'unauthorized_client',
          error_description: 'Mismatching client secret',
          statusCode: 401
        }))
      }

      callback(null, client)
    })
  },

  /**
   * HTTP POST body authentication
   */

  'client_secret_post': function (req, callback) {
    var params = req.body
    var clientId = params.client_id
    var clientSecret = params.client_secret

    // missing credentials
    if (!clientId || !clientSecret) {
      return callback(new AuthorizationError({
        error: 'unauthorized_client',
        error_description: 'Missing client credentials',
        statusCode: 400
      }))
    }

    Client.get(clientId, function (err, client) {
      if (err) { return callback(err) }

      // Unknown client
      if (!client) {
        return callback(new AuthorizationError({
          error: 'unauthorized_client',
          error_description: 'Unknown client identifier',
          statusCode: 401
        }))
      }

      // Mismatching secret
      if (client.client_secret !== clientSecret) {
        return callback(new AuthorizationError({
          error: 'unauthorized_client',
          error_description: 'Mismatching client secret',
          statusCode: 401
        }))
      }

      callback(null, client)
    })
  },

  'client_secret_jwt': function (req, callback) {
    // peek at the JWT body to get the sub
    var jwt = req.body.client_assertion
    var payloadB64u = jwt.split('.')[1]
    var payload = JSON.parse(base64url.decode(payloadB64u))

    if (!payload || !payload.sub) {
      return callback(new AuthorizationError({
        error: 'unauthorized_client',
        error_description: 'Cannot extract client id from JWT',
        statusCode: 400
      }))
    }

    Client.get(payload.sub, function (err, client) {
      if (err) { return callback(err) }

      if (!client) {
        return callback(new AuthorizationError({
          error: 'unauthorized_client',
          error_description: 'Unknown client identifier',
          statusCode: 400
        }))
      }

      if (!client.client_secret) {
        return callback(new AuthorizationError({
          error: 'unauthorized_client',
          error_description: 'Missing client secret',
          statusCode: 400
        }))
      }

      var token // = ClientSecretToken.decode(jwt, client.client_secret)

      if (!token || token instanceof Error) {
        return callback(new AuthorizationError({
          error: 'unauthorized_client',
          error_description: 'Invalid client JWT',
          statusCode: 400
        }))
      }

      // TODO: validate the payload

      callback(null, client, token)
    })
  }

  // 'private_key_jwt': function () {},

// 'none': function () {}
}

/**
 * Exports
 */

module.exports = Client
