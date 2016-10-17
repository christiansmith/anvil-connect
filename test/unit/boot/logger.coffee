cwd = process.cwd()
path = require 'path'
bunyan = require 'express-bunyan-logger'

logger = require path.join(cwd, 'boot/logger')

describe 'Logger', ->
  describe 'use singleton', ->
    before () ->
      this.initialLogger = logger()
      this.retrievedLogger = logger()

    it 'should return the same instance', ->
      this.retrievedLogger.should.be.deep.equal(this.initialLogger)