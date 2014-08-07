/**
 * Passport Configuration
 */

var cwd              = process.cwd()
  , env              = process.env.NODE_ENV || 'development'
  , path             = require('path')
  , config           = require(path.join(cwd, 'config.' + env + '.json'))
  , LocalStrategy    = require('passport-local').Strategy
  , BearerStrategy   = require('passport-http-bearer').Strategy
  , FacebookStrategy = require('passport-facebook').Strategy
  , GoogleStrategy   = require('passport-google-oauth').OAuth2Strategy
  , TwitterStrategy  = require('passport-twitter').Strategy
  , base64url        = require('base64url')
  , User             = require('../models/User')
  ;


module.exports = function (passport) {


  /**
   * Sessions
   */

  passport.serializeUser(function (user, done) {
    done(null, user._id);
  });

  passport.deserializeUser(function (id, done) {
    User.get(id, function (err, user) {
      done(err, user);
    });
  });


  /**
   * Local Strategy
   */

  passport.use(new LocalStrategy(
    { usernameField: 'email' },
    function (email, password, done) {
      User.authenticate(email, password, function (err, user, info) {
        done(err, user, info);
      });
    }
  ));


  /**
   * OAuth Strategies
   */

  var providers = config.providers;

  if (providers) {

    /**
     * Facebook
     */

    //if (typeof providers.facebook === 'object') {
    //  providers.facebook.callbackURL = server.host + '/connect/facebook/callback';
    //  passport.use(new FacebookStrategy(
    //    config.facebook,
    //    function (accessToken, refreshToken, profile, done) {
    //      // can we have a standard function that we call here in each strategy?
    //    }
    //  ));
    //}


    /**
     * Google
     */

    if (typeof providers.google === 'object') {
      passport.use(new GoogleStrategy(
        providers.google,
        function (request, token, secret, profile, done) {

          try {
            var profile = JSON.parse(profile._raw);
          } catch (e) {
            return done(e);
          }

          User.connect({
            provider: 'google',
            user:      request.user,
            token:     token,
            secret:    secret,
            profile:   profile
          }, function (err, user) {
            if (err) { return done(err); }
            done(null, user);
          });
        }
      ));
    }


    /**
     * Twitter
     */

    //if (typeof providers.twitter === 'object') {
    //  providers.twitter.callbackURL = server.host + '/connect/twitter/callback';
    //  passport.use(new TwitterStrategy(
    //    config.twitter,
    //    function (token, tokenSecret, profile, done) {
    //      // ...
    //    }
    //  ));
    //}

  }

};
