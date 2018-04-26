/* global process, __dirname */

/**
 * Module dependencies
 */

var cwd = process.cwd()
var env = process.env.NODE_ENV || 'development'
var crypto = require('crypto')
var path = require('path')
var keys = require(path.join(__dirname, 'keys'))
var pkg = require(path.join(__dirname, '..', 'package.json'))
var config = path.join(cwd, 'config', env + '.json')
var settings = {}

/**
 * Load config
 */

try {
  config = require(config)
} catch (e) {
  if (env !== 'test') {
    console.log('Cannot load ' + env + ' configuration')
    process.exit(1)
  } else {
    config = {
      issuer: 'http://localhost:3000',
      cookie_secret: crypto.randomBytes(64).toString('hex'),
      session_secret: crypto.randomBytes(64).toString('hex')
    }
  }
}

/**
 * Anvil Connect Version
 */

settings.version = pkg.version

/**
 * Server Port
 */

settings.port = process.env.PORT || settings.port || 3000

/**
 * client_registration
 *    Anvil Connect supports dynamic registration as well as registration
 *    restricted to bearers of valid access tokens. Registration can be
 *    further restricted by requiring a token to have specific scope.
 *    `client_registration` can be set to `dynamic`, `token`, or `scoped`.
 */

settings.client_registration = 'scoped'

/**
 * trusted_registration_scope
 *    Anvil Connect supports "trusted" clients that operate within the same
 *    security realm as the authorization server. Registration of trusted
 *    clients requires privileged access via scope. The default value can be
 *    overridden if required.
 */

settings.trusted_registration_scope = 'realm'

/**
 * providers
 */

settings.providers = {}

/**
 * OpenID Provider Metadata Default Values
 * http://openid.net/specs/openid-connect-discovery-1_0.html#ProviderMetadata
 *
 * OpenID Providers have metadata describing their configuration. These
 * OpenID Provider Metadata values are used by OpenID Connect:
 */

/**
 * response_types_supported
 *    REQUIRED. JSON array containing a list of the OAuth 2.0 response_type
 *    values that this OP supports. Dynamic OpenID Providers MUST support the
 *    code, id_token, and the token id_token Response Type values.
 */

settings.response_types_supported = [
  'code',
  'code token',
  'code id_token',
  'id_token',
  'id_token token',
  'code id_token token',
  'none'
]

/**
 * response_modes_supported
 *    OPTIONAL. JSON array containing a list of the OAuth 2.0 response_mode
 *    values that this OP supports, as specified in OAuth 2.0 Multiple Response
 *    Type Encoding Practices [OAuth.Responses]. If omitted, the default for
 *    Dynamic OpenID Providers is ["query", "fragment"].
 */

settings.response_modes_supported = [
  'query',
  'fragment',
  'form_post'
]

/**
 * grant_types_supported
 *    OPTIONAL. JSON array containing a list of the OAuth 2.0 Grant Type values
 *    that this OP supports. Dynamic OpenID Providers MUST support the
 *    authorization_code and implicit Grant Type values and MAY support other
 *    Grant Types. If omitted, the default value is ["authorization_code",
 *    "implicit"].
 */

settings.grant_types_supported = [
  'authorization_code',
  'implicit',
  'refresh_token',
  'client_credentials'
]

/**
 * acr_values_supported
 *    OPTIONAL. JSON array containing a list of the Authentication Context Class
 *    References that this OP supports.
 */

settings.acr_values_supported = [
  // TODO
]

/**
 * subject_types_supported
 *    REQUIRED. JSON array containing a list of the Subject Identifier types
 *    that this OP supports. Valid types include pairwise and public.
 */

settings.subject_types_supported = [
  // TODO
  // 'pairwise',
  'public'
]

/**
 * id_token_signing_alg_values_supported
 *   REQUIRED. JSON array containing a list of the JWS signing algorithms (alg
 *   values) supported by the OP for the ID Token to encode the Claims in a JWT
 *   [JWT]. The algorithm RS256 MUST be included. The value none MAY be
 *   supported, but MUST NOT be used unless the Response Type used returns no
 *   ID Token from the Authorization Endpoint (such as when using the
 *   Authorization Code Flow).
 */

settings.id_token_signing_alg_values_supported = [
  'RS256'
]

