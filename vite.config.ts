import { federation } from '@module-federation/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [
    federation({
      name: 'app',
      filename: 'remoteEntry.js',
      exposes: {
        '.': './src/expose.ts',
      },
      remotes: {},
      shared: {
        // The whole repro is this one line. Comment it out and the page renders.
        'cjs-fn-default': { singleton: false },
      },
    }),
  ],
  build: {
    target: 'chrome89',
    // Keep the generated share module readable.
    minify: false,
  },
});
