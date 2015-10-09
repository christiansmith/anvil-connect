/**
 * Passwordless
 *
 * Signin/Signup by clicking a link send by email.
 */

module.exports = function (config) {
  return {
    id: 'passwordless',
    name: 'Sign in or create account with your email',
    protocol: 'Passwordless',
    amr: 'email', // TODO: this is not a standard value, see https://tools.ietf.org/html/draft-jones-oauth-amr-values-01#section-2
    tokenTTL: 60 * 15,
    fields: [
      { name: 'email', type: 'email' }
    ],
    usernameField: 'email'  // TODO: The usernameField appears nowhere to be referenced?. This was copied from the Password provider.
  }
}
