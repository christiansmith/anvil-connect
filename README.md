# Anvil Connect

[![Join the chat at https://gitter.im/anvilresearch/connect](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/anvilresearch/connect?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge) [![Slack](http://slackin.anvil.io/badge.svg)](http://slackin.anvil.io/)
[![IRC](https://img.shields.io/badge/Slack-IRC-green.svg)](https://anvilresearch.slack.com/account/gateways)

![Dependencies](https://img.shields.io/david/anvilresearch/connect.svg) ![License](https://img.shields.io/github/license/anvilresearch/connect.svg) ![Downloads](https://img.shields.io/npm/dm/anvil-connect.svg)
![npm](https://img.shields.io/npm/v/anvil-connect.svg)

## What We're Doing
### We're building a modern authorization server to authenticate your users and protect your APIs.

#### You can find professional services and sponsor information on [our website](http://anvil.io).

#### You can support us on [Bountysource](https://salt.bountysource.com/teams/anvilresearch). We are 100% open source, we appreciate the help!

#### Simplified Security
- Share user accounts between multiple apps and services with Single Sign-On (shared sessions)
- Issue signed JSON Web Tokens to protect your APIs
- Be a federated identity provider with OpenID Connect
- Enable third-party developers using two- and three-legged OAuth 2.0

#### Flexible User Authentication
- Use local passwords, OAuth 1.0, OAuth 2.0, OpenID, LDAP, Active Directory, and more
- Works out of the box with Google, Facebook, Twitter, GitHub, and a [growing list of providers](https://github.com/christiansmith/anvil-connect/tree/master/providers)
- Custom schemes using virtually any existing Passport.js strategy or your own code

#### Make it yours
- Brand the interface with your own design
- Use middleware hooks for domain specific implementations
- Keep your changes under version control without forking

#### Standard, Interoperable, and Open Source
- Language and platform agnostic
- Implements widely accepted, well-understood protocols
- MIT license



## Get Started

#### Requirements

The CLI tools require recent versions of [Node.js](https://nodejs.org/) (or
[io.js](https://iojs.org/en/index.html)) and npm. If you plan to run your
server with [Docker](https://www.docker.com/), you'll need Docker and Docker
Compose installed (we provide Dockerfiles and docker-compose.yml). On Mac OS X
you'll also need [boot2docker](http://boot2docker.io/). If you wish to run the
server without Docker, you'll need access to a local or remotely accessible
[Redis](http://redis.io/) instance. Python, C/C++ compiler are needed on your
system for building native Nodejs packages, and OpenSSL is required to create
key pairs and certificates. In production, you'll also need a reverse proxy/
load balancer that handles SSL termination. We recommend [nginx](http://nginx.org/).

#### Install the CLI tools

```bash
$ npm install -g anvil-connect anvil-connect-cli
```


#### Generate your deployment repository

```bash
# Make a place for your project to live
$ mkdir path/to/project
$ cd path/to/project

# Generate a deployment repository
$ nvl init
? What would you like to name your Connect instance? myauthserver
? What (sub)domain will you use? connect.example.com
? Would you like to use Docker? Yes
? Would you like to run Redis? Yes
? Would you like to run nginx? Yes
? Would you like to create a self-signed SSL cert? Yes
? Country Name (2 letter code) US
? State or Province Name (full name) South Dakota
? Locality Name (eg, city) Rapid City
? Organization Name (eg, company) Anvil Research, Inc.
```

#### Running with Docker

**If running Docker via Boot2Docker on OS/X or Windows, see the
[warning](#warning-for-boot2docker-users) below**

Run docker-compose from the root of your new project.

```bash
$ docker-compose up -d
```

#### Running without Docker

The first time, you'll need to install npm and bower dependencies.

```bash
$ cd connect
$ npm install && bower install
```

Then you can start the server in with `node` or `npm`.

```bash
# development mode
$ node server.js

# production mode
$ NODE_ENV=production node server.js
```
#### Warning for Boot2Docker Users
If you're running on a Mac or Windows computer using boot2docker (this includes
kitematic and docker-toolbox), then you must ensure that the project folder is
located somewhere underneath ```/Users/``` on OS/X or ```c:\Users\``` on Windows.
This is because boot2docker by default can only map subdirectories of these
folders into the Docker containers.

If the project folder exists within your home directory or your ```Documents```
folder, then it will work fine.

If you must locate the project folder elsewhere, see this
[StackOverlow post](http://stackoverflow.com/questions/30586949/how-do-i-map-volume-outside-c-users-to-container-on-windows)
for a possible procedure.

## Documentation

* [Documentation](https://github.com/anvilresearch/connect-docs)
* [References](https://github.com/anvilresearch/connect/wiki/References)


## Development

We are a growing community of contributors of all kinds, join us!

### Chat on Gitter or Slack

Come say hello on Gitter or Slack! We love talking shop with Anvil Connect users :)

[![Gitter](https://badges.gitter.im/anvilresearch/connect.svg)](https://gitter.im/anvilresearch/connect) [![Slack](http://slackin.anvil.io/badge.svg)](http://slackin.anvil.io/)
[![IRC](https://img.shields.io/badge/Slack-IRC-green.svg)](https://anvilresearch.slack.com/account/gateways)

### Weekly Community Meetings

Every Thursday at 9AM PDT / 12PM EDT / 4PM GMT we get together to map out the future of the project, talk through specs, review code, and help each other ship. You're welcome to [join in](https://github.com/anvilresearch/connect/wiki/Weekly-Community-Hangouts-and-Meeting-Notes).

### Pair Programming

We often pair on more challening or new code, hop into Gitter or Slack and join us, or request your own session.

### Need more engagement?

Support and consulting also available, contact us via [the website](http://anvil.io) or by [email](mailto:contact@anvil.io)


## Status

- Used in production since July 2014
- Active development as of March 2015


## MIT License

Copyright (c) 2015 [Anvil Research, Inc.](http://anvil.io)

