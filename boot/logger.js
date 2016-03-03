/**
 * Module dependencies
 */

var cwd = process.cwd()
var env = process.env.NODE_ENV || 'development'
var path = require('path')
var bunyan = require('express-bunyan-logger')
var ensureWritableDirectory = require('../lib/fs-utils').ensureWritableDirectory
var oidc = require('../oidc')
var routes = require('../routes')

var FN_ARGS_SPLIT = /^[^\(]*\(\s*([^\)]*)\)/m

function getSignature (fn) {
  return fn.toString().match(FN_ARGS_SPLIT)[1]
}

function addLoggingAnvil (addLogging) {
  function addLoggingModule (module) {
    for (var idx in module) {
      var fn = module[idx]
      if (getSignature(fn) === addLogging.signature) {
        // wrap function with logging
        module[fn.name] = addLogging(fn)
      }
    }
  }
  addLoggingModule(oidc)
}

function addDebugLogging () {
  var addLogging = function (fn) {
    return function (req, res, next) {
      req.log.debug(fn.name)
      fn(req, res, next)
    }
  }
  addLogging.signature = 'req, res, next'
  addLoggingAnvil(addLogging)
}

function addErrorLogging () {
  var addLogging = function (fn) {
    return function (err, req, res, next) {
      req.log.error(err, fn.name)
      fn(err, req, res, next)
    }
  }
  addLogging.signature = 'err, req, res, next'
  addLoggingAnvil(addLogging)
}

/**
 * Export
 */

module.exports = function (options) {
  var logger
  var config = { name: 'request', streams: [], level: 'info' }

  if (!env.match(/test/i)) {
    var logsPath = path.join(cwd, 'logs')
    ensureWritableDirectory(logsPath)

    if (options && options.stdout) { config.streams.push({ stream: process.stdout }) }
    if (options && options.file) { config.streams.push({ path: path.join(logsPath, env + '.log') }) }
    if (options && options.level) { config.level = options.level }

    switch (config.level) {
      case 'fatal':
        break
      case 'error':
        addErrorLogging()
        break
      case 'warn':
        addErrorLogging()
        break
      case 'info':
        addErrorLogging()
        break
      case 'debug':
        addDebugLogging()
        addErrorLogging()
        break
      case 'trace':
        addDebugLogging()
        addErrorLogging()
        break
    }

    try {
      config = require('../logger')
    } catch (e) {
      if (e.code !== 'MODULE_NOT_FOUND') { throw e }
    }
  }

  logger = bunyan(config)

  module.exports = logger
  return logger
}
