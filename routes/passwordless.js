/**
 * Module dependencies
 */

var express = require('express')
var _ = require('lodash')
var url = require('url')

var settings = require('../boot/settings')
var mailer = require('../boot/mailer')
var authenticator = require('../lib/authenticator')
var oidc = require('../oidc')
var User = require('../models/User')
var OneTimeToken = require('../models/OneTimeToken')
var InvalidRequestError = require('../errors/InvalidRequestError')
var PasswordlessDisabledError = require('../errors/PasswordlessDisabledError')
var renderSignin = require('../render/renderSignin')

/**
Passwordless

FLOW: Sign in and signup

POST route: /sigin
  In passwordless sign up starts exactly like sign in.
  There is a common flow to signin or signup, starting at /signin :

  1. User selects 'Sign in or sign up with your email' method, provides email
     and submits.

  2. Standard post /signin middleware is performed, such as
     verifyClient, validateAuthorizationParams an more.

  3. Passwordless configuration validations are done:
     verifyPasswordlessEnabled
     verifyMailerConfigured

  4. The input email is validated syntactically and errors are rendered
     to the sign in page.

  5. Check whether there is a user account for that email.
     Send link in either case with an id of a one time token
     expiring after 15 minutes by default.
     The token also captures parameters such as the email,
     redirect_uri, client_id, response_type, scope, nonce.

  5.1.A. Existing user:
     If user account exists email tells user to click and confirm
     that they want to sign in.
     Link to route /signin/passwordless?token=<token-id>
  5.1.B. New user:
    If new user email tells user to click the link if that want
    to create a new user account.
    Link to route /signup/passwordless?token=<token-id>

  5.2 Show page telling user to check their mail and that
   a link has been send. This page also allows to resend the email.

FLOW: New user sign up flow:

GET route: /signup/passwordless
  1. Verify token exists and is for passwordless signup.
  2. verifyClient, validateAuthorizationParams,
  3. verifyPasswordlessEnabled
  4. Issue a new token for subsequent account creation when form is
     submitted. This token has a longer expiration (1 day default).
  5. Renders signup form 'passwordless/pwlessSignup' for user to enter
     given_name and family_name.

POST route:
  1. Verify token exists and is for passwordless create new account.
  2. verifyClient, validateAuthorizationParams,
  3. verifyPasswordlessEnabled
  4. Create new user based on form data and email.
  5. Revoke token.
  [ Not done : Send welcome mail]
  6. login user
  7. Authorize user

FLOW: Existing user sign in flow:

GET route: /signin/passwordless
  1. Verify token exists and is for passwordless signup.
  2. verifyClient, validateAuthorizationParams,
  3. verifyPasswordlessEnabled
  4. update users verified email date.
  5. login user
  6. authorize user

*/

var TOKEN_USAGE_SIGNIN = 'pwless-signin'
var TOKEN_USAGE_SIGNUP = 'pwless-signup'
var TOKEN_USAGE_SIGNIN_NEW_USER = 'pwless-new-user'

var CONNECT_SUB_FIELDS = [
  'email', 'redirect_uri', 'client_id', 'response_type', 'scope', 'nonce'
]

function verifyPasswordlessEnabled (req, res, next) {
  if (!settings.providers.passwordless) {
    return next(new PasswordlessDisabledError())
  } else {
    return next()
  }
}

function consumeToken (req, res, next) {
  if (!req.query.token) {
    return next(new InvalidRequestError('Missing token'))
  }
  // consume the token
  OneTimeToken.consume(req.query.token, function (err, token) {
    if (err) { return next(err) }
    req.token = token
    next()
  })
}

function extractTokenSub (req, res, next) {
  if (!req.token) {
    return next()
  }
  var token = req.token
  if (!token.sub) {
    return next()
  }
  req.connectParams = req.connectParams || {}
  _.assign(req.connectParams, _.pick(token.sub, CONNECT_SUB_FIELDS))
  if (token.sub) {
    req.user_id = token.sub.user
  }
  next()
}

