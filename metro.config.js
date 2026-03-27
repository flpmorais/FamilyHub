// https://docs.expo.dev/guides/customizing-metro/
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Fix: @powersync/op-sqlite lib/module/index.js (ESM) uses explicit .js extension in export
// declarations which Metro's ESM resolver cannot handle. Route all imports of the package
// and internal relative paths within lib/module/ to the CommonJS build instead.
const OP_SQLITE_CJS = path.resolve(
  __dirname,
  'node_modules/@powersync/op-sqlite/lib/commonjs/index.js'
);

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === '@powersync/op-sqlite') {
    return { filePath: OP_SQLITE_CJS, type: 'sourceFile' };
  }
  // Intercept relative .js imports originating from lib/module/ and redirect to lib/commonjs/
  if (
    context.originModulePath &&
    context.originModulePath.includes('@powersync/op-sqlite/lib/module')
  ) {
    const cjsOrigin = context.originModulePath.replace(
      `${path.sep}lib${path.sep}module${path.sep}`,
      `${path.sep}lib${path.sep}commonjs${path.sep}`
    );
    const resolved = path.resolve(path.dirname(cjsOrigin), moduleName);
    return { filePath: resolved, type: 'sourceFile' };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
