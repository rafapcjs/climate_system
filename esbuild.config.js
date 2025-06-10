const esbuild = require('esbuild');

esbuild.build({
  entryPoints: ['./src/server.js'],
  bundle: true,
  platform: 'node',
  target: 'node18',
  outfile: 'build/index.js',
  sourcemap: true,
  external: ['express'], // evita incluir dependencias de node_modules si quieres un bundle más liviano
}).catch(() => process.exit(1));