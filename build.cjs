const { build } = require('esbuild');
const { nodeExternalsPlugin } = require('esbuild-node-externals');

build({
  entryPoints: ['./src/js/utils.js'],
  bundle: true,
  platform: 'node',
  outfile: 'dist/utils.js',
  plugins: [nodeExternalsPlugin()],
}).catch(() => process.exit(1));

build({
  entryPoints: ['./src/js/render.js'],
  bundle: true,
  platform: 'node',
  outfile: 'dist/render.js',
  plugins: [nodeExternalsPlugin()],
}).catch(() => process.exit(1));

build({
  entryPoints: ['./src/js/debug.js'],
  bundle: true,
  platform: 'node',
  outfile: 'dist/debug.js',
  plugins: [nodeExternalsPlugin()],
}).catch(() => process.exit(1));

build({
  entryPoints: ['./src/js/config.js'],
  bundle: true,
  platform: 'node',
  outfile: 'dist/config.js',
  plugins: [nodeExternalsPlugin()],
}).catch(() => process.exit(1));

build({
  entryPoints: ['./src/js/init.js'],
  bundle: true,
  platform: 'node',
  outfile: 'dist/init.js',
  plugins: [nodeExternalsPlugin()],
}).catch(() => process.exit(1));