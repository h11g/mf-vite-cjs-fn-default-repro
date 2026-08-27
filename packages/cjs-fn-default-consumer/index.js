'use strict';

// Verbatim tsc output for:
//
//   import * as lib from 'cjs-fn-default';
//   export function probe() { ... }
//
// compiled with `module: commonjs` + `esModuleInterop: true`. The helpers below
// are tsc's, unmodified — nothing here is hand-rolled interop.
var __createBinding =
  (this && this.__createBinding) ||
  (Object.create
    ? function (o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        var desc = Object.getOwnPropertyDescriptor(m, k);
        if (!desc || ('get' in desc ? !m.__esModule : desc.writable || desc.configurable)) {
          desc = {
            enumerable: true,
            get: function () {
              return m[k];
            },
          };
        }
        Object.defineProperty(o, k2, desc);
      }
    : function (o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        o[k2] = m[k];
      });
var __setModuleDefault =
  (this && this.__setModuleDefault) ||
  (Object.create
    ? function (o, v) {
        Object.defineProperty(o, 'default', { enumerable: true, value: v });
      }
    : function (o, v) {
        o['default'] = v;
      });
var __importStar =
  (this && this.__importStar) ||
  function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null)
      for (var k in mod)
        if (k !== 'default' && Object.prototype.hasOwnProperty.call(mod, k))
          __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
  };
Object.defineProperty(exports, '__esModule', { value: true });
exports.probe = void 0;

var lib = __importStar(require('cjs-fn-default'));

function probe() {
  return {
    // The default export is reached correctly either way.
    defaultIsFunction: typeof lib.default === 'function',
    // A named export. Expected 'A'. When the shared module handed `require()`
    // the unwrapped function instead of the module object, `lib.SOME_ENUM` is
    // undefined and this line throws:
    //   TypeError: Cannot read properties of undefined (reading 'A')
    enumA: lib.SOME_ENUM.A,
  };
}
exports.probe = probe;