/**
 * id_token_encryption_alg_values_supported
 *    OPTIONAL. JSON array containing a list of the JWE encryption algorithms
 *    (alg values) supported by the OP for the ID Token to encode the Claims in
 *    a JWT [JWT].
 */

settings.id_token_encryption_alg_values_supported = [
  // TODO
]

/**
 * id_token_encryption_enc_values_supported
 *   OPTIONAL. JSON array containing a list of the JWE encryption algorithms
 *   (enc values) supported by the OP for the ID Token to encode the Claims in
 *   a JWT [JWT].
 */

settings.id_token_encryption_enc_values_supported = [
  // TODO
]

/**
 * userinfo_signing_alg_values_supported
 *   OPTIONAL. JSON array containing a list of the JWS [JWS] signing algorithms
 *   (alg values) [JWA] supported by the UserInfo Endpoint to encode the Claims
 *   in a JWT [JWT]. The value none MAY be included.
 */

settings.userinfo_signing_alg_values_supported = [
  // TODO
  'none'
]

/**
 * userinfo_encryption_alg_values_supported
 *   OPTIONAL. JSON array containing a list of the JWE [JWE] encryption
 *   algorithms (alg values) [JWA] supported by the UserInfo Endpoint to encode
 *   the Claims in a JWT [JWT].
 */

settings.userinfo_encryption_alg_values_supported = [
  // TODO
]

/**
 * userinfo_encryption_enc_values_supported
 *   OPTIONAL. JSON array containing a list of the JWE encryption algorithms
 *   (enc values) [JWA] supported by the UserInfo Endpoint to encode the Claims
 *   in a JWT [JWT].
 */

settings.userinfo_encryption_enc_values_supported = [
  // TODO
]

/**
 * request_object_signing_alg_values_supported
 *   OPTIONAL. JSON array containing a list of the JWS signing algorithms (alg
 *   values) supported by the OP for Request Objects, which are described in
 *   Section 6.1 of OpenID Connect Core 1.0 [OpenID.Core]. These algorithms are
 *   used both when the Request Object is passed by value (using the request
 *   parameter) and when it is passed by reference (using the request_uri
 *   parameter). Servers SHOULD support none and RS256.
 */

settings.request_object_signing_alg_values_supported = [
  // TODO
]

/**
 * request_object_encryption_alg_values_supported
 *   OPTIONAL. JSON array containing a list of the JWE encryption algorithms
 *   (alg values) supported by the OP for Request Objects. These algorithms are
 *   used both when the Request Object is passed by value and when it is passed
 *   by reference.
 */

settings.request_object_encryption_alg_values_supported = [
  // TODO
]

/**
 * request_object_encryption_enc_values_supported
 *   OPTIONAL. JSON array containing a list of the JWE encryption algorithms
 *   (enc values) supported by the OP for Request Objects. These algorithms are
 *   used both when the Request Object is passed by value and when it is passed
 *   by reference.
 */

settings.request_object_encryption_enc_values_supported = [
  // TODO
]

/**
 * token_endpoint_auth_methods_supported
 *   OPTIONAL. JSON array containing a list of Client Authentication methods
 *   supported by this Token Endpoint. The options are client_secret_post,
 *   client_secret_basic, client_secret_jwt, and private_key_jwt, as described
 *   in Section 9 of OpenID Connect Core 1.0 [OpenID.Core]. Other
 *   authentication methods MAY be defined by extensions. If omitted, the
 *   default is client_secret_basic -- the HTTP Basic Authentication Scheme
 *   specified in Section 2.3.1 of OAuth 2.0 [RFC6749].
 */

settings.token_endpoint_auth_methods_supported = [
  'client_secret_basic',
  'client_secret_post'
// 'client_secret_jwt',
// 'private_key_jwt',
// 'none'
]

/**
 * token_endpoint_auth_signing_alg_values_supported
 *   OPTIONAL. JSON array containing a list of the JWS signing algorithms (alg
 *   values) supported by the Token Endpoint for the signature on the JWT [JWT]
 *   used to authenticate the Client at the Token Endpoint for the
 *   private_key_jwt and client_secret_jwt authentication methods. Servers
 *   SHOULD support RS256. The value none MUST NOT be used.
 */

settings.token_endpoint_auth_signing_alg_values_supported = [
  // 'RS256'
]

