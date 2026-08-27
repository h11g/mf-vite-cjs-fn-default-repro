# Minimal repro: sharing a CommonJS package whose `default` is a function loses all its named exports (build only)

`@module-federation/vite` **1.21.0** + Vite **7.3.6**, production build.

Share a CommonJS package that has `__esModule: true`, a `default` export that is a
**function**, and named exports beside it. Any CommonJS consumer that does
`import * as ns from 'that-package'` (i.e. `__importStar(require(...))`) then gets
the **function** instead of the module object, so every named export is gone:

```
TypeError: Cannot read properties of undefined (reading 'A')
```

Not shared → works. Dev → works. Vite 8 / rolldown → works. Only the Vite 7
(rollup) production build is affected.

This is not a timing problem. The page waits for the share cache to be populated
and prints it, so you can see the cache holds the whole module object while
`require()` still receives only the function.

## Reproduce

```bash
npm install
npm run build
npm run preview      # http://localhost:4180
```

Actual output on the page (and in the console):

```
share cache key    : default:cjs-fn-default@1.0.0
share cache value  : object { SOME_ENUM, createThing, default }
  .default         : function
  .SOME_ENUM       : object
probe()            : THREW TypeError: Cannot read properties of undefined (reading 'A')
```

Expected (what every other configuration prints):

```
probe()            : OK {"defaultIsFunction":true,"enumA":"A"}
```

## Result matrix

All rows verified with this repro, only `vite.config.ts` / the `vite` version changed.

| Vite | Mode | `shared` entry | Result |
|---|---|---|---|
| 7.3.6 (rollup) | build | `'cjs-fn-default': { singleton: false }` | ❌ `TypeError` |
| 7.3.6 (rollup) | build | `'cjs-fn-default': { singleton: true }` | ❌ `TypeError` |
| 7.3.6 (rollup) | build | not shared | ✅ `OK {"defaultIsFunction":true,"enumA":"A"}` |
| 7.3.6 (rollup) | dev | `'cjs-fn-default': { singleton: false }` | ✅ |
| 8.2.2 (rolldown) | build | `'cjs-fn-default': { singleton: false }` | ✅ |

## What the repro contains

Three files carry the whole case; no third-party package is involved.

`packages/cjs-fn-default/index.js` — the shared package. The only thing that
matters is the shape: `__esModule: true`, named exports, and a `default` that is a
function.

```js
Object.defineProperty(exports, '__esModule', { value: true });
function createThing(config) { return { config: config }; }
exports.createThing = createThing;
exports.SOME_ENUM = { A: 'A', B: 'B' };
Object.defineProperty(exports, 'default', {
  enumerable: true,
  get: function () { return createThing; },   // <- default is a FUNCTION
});
```

`packages/cjs-fn-default-consumer/index.js` — verbatim `tsc` output for
`import * as lib from 'cjs-fn-default'` with `module: commonjs` +
`esModuleInterop: true`. The `__importStar` / `__createBinding` /
`__setModuleDefault` helpers are tsc's, unmodified.

```js
var lib = __importStar(require('cjs-fn-default'));
function probe() {
  return {
    defaultIsFunction: typeof lib.default === 'function',
    enumA: lib.SOME_ENUM.A,     // <- throws
  };
}
```

`vite.config.ts` — one `shared` entry is the whole repro.

## Why it breaks

Vite's rollup build sends the CommonJS consumer's `require()` through a
`?commonjs-proxy` copy of the generated `loadShare` module, and that copy exports
only the **ESM default** of the shared module:

```js
// dist/assets/__virtual_mf___..._loadShare__cjs_mf_2_fn_mf_2_default__loadShare__.js_commonjs-proxy-<hash>.js
let __mf_default;
const __mfApplyLazyShareExports = (mod) => {
  mod["createThing"];
  mod["SOME_ENUM"];
  __mf_default = mod.default ?? mod;    // <- mod.default is `createThing`, a function
};
export { __mf_default as _ };
```

The consumer chunk then binds `require()` to that default:

```js
// dist/assets/index-<hash>.js
import { _ as __mf_default } from "./__virtual_mf___..._commonjs-proxy-<hash>.js";
...
var lib = __importStar(__mf_default);    // __mf_default === createThing
```

`__importStar` only passes a value through untouched when it has
`__esModule: true`. A function does not, so tsc's helper builds
`{ default: createThing }` — a function has no enumerable own properties to copy —
and every named export is dropped. `lib.SOME_ENUM` is `undefined`.

`__mf_default = mod.default ?? mod` is correct for the module's *ESM default
export*, but it is the wrong value to hand a `require()`. CommonJS interop needs
the module object itself (`__esModule: true` + `default` + the named exports),
which is exactly what the share cache already holds.

With `singleton: true` the generated code differs but has the same defect — an
unwrap loop that returns the `default` as soon as it is not an object:

```js
const defaultExport = current == null ? void 0 : current.default;
if (!defaultExport || typeof defaultExport !== "object") return defaultExport ?? current;
current = defaultExport;
```

For a CommonJS module whose `default` is a function this always returns the
function, so the loop can never yield something that carries both `default` and
the named exports.

In `src/virtualModules/virtualShared_preBuild.ts` (1.21.0) the relevant spots are
`generateShareModuleUnwrapCode()` with `stopWithReturn: 'defaultExport ?? current'`,
and the `__mf_default = mod.default ?? mod` assignments in the lazy-share export
generators.

## Suggested direction

Keep the ESM `default` as it is, but give the `?commonjs-proxy` variant the module
object rather than the unwrapped default, preserving `__esModule` so `__importStar`
passes it through.

The shape is common in packages compiled by `tsc` with `esModuleInterop` that
export a factory as `default` plus enums/constants as named exports —
`@shopify/app-bridge` is one published example (`default` is `createApp`, with
`LifecycleHook`, `MessageType`, `Context`, … beside it).

## Notes

- `.npmrc` sets `install-links=true` so the two local `file:` packages are installed
  as real copies under `node_modules` instead of symlinks. That only matters because
  Vite's default `build.commonjsOptions.include` is `[/node_modules/]`; in a real
  project these are ordinary registry dependencies and no setting is needed.
- `build.minify` is off so the generated share module stays readable.
- Environment: node 24.4.1, npm 11.4.2, macOS arm64.
