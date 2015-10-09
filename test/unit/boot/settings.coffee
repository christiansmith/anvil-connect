# Test dependencies
chai        = require 'chai'
sinon       = require 'sinon'
sinonChai   = require 'sinon-chai'
expect      = chai.expect

proxyquire = require 'proxyquire'


# Configure Chai and Sinon
chai.use sinonChai
chai.should()


describe 'Test on settings', ->

    cwd         = process.cwd()
    env         = process.env.NODE_ENV || 'development'
    fs          = require 'fs'
    path        = require 'path'

    {settings} = {}

    describe 'without a config file', ->

      before ->
        config = path.join(cwd, 'config', env + '.json')
        origReadFileSync = fs.readFileSync
        sinon.stub fs, 'readFileSync', (file, options)->
          if file == config
            return JSON.stringify({
                issuer: 'http://localhost:3000'
                cookie_secret: 'cs123'
                session_secret: 'ss456'
              })
          else
            origReadFileSync.call(fs, file, options)

        proxyquire.noPreserveCache()
        try
          configLoad = proxyquire(config, {})

        settings = proxyquire('../../../boot/settings', {})

      after ->
        fs.readFileSync.restore()
        proxyquire.preserveCache()
        # User.list.restore()

      it 'settings.providers is not undefined', ->
        expect(settings.providers).to.not.be.undefined

      it 'settings.issuer equals http://localhost:3000', ->
        settings.issuer.should.equal 'http://localhost:3000'

      it 'settings.cookie_secret is a string', ->
        settings.cookie_secret.should.be.a 'string'

      it 'settings.session_secret is a string', ->
        settings.session_secret.should.be.a 'string'
