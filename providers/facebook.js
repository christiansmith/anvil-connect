/**
 * Facebook Provider
 */

module.exports = function (config) {
  return {
    id: 'facebook',
    name: 'Facebook',
    protocol: 'OAuth2',
    url: 'https://www.facebook.com',
    redirect_uri: config.issuer + '/connect/facebook/callback',
    endpoints: {
      authorize: {
        url: 'https://www.facebook.com/v2.8/dialog/oauth',
        method: 'POST'
      },
      token: {
        url: 'https://graph.facebook.com/v2.8/oauth/access_token',
        method: 'POST',
        auth: 'client_secret_post'
      },
      user: {
        url: 'https://graph.facebook.com/me?fields=name,first_name,last_name,link,gender,locale,verified,picture,email',
        method: 'GET',
        auth: {
          header: 'Authorization',
          scheme: 'Bearer'
        }
      }
    },
    separator: ',',
    mapping: {
      id: 'id',
      emailVerified: 'verified',
      name: 'name',
      email: 'email',
      picture: 'picture.data.url',
      givenName: 'first_name',
      familyName: 'last_name',
      profile: 'link',
      gender: 'gender',
      locale: 'locale'
    }
  }
}
