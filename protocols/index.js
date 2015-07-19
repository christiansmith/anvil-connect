/**
 * Module dependencies
 */

var cwd = process.cwd()
  , path = require('path');


/**
 * Initialize
 */

function initialize (name, provider, config) {
  var strategy
    , protocol = provider.protocol
    ;

  // try to load an officially supported provider
  try {
    strategy = require(path.join(__dirname, protocol));
  } catch (e) {}

  // try to load a custom provider from the deployment repository
  try {
    strategy = require(path.join(cwd, 'node_modules', 'anvil-connect', 'protocols', protocol));
  } catch (e) {
    if (!strategy) {
      throw new Error("Can't find custom protocol: " + protocol);
    }
  }

  provider.id = name;
  return strategy.initialize(provider, config);
}


/**
 * Exports
 */

module.exports = {
  initialize: initialize
};