// perhaps this should be dispached by the authenticator
// however I am not sure I see what that would bring?
function verifyPasswordlessSigninToken (req, res, next) {
  var view = 'passwordless/pwlessSigninLinkError'
  var token = req.token

  // Invalid or expired token
  if (!token || token.use !== TOKEN_USAGE_SIGNIN) {
    return res.render(view, {
      error: 'Invalid or expired link'
    })
  }

  if (!req.user_id || !req.user_id.trim()) {
    return res.render(view, {
      error: 'Invalid or expired link'
    })
  }

  // Update the user
  User.patch(req.user_id, {
    dateEmailVerified: Date.now(),
    emailVerified: true
  }, function (err, user) {
    if (err) { return next(err) }

    // unknown user, might happen if token expired or
    // link activated twice.
    if (!user) {
      return res.render(view, {
        error: 'Unable to verify email for this user.'
      })
    }

    // analog to Password signin handler after authenticator.dispatch
    // authenticated user based on password.
    req.user = user
    authenticator.login(req, user)
    next()
  })
}

function verifyPasswordlessSignupToken (req, res, next) {
  var errView = 'passwordless/pwlessSigninLinkError'
  var token = req.token

  // Invalid or expired token
  if (!token || token.use !== TOKEN_USAGE_SIGNUP) {
    return res.render(errView, {
      error: 'Invalid or expired link'
    })
  }

  // We have a token and we now send the user to form to fill in
  // additional information to create the user account.
  // When that form is submitted the user should be created and
  // then immediately signed in.
  // We issue a new token with a different expiration so that the user can fill in the form with more leisure.
  // The token also captures request parameters.
  var tokenOptions = {
    use: TOKEN_USAGE_SIGNIN_NEW_USER,
    ttl: 60 * 60 * 24,
    sub: token.sub
  }
  issueToken(req, tokenOptions, function (err, token, tokenOptions) {
    if (err) {
      return next(err)
    }
    res.render('passwordless/pwlessSignup', {
      'email': tokenOptions.sub.email,
      token: token._id
    })
  })
}

function peekToken (req, res, next) {
  if (!req.connectParams.token) {
    return next(new InvalidRequestError('Missing token'))
  }
  // consume the token
  OneTimeToken.peek(req.connectParams.token, function (err, token) {
    if (err) { return next(err) }
    req.token = token
    next()
  })
}

function verifyPasswordlessNewUserSigninToken (req, res, next) {
  var view = 'passwordless/pwlessSignup'
  var token = req.token

  // Invalid or expired token
  if (!token || token.use !== TOKEN_USAGE_SIGNIN_NEW_USER) {
    return res.render(view, {
      error: 'Invalid or expired link'
    })
  }

  var userOptions = {
    private: true,
    password: false
  }

  var userData = {
    dateEmailVerified: Date.now(),
    emailVerified: true
  }

  _.assign(userData, req.connectParams)

  User.insert(userData, userOptions, function (err, user) {
    if (err) {
      return res.render(view, {
        error: err,
        token: token._id,
        email: token.sub.email
      })
    }
    OneTimeToken.revoke(token._id, function () {
      // don't care if token revocation fails as they expire anyhow.
      req.user = user
      authenticator.login(req, user)
      next()
    })
  })
}

function signinRenderErrorInvalidEmail (req, res, next) {
  if (typeof req.connectParams.email === 'undefined') {
    return renderSignin(res, req.connectParams, {
      formError: 'Please enter a valid e-mail address.'
    })
  }
  next()
}

function issueToken (req, tokenOptions, cb) {
  var subObject = _.pick(req.connectParams, CONNECT_SUB_FIELDS)
  var theTokenOptions = {
    ttl: settings.providers.passwordless.tokenTTL || 60 * 15,
    sub: subObject
  }
  theTokenOptions = _.merge(theTokenOptions, tokenOptions)
  OneTimeToken.issue(theTokenOptions, function (err, token) {
    cb(err, token, theTokenOptions)
  })
}

function sendMail (req, res, next) {
  User.getByEmail(req.connectParams.email, function (err, user) {
    if (err) { return next(err) }

    // The runtime of User.getByEmail may reveal
    // whether user has an account or not. This could potentially
    // be used for an attack.

    // user = null is treated as new signup.
    // The email send is tailored to whether it is a new sign up or
    // a sign in of an existing user

    var tokenOptions = {
      use: user ? TOKEN_USAGE_SIGNIN : TOKEN_USAGE_SIGNUP,
      sub: {}
    }
    if (user) {
      tokenOptions.sub.user = user._id
    }
    issueToken(req, tokenOptions, function (err, token, tokenOptions) {
      if (err) { return next(err) }
      var email = tokenOptions.sub.email

      var verifyURL = url.parse(settings.issuer)
      verifyURL.pathname = user ? 'signin/passwordless' : 'signup/passwordless'
      verifyURL.query = { token: token._id }

      var mailOptions = {
        email: email,
        verifyURL: url.format(verifyURL),
        providerName: req.client.client_name
      }

      var template = user ? 'passwordlessSignin' : 'passwordlessSignup'
      var subject = user
        ? 'Sign in to ' + mailOptions.providerName
        : 'Create your account on ' + mailOptions.providerName

      mailer.sendMail(template, mailOptions, {
        to: email,
        subject: subject
      }, function (err, responseStatus) {
        if (err) { }         // TODO: REQUIRES REFACTOR TO MAIL QUEUE
        renderSentMail(req, res, next)
      })
    })
  })
}

