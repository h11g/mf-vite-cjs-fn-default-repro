'use strict';

// A CommonJS package built by tsc with `esModuleInterop`, i.e. `__esModule: true`
// plus a `default` export. The only thing that matters for this repro is the
// SHAPE: `default` is a *function*, and there are also named exports next to it.
//
// This is exactly the shape of `@shopify/app-bridge`, where `default` is
// `createApp` and `LifecycleHook` / `MessageType` / ... sit beside it, but no
// third-party package is needed to reproduce.

Object.defineProperty(exports, '__esModule', { value: true });

function createThing(config) {
  return { config: config };
}

exports.createThing = createThing;

// A named export a CommonJS consumer reads off the namespace.
var SOME_ENUM;
(function (SOME_ENUM) {
  SOME_ENUM.A = 'A';
  SOME_ENUM.B = 'B';
})((SOME_ENUM = exports.SOME_ENUM || (exports.SOME_ENUM = {})));

// `default` is a FUNCTION, not an object. This is the trigger.
Object.defineProperty(exports, 'default', {
  enumerable: true,
  get: function () {
    return createThing;
  },
});
