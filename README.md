# feathers-authentication-http-basic

> Http Basic authentication strategy for feathers-authentication using Passport without all the boilerplate.

## Installation

```
yarn add feathers-authentication-http-basic
```

## Quick example

```js
const feathers = require('@feathersjs/feathers');
const authentication = require('feathers-authentication');
const httpBasic = require('feathers-authentication-http-basic');
const app = feathers();

// Setup authentication
app.configure(authentication(settings));
app.configure(httpBasic());

// Setup a hook to only allow valid JWTs or successful 
// basic auth to authenticate and get new JWT access tokens
app.service('authentication').hooks({
  before: {
    create: [
      authentication.hooks.authenticate(['http-basic', 'jwt'])
    ]
  }
});
```

## License

Copyright (c) 2018

Licensed under the [MIT license](LICENSE).