function renderSentMail (req, res, next) {
  // this is similar to the middleware in requireVerifiedEmail
  // but there are differences:
  // 1. Not sure role.name authority handling makes sense here.
  // 2. emailVerified is no reason to skip this.
  // 3. Resend URL has different path ('resend/passwordless' instead of 'email/resend')
  // 3. The messages are differently worded to the case.
  // So perhaps not sharing will make this somewhat easier.

  var resendURL = url.parse(settings.issuer)
  resendURL.pathname = 'resend/passwordless'
  resendURL.query = {}
  _.assign(resendURL.query, _.pick(req.connectParams, CONNECT_SUB_FIELDS))
  var locals = {
    from: mailer.from,
    resendURL: url.format(resendURL)
  }
  res.render('passwordless/pwlessSentEmail', locals)
}

/*
 * It is expected that the following middleware is used prior
 * to this:
 oidc.selectConnectParams,
 oidc.verifyClient,
 oidc.validateAuthorizationParams,
 oidc.determineProvider.setup({requireProvider: true}),
 oidc.enforceReferrer('/signin'),
 In addition it was checked that req.body.provider === 'passwordless'
 */

function postSigninMiddleware () {
  var middleware = express.Router()
  var handler = [
    verifyPasswordlessEnabled,
    oidc.verifyMailerConfigured,
    oidc.verifyEmailValid,
    signinRenderErrorInvalidEmail,
    sendMail
  ]
  middleware.use(handler)
  function passwordlessSignin (req, res, next) {
    // allows setting a breakpoint here and some nicer stack traces.
    middleware(req, res, next)
  }
  return passwordlessSignin
}

// routes for provider=passwordless
function routes (server) {
  server.get('/resend/:provider',
    oidc.selectConnectParams,
    oidc.verifyClient,
    oidc.validateAuthorizationParams,
    oidc.determineProvider.setup({requireProvider: true}),
    verifyPasswordlessEnabled,
    oidc.verifyMailerConfigured,
    oidc.verifyEmailValid,
    function (req, res, next) {
      if (typeof req.connectParams.email === 'undefined') {
        next(new InvalidRequestError('invalid email'))
      }
      next()
    },
    sendMail
  )
  server.get('/signin/:provider',
    consumeToken,
    extractTokenSub,
    oidc.verifyClient,
    oidc.validateAuthorizationParams,
    oidc.determineProvider.setup({requireProvider: true}),
    verifyPasswordlessEnabled,
    verifyPasswordlessSigninToken,
    oidc.determineUserScope,
    oidc.promptToAuthorize,
    oidc.authorize
  )
  server.get('/signup/:provider',
    consumeToken,
    extractTokenSub,
    oidc.verifyClient,
    oidc.validateAuthorizationParams,
    oidc.determineProvider.setup({requireProvider: true}),
    verifyPasswordlessEnabled,
    verifyPasswordlessSignupToken
  )
  server.post('/signup/:provider',
    oidc.selectConnectParams,
    peekToken,
    extractTokenSub,
    oidc.verifyClient,
    oidc.validateAuthorizationParams,
    oidc.determineProvider.setup({requireProvider: true}),
    verifyPasswordlessEnabled,
    verifyPasswordlessNewUserSigninToken,
    oidc.determineUserScope,
    oidc.promptToAuthorize,
    oidc.authorize
  )
}

module.exports = {
  routes: routes,
  signin: postSigninMiddleware,
  middleware: {
    verifyEnabled: verifyPasswordlessEnabled,
    peekToken: peekToken,
    consumeToken: consumeToken,
    extractTokenSub: extractTokenSub,
    verifyToken: verifyPasswordlessSigninToken,
    renderInvalidEmail: signinRenderErrorInvalidEmail,
    sendMail: sendMail,
    verifySignupToken: verifyPasswordlessSignupToken,
    verifyNewUserSigninToken: verifyPasswordlessNewUserSigninToken
  }
}
