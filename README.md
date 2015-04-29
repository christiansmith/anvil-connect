# Anvil Connect

[![Join the chat at https://gitter.im/anvilresearch/connect](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/anvilresearch/connect?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

### We're building a modern authorization server to <br>authenticate your users and protect your APIs.

[![Join the chat at https://gitter.im/christiansmith/anvil-connect](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/christiansmith/anvil-connect?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

#### Simplified Security

- Share user accounts between multiple apps and services
- Single Sign-On (shared sessions)
- Issue signed JSON Web Tokens to protect your APIs
- Be a federated identity provider with OpenID Connect
- Enable third-party developers using two- and three-legged OAuth 2.0
- Manage access with RBAC

#### Flexible User Authentication

- Use local passwords, OAuth 1.0, OAuth 2.0, OpenID, and more
- Works out of the box with Google, Facebook, Twitter, GitHub, and a [growing list of providers](https://github.com/christiansmith/anvil-connect/tree/master/providers)
- Custom schemes using virtually any existing Passport.js strategy or your own code

#### Make it yours

- Brand the interface with your own design
- Use middleware hooks for domain specific auth logic
- Keep your changes under version control without forking

#### Standard, Interoperable, and Open Source

- Language and platform agnostic
- Implements widely accepted, well-understood protocols
- Growing number of client libraries available
- MIT license

***

### Get Started

#### Requirements

* Node.js
* npm
* Redis

#### Setup

```bash
# Install the CLI
$ npm install -g anvil-connect

# Make a place for your deployment repository to live
$ mkdir path/to/project
$ cd path/to/project

# Generate a deployment repository
$ nv init

# Install dependencies
$ npm install

# Initialize the local database
$ nv migrate

# Create the first user account
$ nv signup

# Assign a role
$ nv assign <email> authority

# Start the server in development mode
$ nv serve
```

You should now have an OpenID Connect Provider running in development mode.

#### Documentation

The docs are in need of attention. Please submit a issues if you encounter any difficulties.

* [Documentation](https://github.com/christiansmith/anvil-connect/wiki/Documentation)
* [References](https://github.com/christiansmith/anvil-connect/wiki/References)

***

### Status

- Deprecates OAuth2Server project started in mid 2013
- Used in production since July 2014
- Active development as of March 2015

***

### Roadmap

* [ ] Invite-based registration
* [ ] Email Verification/Multi-factor authentication
* [ ] Improved CLI, REST API
* [x] Shared sessions (Single Sign-On)
* [ ] More middleware hooks for programmatically customizing auth flows
* [ ] Attribute-based Access Control
* [ ] Built-in support for more requested OAuth providers and protocols (LDAP, SAML, etc)
* [ ] Client libraries for a variety of languages, frameworks and platforms
* [ ] Groups
* [ ] Brokering API access and marshaling third-party tokens
* [ ] Containerized deployment support
* [ ] Improved logging
* [ ] Embedded, horizontally scalable datastore (eliminate Redis dependency)
* [ ] Multi-tenancy
* [ ] Web and mobile administration
* [ ] Complete, tested OIDC interoperability
* [ ] Tutorials, examples, blog posts, website, and API documentation
* [ ] ...

***

### Development

There are many ways to get help and contribute.

* Chat on [Gitter](https://gitter.im/christiansmith/anvil-connect)
* Join weekly [Google Hangouts](https://www.google.com/calendar/embed?src=anvil.io_3leor1jds8ne3rj0lauh8hboes%40group.calendar.google.com&ctz=America/Los_Angeles) every Thursday
* Pair Programming
* Support and consulting available
* Contact smith@anvil.io.

<a href="https://www.google.com/calendar/selfsched?sstoken=UUx1dWZaTzBaY2lCfGRlZmF1bHR8MGViMzcyZDg0OTUyOGZkOTNjM2M2ZDMxMmYwMWM0Yjg" title="Pair program with me!">
  <img  src="http://pairprogramwith.me/badge.png"
        alt="Pair program with me!" />
</a>

***

## MIT License

Copyright (c) 2015 Anvil Research, Inc. http://anvil.io

