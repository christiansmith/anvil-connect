/**
 * Module dependencies
 */

var Role = require('../../../models/Role')
var User = require('../../../models/User')
var NotFoundError = require('../../../errors/NotFoundError')
var settings = require('../../../boot/settings')
var oidc = require('../../../oidc')

/**
 * Export
 */

module.exports = function (server) {
    /**
     * Token-based Auth Middleware
     */

    var authorize = [
        oidc.parseAuthorizationHeader,
        oidc.getBearerToken,
        oidc.verifyAccessToken({
            iss: settings.issuer,
            key: settings.keys.sig.pub,
            scope: 'realm'
        })
    ]

    /**
     * GET /v1/roles/:roleId/users
     */

    server.get('/v1/roles/:roleId/users',
        authorize,
        function (req, res, next) {
            // first, ensure the role exists
            Role.get(req.params.roleId, function (err, instance) {
                if (err) { return next(err) }
                if (!instance) { return next(new NotFoundError()) }

                // then list roles by account
                User.listByRoles(req.params.roleId, function (err, instances) {
                    if (err) { return next(err) }
                    res.json(instances)
                })
            })
        })

}