/**
 * display_values_supported
 *   OPTIONAL. JSON array containing a list of the display parameter values
 *   that the OpenID Provider supports. These values are described in Section
 *   3.1.2.1 of OpenID Connect Core 1.0 [OpenID.Core].
 */

settings.display_values_supported = [
  // TODO
]

/**
 * claim_types_supported
 *   OPTIONAL. JSON array containing a list of the Claim Types that the OpenID
 *   Provider supports. These Claim Types are described in Section 5.6 of
 *   OpenID Connect Core 1.0 [OpenID.Core]. Values defined by this
 *   specification are normal, aggregated, and distributed. If omitted, the
 *   implementation supports only normal Claims.
 */

settings.claim_types_supported = [
  'normal'
]

/**
 * claims_supported
 *   RECOMMENDED. JSON array containing a list of the Claim Names of the Claims
 *   that the OpenID Provider MAY be able to supply values for. Note that for
 *   privacy or other reasons, this might not be an exhaustive list.
 */

settings.claims_supported = [
  'iss',
  'sub',
  'aud',
  'acr',
  'name',
  'given_name',
  'family_name',
  'middle_name',
  'nickname',
  'preferred_username',
  'profile',
  'picture',
  'website',
  'email',
  'email_verified',
  'zoneinfo',
  'locale',
  'joined_at',
  'updated_at'
]

/**
 * service_documentation
 *   OPTIONAL. URL of a page containing human-readable information that
 *   developers might want or need to know when using the OpenID Provider. In
 *   particular, if the OpenID Provider does not support Dynamic Client
 *   Registration, then information on how to register Clients needs to be
 *   provided in this documentation.
 */

settings.service_documentation = 'http://anvil.io/docs/connect/'

/**
 * claims_locales_supported
 *   OPTIONAL. Languages and scripts supported for values in Claims being
 *   returned, represented as a JSON array of BCP47 [RFC5646] language tag
 *   values. Not all languages and scripts are necessarily supported for all
 *   Claim values.
 */

settings.claims_locales_supported = [
  // TODO
]

/**
 * ui_locales_supported
 *   OPTIONAL. Languages and scripts supported for the user interface,
 *   represented as a JSON array of BCP47 [RFC5646] language tag values.
 */

settings.ui_locales_supported = [
  // TODO
]

/**
 * claims_parameter_supported
 *   OPTIONAL. Boolean value specifying whether the OP supports use of the
 *   claims parameter, with true indicating support. If omitted, the default
 *   value is false.
 */

settings.claims_parameter_supported = false

/**
 * request_parameter_supported
 *   OPTIONAL. Boolean value specifying whether the OP supports use of the
 *   request parameter, with true indicating support. If omitted, the default
 *   value is false.
 */

settings.request_parameter_supported = false

/**
 * request_uri_parameter_supported
 *   OPTIONAL. Boolean value specifying whether the OP supports use of the
 *   request_uri parameter, with true indicating support. If omitted, the
 *   default value is true.
 */

settings.request_uri_parameter_supported = false

/**
 * request_request_uri_registration
 *   OPTIONAL. Boolean value specifying whether the OP requires any request_uri
 *   values used to be pre-registered using the request_uris registration
 *   parameter. Pre-registration is REQUIRED when the value is true. If
 *   omitted, the default value is false.
 */

settings.require_request_uri_registration = false

/**
 * op_policy_uri
 *   OPTIONAL. URL that the OpenID Provider provides to the person registering
 *   the Client to read about the OP's requirements on how the Relying Party
 *   can use the data provided by the OP. The registration process SHOULD
 *   display this URL to the person registering the Client if it is given.
 */

settings.op_policy_uri = undefined

/**
 * op_tos_uri
 *   OPTIONAL. URL that the OpenID Provider provides to the person registering
 *   the Client to read about OpenID Provider's terms of service. The
 *   registration process SHOULD display this URL to the person registering the
 *   Client if it is given.
 */

settings.op_tos_uri = undefined

/**
 * refresh_token_bytes_range
 *   Define the range of random bytes used to generate the refresh_token
 *   with crypto.randomBytes
 */

settings.refresh_token_bytes_range = 10

/**
 * Load config file settings and override defaults
 */

Object.keys(config).forEach(function (key) {
  settings[key] = config[key]
})

