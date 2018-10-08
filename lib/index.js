const Debug = require('debug');
const { merge, omit, pick } = require('lodash');
const hooks = require('./hooks');
const DefaultVerifier = require('./verifier');

const passportHttp = require('passport-http');

const debug = Debug('@feathersjs/authentication-http-basic');
const defaults = {
  name: 'http-basic',
  usernameField: 'email',
  passwordField: 'password'
};

const KEYS = [
  'entity',
  'service',
  'passReqToCallback',
  'session'
];

function init (options = {}) {
  return function basicAuth () {
    const app = this;
    const _super = app.setup;

    if (!app.passport) {
      throw new Error(`Can not find app.passport. Did you initialize feathers-authentication before @feathersjs/authentication-http-basic?`);
    }

    let name = options.name || defaults.name;
    let authOptions = app.get('authentication') || {};
    let basicOptions = authOptions[name] || {};

    // NOTE (EK): Pull from global auth config to support legacy auth for an easier transition.
    const basicSettings = merge({}, defaults, pick(authOptions, KEYS), basicOptions, omit(options, ['Verifier']));
    let Verifier = DefaultVerifier;

    if (options.Verifier) {
      Verifier = options.Verifier;
    }

    app.setup = function () {
      let result = _super.apply(this, arguments);
      let verifier = new Verifier(app, basicSettings);

      if (!verifier.verify) {
        throw new Error(`Your verifier must implement a 'verify' function. It should have the same signature as a http basic passport verify callback.`);
      }

      // Register 'basic' strategy with passport
      debug('Registering http basic authentication strategy with options:', basicSettings);
      app.passport.use(basicSettings.name, new passportHttp.BasicStrategy(basicSettings, verifier.verify.bind(verifier)));
      app.passport.options(basicSettings.name, basicSettings);

      return result;
    };
  };
}

module.exports = init;

// Exposed Modules
Object.assign(module.exports, {
  default: init,
  defaults,
  hooks,
  Verifier: DefaultVerifier
});
