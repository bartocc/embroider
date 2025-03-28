/*
  This code is adapted from ember-engines/addon/-private/router-ext.js.
*/
import EmberRouter from '@ember/routing/router';
import { buildWaiter } from '@ember/test-waiters';
import { macroCondition, getGlobalConfig } from '@embroider/macros';

let Router;

if (macroCondition(getGlobalConfig()['@embroider/core']?.active)) {
  const waiter = buildWaiter('@embroider/router:lazy-route-waiter');

  let newSetup = true;

  const lazyBundle = function lazyBundle(routeName, engineInfoByRoute) {
    // Here we map engine names to route names. We need to do this because
    // engines can be specified with "as" such as:
    //
    // this.mount('lazy-engine', { path: '/use-lazy-engine', as: 'use-lazy-engine' });
    //
    // This presents a problem at build time since we cant get this "mount point" name. This is because the
    // router is dynamic and the string could be defined as anything. Luckly, this._engineInfoByRoute contains
    // mappings from routeName to the engines "original name" (which we know at build time).
    let engine = engineInfoByRoute[routeName];
    if (engine && window._embroiderEngineBundles_) {
      return window._embroiderEngineBundles_.find(bundle => bundle.names.indexOf(engine.name) !== -1);
    }

    if (window._embroiderRouteBundles_) {
      return window._embroiderRouteBundles_.find(bundle => bundle.names.indexOf(routeName) !== -1);
    }

    return false;
  };

  Router = EmberRouter.extend({
    // This is necessary in order to prevent the premature loading of lazy routes
    // when we are merely trying to render a link-to that points at them.
    // Unfortunately the stock query parameter behavior pulls on routes just to
    // check what their previous QP values were.
    _getQPMeta(handlerInfo) {
      let bundle = lazyBundle(handlerInfo.name, this._engineInfoByRoute);
      if (bundle && !bundle.loaded) {
        return undefined;
      }
      return this._super(...arguments);
    },

    // On older versions of Ember, this is a framework method that we're
    // overriding to provide our own handlerResolver.
    _getHandlerFunction() {
      newSetup = false;
      return this._handlerResolver();
    },

    // On newer versions of Ember, this is the framework method that we're
    // overriding to provide our own handlerResolver.
    setupRouter() {
      let isSetup = this._super(...arguments);
      if (newSetup) {
        // Different versions of routerMicrolib use the names `getRoute` vs
        // `getHandler`.
        if (this._routerMicrolib.getRoute !== undefined) {
          this._routerMicrolib.getRoute = this._handlerResolver(
            this._routerMicrolib.getRoute.bind(this._routerMicrolib)
          );
        } else if (this._routerMicrolib.getHandler !== undefined) {
          this._routerMicrolib.getHandler = this._handlerResolver(
            this._routerMicrolib.getHandler.bind(this._routerMicrolib)
          );
        }
      }
      return isSetup;
    },

    _handlerResolver(original) {
      return name => {
        let bundle = lazyBundle(name, this._engineInfoByRoute);
        if (!bundle || bundle.loaded) {
          return original(name);
        }

        let token = waiter.beginAsync();

        return bundle.load().then(
          () => {
            waiter.endAsync(token);
            bundle.loaded = true;
            return original(name);
          },
          err => {
            waiter.endAsync(token);
            throw err;
          }
        );
      };
    },
  });
} else {
  Router = EmberRouter;
}

export default Router;