/**
 * Key pairs and JWK sets
 */

settings.keys = keys

/**
 * Required Configuration Values
 */

/**
 * issuer
 *   REQUIRED. URL using the https scheme with no query or fragment component
 *   that the OP asserts as its Issuer Identifier. If Issuer discovery is
 *   supported (see Section 2), this value MUST be identical to the issuer
 *   value returned by WebFinger. This also MUST be identical to the iss Claim
 *   value in ID Tokens issued from this Issuer.
 */

if (!settings.issuer) {
  throw new Error('Issuer must be configured')
}

/**
 * Always enable password provider
 *
 * Authority users always need to be able to sign in to administer the server
 */

if (!settings.providers.password) {
  settings.providers.password = {
    hidden: true,
    allowRoles: [ 'authority' ]
  }
} else if (settings.providers.password.allowRoles) {
  if (settings.providers.password.allowRoles.indexOf('authority') === -1) {
    settings.providers.password.allowRoles.push('authority')
  }
}

/**
 * Config-file dependenct settings
 */

var issuer = settings.issuer

/**
 * authorization_endpoint
 *   REQUIRED. URL of the OP's OAuth 2.0 Authorization Endpoint [OpenID.Core].
 */

settings.authorization_endpoint = issuer + '/authorize'

/**
 * token_endpoint
 *   URL of the OP's OAuth 2.0 Token Endpoint [OpenID.Core]. This is REQUIRED
 *   unless only the Implicit Flow is used.
 */

settings.token_endpoint = issuer + '/token'

/**
 * userinfo_endpoint
 *   RECOMMENDED. URL of the OP's UserInfo Endpoint [OpenID.Core]. This URL
 *   MUST use the https scheme and MAY contain port, path, and query parameter
 *   components.
 */

settings.userinfo_endpoint = issuer + '/userinfo'

/**
 * jwks_uri
 *   REQUIRED. URL of the OP's JSON Web Key Set [JWK] document. This contains
 *   the signing key(s) the RP uses to validate signatures from the OP. The JWK
 *   Set MAY also contain the Server's encryption key(s), which are used by RPs
 *   to encrypt requests to the Server. When both signing and encryption keys
 *   are made available, a use (Key Use) parameter value is REQUIRED for all
 *   keys in the referenced JWK Set to indicate each key's intended usage.
 *   Although some algorithms allow the same key to be used for both signatures
 *   and encryption, doing so is NOT RECOMMENDED, as it is less secure. The JWK
 *   x5c parameter MAY be used to provide X.509 representations of keys
 *   provided. When used, the bare key values MUST still be present and MUST
 *   match those in the certificate.
 */

settings.jwks_uri = issuer + '/jwks'

/**
 * registration_endpoint
 *   RECOMMENDED. URL of the OP's Dynamic Client Registration Endpoint
 *   [OpenID.Registration].
 */

settings.registration_endpoint = issuer + '/register'

/**
 * scopes_supported
 *   RECOMMENDED. JSON array containing a list of the OAuth 2.0 [RFC6749] scope
 *   values that this server supports. The server MUST support the openid scope
 *   value. Servers MAY choose not to advertise some supported scope values
 *   even when this parameter is used, although those defined in [OpenID.Core]
 *   SHOULD be listed, if supported.
 *
 *   TODO: Should these be pulled from redis?
 */

settings.scopes_supported = ['openid', 'profile']

/**
 * OpenID Provider Discovery Metadata (Session)
 * http://openid.net/specs/openid-connect-session-1_0.html#OPMetadata
 *
 */

/**
 * check_session_iframe
 *   REQUIRED. URL of an OP iframe that supports cross-origin communications
 *   for session state information with the RP Client, using the HTML5
 *   postMessage API. The page is loaded from an invisible iframe embedded in
 *   an RP page so that it can run in the OP's security context. It accepts
 *   postMessage requests from the relevant RP iframe and uses postMessage to
 *   post back the login status of the End-User at the OP.
 */

settings.check_session_iframe = issuer + '/session'

/**
 * end_session_endpoint
 *   REQUIRED. URL at the OP to which an RP can perform a redirect to request
 *   that the End-User be logged out at the OP.
 */

settings.end_session_endpoint = issuer + '/signout'

/**
 * Exports
 */

module.exports = settings
