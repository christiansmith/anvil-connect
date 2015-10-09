/* global process, __dirname */

/**
 * Module dependencies
 */

var nodemailer = require('nodemailer')
var settings = require('./settings')
var cons = require('consolidate')
var htmlToText = require('html-to-text')
var path = require('path')
var templatesDir = path.resolve(process.cwd(), 'email')
var origTemplatesDir = path.resolve(__dirname, '..', 'email')
var engine, engineName, defaultFrom

/**
 * Render e-mail templates to HTML and text
 */

function render (template, locals, callback) {
  var engineExt =
  engineName.charAt(0) === '.' ? engineName : ('.' + engineName)
  var tmplPath = path.join(templatesDir, template + engineExt)
  var origTmplPath = path.join(origTemplatesDir, template + engineExt)

  function renderToText (html) {
    var text = htmlToText.fromString(html, {
      wordwrap: 72 // A little less than 80 characters per line is the de-facto
    // standard for e-mails to allow for some room for quoting
    // and e-mail client UI elements (e.g. scrollbar)
    })

    callback(null, html, text)
  }

  engine(tmplPath, locals)
    .then(renderToText)
    .catch(function () {
      engine(origTmplPath, locals)
        .then(renderToText)
        .catch(function (err) {
          callback(err)
        })
    })
}

/**
 * Helper function to send e-mails using templates
 */

function sendMail (template, locals, options, callback) {
  var self = this
  this.render(template, locals, function (err, html, text) {
    if (err) { return callback(err) }

    self.transport.sendMail({
      from: options.from || defaultFrom,
      to: options.to,
      subject: options.subject,
      html: html,
      text: text
    }, callback)
  })
}

/**
 * Get mailer
 */

 // node modules are only loaded once.

function setup () {
  var fromVerifier = /^(?:\w|\s)+<[a-z]+@[a-z]+\.[a-z]{2,}>$/igm
  var transport = settings.mailer &&
    nodemailer.createTransport(settings.mailer)

  engineName = (settings.mailer && settings.mailer.view_engine) ||
    settings.view_engine ||
    'hogan'
  engine = cons[engineName]

  if (transport && (typeof settings.mailer.from !== 'string' ||
    !fromVerifier.test(settings.mailer.from))) {
    console.error(settings.mailer.from)
    throw new Error('From field not provided for mailer. ' +
      'Expected "Display Name <email@example.com>"')
  }

  defaultFrom = settings.mailer && settings.mailer.from

  var mailer = {
    from: defaultFrom,
    render: render,
    transport: transport,
    sendMail: sendMail
  }
  return mailer
}

module.exports = setup()
