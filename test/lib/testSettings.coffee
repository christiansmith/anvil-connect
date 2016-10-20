_ = require 'lodash'

clearObj = (dest) ->
  for own key of dest
    delete dest[key]

copyObj = (dest, source) ->
  clearObj(dest)
  _.assign(dest, source)
  # for own key, value of source
  #   dest[key] = value

# Allows setting different properties during a test
class TestSettings
  settingsState = {}

  constructor: (@settingsObject , source = {}, clear = true) ->
    _.assign(settingsState, @settingsObject)
    if (clear)
      clearObj(@settingsObject)
    @setSettings(source)

  restore: () ->
    copyObj(@settingsObject, settingsState)

  # not yet needed.
  # getSettings: ->
  #   return @settingsObject
  #

  setSettings: (sourceObject)->
    copyObj(@settingsObject, sourceObject)

  addSettings: (sourceObject)->
    _.assign(@settingsObject, sourceObject)


module.exports = TestSettings
