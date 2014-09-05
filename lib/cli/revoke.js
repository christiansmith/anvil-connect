/**
 * Module dependencies
 */

var server = require('../../server')
  , User   = require('../../models/User')
  ;


/**
 * Export
 */

module.exports = function revoke (argv) {
  var email = argv._[0]
    , role  = argv._[1]
    ;

  User.getByEmail(email, function (err, user) {
    if (!user) {
      console.log('Unknown user.');
      process.exit();
    }

    User.removeRoles(user, role, function (err, result) {
      if (err) {
        console.log(err.message || err.error);
        process.exit();
      }

      if (result[0] === 0) {
        console.log(
          '%s (%s) does not have the role "%s."',
          user.name, user.email, role
        );
      } else {
        console.log(
          '%s (%s) no longer has the role "%s."',
          user.name, user.email, role
        );
      }

      process.exit();
    });
  });
}
