/* eslint-disable no-unused-expressions */
const feathers = require('@feathersjs/feathers');
const expressify = require('@feathersjs/express');
const authentication = require('@feathersjs/authentication');
const memory = require('feathers-memory');
const chai = require('chai');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
const passportHttp = require('passport-http');
const basic = require('../lib');

const { Verifier } = basic;
const { expect } = chai;

chai.use(sinonChai);

describe('@feathersjs/authentication-http-basic', () => {
  it('is CommonJS compatible', () => {
    expect(typeof require('../lib')).to.equal('function');
  });

  it('basic functionality', () => {
    expect(typeof basic).to.equal('function');
  });

  it('exposes default', () => {
    expect(basic.default).to.equal(basic);
  });

  it('exposes hooks', () => {
    expect(typeof basic.hooks).to.equal('object');
  });

  it('exposes the Verifier class', () => {
    expect(typeof Verifier).to.equal('function');
    expect(typeof basic.Verifier).to.equal('function');
  });

  describe('initialization', () => {
    let app;

    beforeEach(() => {
      app = expressify(feathers());
      app.use('/users', memory());
      app.configure(authentication({ secret: 'supersecret' }));
    });

    it('throws an error if passport has not been registered', () => {
      expect(() => {
        expressify(feathers()).configure(basic());
      }).to.throw();
    });

    it('registers the http basic passport strategy', () => {
      sinon.spy(app.passport, 'use');
      sinon.spy(passportHttp, 'BasicStrategy');
      app.configure(basic());
      app.setup();

      expect(passportHttp.BasicStrategy).to.have.been.calledOnce;
      expect(app.passport.use).to.have.been.calledWith('http-basic');

      app.passport.use.restore();
      passportHttp.BasicStrategy.restore();
    });

    it('registers the strategy options', () => {
      sinon.spy(app.passport, 'options');
      app.configure(basic());
      app.setup();

      expect(app.passport.options).to.have.been.calledOnce;

      app.passport.options.restore();
    });

    describe('passport strategy options', () => {
      let authOptions;
      let args;

      beforeEach(() => {
        sinon.spy(passportHttp, 'BasicStrategy');
        app.configure(basic({ custom: true }));
        app.setup();
        authOptions = app.get('authentication');
        args = passportHttp.BasicStrategy.getCall(0).args[0];
      });

      afterEach(() => {
        passportHttp.BasicStrategy.restore();
      });

      it('sets usernameField', () => {
        expect(args.usernameField).to.equal('email');
      });

      it('sets passwordField', () => {
        expect(args.passwordField).to.equal('password');
      });

      it('sets entity', () => {
        expect(args.entity).to.equal(authOptions.entity);
      });

      it('sets service', () => {
        expect(args.service).to.equal(authOptions.service);
      });

      it('sets session', () => {
        expect(args.session).to.equal(authOptions.session);
      });

      it('sets passReqToCallback', () => {
        expect(args.passReqToCallback).to.equal(authOptions.passReqToCallback);
      });

      it('supports setting custom options', () => {
        expect(args.custom).to.equal(true);
      });
    });

    it('supports overriding default options', () => {
      sinon.spy(passportHttp, 'BasicStrategy');
      app.configure(basic({ usernameField: 'username' }));
      app.setup();

      expect(passportHttp.BasicStrategy.getCall(0).args[0].usernameField).to.equal('username');

      passportHttp.BasicStrategy.restore();
    });

    it('pulls options from global config', () => {
      sinon.spy(passportHttp, 'BasicStrategy');
      let authOptions = app.get('authentication');
      authOptions['http-basic'] = { usernameField: 'username' };
      app.set('authentication', authOptions);

      app.configure(basic());
      app.setup();

      expect(passportHttp.BasicStrategy.getCall(0).args[0].usernameField).to.equal('username');
      expect(passportHttp.BasicStrategy.getCall(0).args[0].passwordField).to.equal('password');

      passportHttp.BasicStrategy.restore();
    });

    it('pulls options from global config with custom name', () => {
      sinon.spy(passportHttp, 'BasicStrategy');
      let authOptions = app.get('authentication');
      authOptions.custom = { usernameField: 'username' };
      app.set('authentication', authOptions);

      app.configure(basic({ name: 'custom' }));
      app.setup();

      expect(passportHttp.BasicStrategy.getCall(0).args[0].usernameField).to.equal('username');
      expect(passportHttp.BasicStrategy.getCall(0).args[0].passwordField).to.equal('password');

      passportHttp.BasicStrategy.restore();
    });

    describe('custom Verifier', () => {
      it('throws an error if a verify function is missing', () => {
        expect(() => {
          class CustomVerifier {
            constructor (app) {
              this.app = app;
            }
          }
          app.configure(basic({ Verifier: CustomVerifier }));
          app.setup();
        }).to.throw();
      });

      it('verifies through custom verify function', () => {
        const User = {
          email: 'admin@feathersjs.com',
          password: 'password'
        };

        const req = {
          query: {},
          body: Object.assign({}, User),
          headers: {
            authorization : "Basic " + new Buffer(User.email + ":" + User.password).toString("base64")
          },
          cookies: {}
        };
        class CustomVerifier extends Verifier {
          verify (req, username, password, done) {
            expect(username).to.equal(User.email);
            expect(password).to.equal(User.password);
            done(null, User);
          }
        }

        app.configure(basic({ Verifier: CustomVerifier }));
        app.setup();

        return app.authenticate('http-basic')(req).then(result => {
          expect(result.data.user).to.deep.equal(User);
        });
      });
    });
  });
});
