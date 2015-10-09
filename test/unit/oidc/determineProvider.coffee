chai      = require 'chai'
sinon     = require 'sinon'
sinonChai = require 'sinon-chai'
expect    = chai.expect




chai.use sinonChai
chai.should()




{determineProvider} = require '../../../oidc'
settings            = require '../../../boot/settings'
providers           = require '../../../providers'
InvalidRequestError = require '../../../errors/InvalidRequestError'





describe 'Determine Provider', ->


  {req,res,next} = {}
  settingsProviders = {}


  describe 'with provider on params', ->

    before ->
      req = { method: 'GET', params: { provider: 'password' }, connectParams: {}}
      res = {}
      next = sinon.spy()
      settingsProviders = settings.providers
      settings.providers = { 'password': {} }
      determineProvider req, res, next

    after ->
      settings.providers = settingsProviders

    it 'should load the correct provider', ->
      req.provider.should.equal providers.password

    it 'should continue', ->
      next.should.have.been.called



  describe 'with provider on connectParams', ->

    before ->
      req = { method: 'GET', params: { }, connectParams: { provider: 'password' } }
      res = {}
      next = sinon.spy()
      settingsProviders = settings.providers
      settings.providers = { 'password': {} }
      determineProvider req, res, next

    after ->
      settings.providers = settingsProviders

    it 'should load the correct provider', ->
      req.provider.should.equal providers.password

    it 'should continue', ->
      next.should.have.been.called




  describe 'with unknown provider on body', ->

    before ->
      req = { method: 'GET', params: {}, connectParams: { provider: '/\\~!@#$%^&*(_+' } }
      res = {}
      next = sinon.spy()
      settingsProviders = settings.providers
      settings.providers = { 'password': {} }
      determineProvider req, res, next

    after ->
      settings.providers = settingsProviders

    it 'should not load a provider', ->
      req.should.not.have.property 'provider'

    it 'should continue', ->
      next.should.have.been.called

  describe 'with unknown provider on body with requireProvider options', ->

    before ->
      req = { method: 'GET', params: {}, connectParams: { provider: '/\\~!@#$%^&*(_+' } }
      res = {}
      next = sinon.spy()
      settingsProviders = settings.providers
      settings.providers = { 'password': {} }
      determineProvider = determineProvider.setup {requireProvider: true}
      determineProvider req, res, next

    after ->
      settings.providers = settingsProviders

    it 'should not load a provider', ->
      req.should.not.have.property 'provider'

    it 'should continue with InvalidRequestError: Invalid provider', ->
      next.should.have.been.calledWith new InvalidRequestError('Invalid provider')



  describe 'with unconfigured provider on body', ->

    before ->
      req = { method: 'GET', params: {}, connectParams: { provider: 'password' } }
      res = {}
      next = sinon.spy()
      settingsProviders = settings.providers
      settings.providers = {}
      determineProvider req, res, next

    after ->
      settings.providers = settingsProviders

    it 'should not load a provider', ->
      req.should.not.have.property 'provider'

    it 'should continue', ->
      next.should.have.been.called
