/* eslint-disable @typescript-eslint/no-var-requires */
import path from 'path';

let hasTSChecked = false;
const pkg = require('./package.json');
const name = 'index';
const iifeName = 'IframeManager';
const formats = [
  'cjs',
  'cjs.min',
  'cjs.runtime',
  'cjs.runtime.min',
  'esm',
  'esm.min',
  'esm.runtime',
  'esm.runtime.min',
  // 'iife',
  // 'iife.min',
];

const banner = `
/**
 * ${pkg.name}
 * ${pkg.description}
 *
 * @version ${pkg.version}
 * @author ${pkg.author}
 * @license ${pkg.license}
 * @link ${pkg.homepage}
 */
`.trimLeft();

const packageConfigs = formats.map(format => createConfig(format));

export default packageConfigs;

function createConfig(fileSuffix) {
  const format = fileSuffix.split('.')[0];
  const output = {
    banner,
    format,
    file: path.resolve(__dirname, `dist/${name}.${fileSuffix}.js`),
    exports: 'auto',
    sourcemap: true,
    externalLiveBindings: false,
    globals: {
      'iframe-resizer': 'window', // 这样配置是不能正确工作的，暂时不输出iife模式
      '@kaokei/post-bridge': 'PostBridge',
    },
  };

  const isRuntimeBuild = /runtime/.test(fileSuffix);
  const isProductionBuild = /\.min\.js$/.test(output.file);
  const isGlobalBuild = format === 'iife';
  const isESBuild = format === 'esm';
  const isCommonJSBuild = format === 'cjs';

  if (isGlobalBuild) {
    output.name = iifeName;
  }

  let entryFile = `src/index.ts`;

  // 这样写意味着不会打包任何npm包了
  let external = [
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.devDependencies || {}),
    ...Object.keys(pkg.peerDependencies || {}),
    ...['path', 'url', 'stream', 'fs', 'os'],
  ];

  const minifyPlugins = isProductionBuild ? [createMinifyPlugin(isESBuild)] : [];

  return {
    input: path.resolve(__dirname, entryFile),
    external,
    output,
    plugins: [
      createJsonPlugin(),
      createTypescriptPlugin(),
      createReplacePlugin(isProductionBuild),
      ...createNodePlugins(isCommonJSBuild),
      createBabelPlugin(isESBuild, isRuntimeBuild, isGlobalBuild),
      ...minifyPlugins,
    ],
    onwarn: (msg, warn) => {
      if (!/Circular/.test(msg)) {
        warn(msg);
      }
    },
    treeshake: {
      moduleSideEffects: false,
    },
  };
}

function createJsonPlugin() {
  const json = require('@rollup/plugin-json');
  return json({
    namedExports: false,
  });
}

function createTypescriptPlugin() {
  const hasTSChecked2 = hasTSChecked;
  hasTSChecked = true;
  const ts = require('rollup-plugin-typescript2');
  const shouldEmitDeclarations = pkg.types && !hasTSChecked2;
  const tsPlugin = ts({
    check: !hasTSChecked2,
    tsconfig: path.resolve(__dirname, 'tsconfig.app.json'),
    cacheRoot: path.resolve(__dirname, 'node_modules/.rts2_cache'),
    tsconfigOverride: {
      compilerOptions: {
        sourceMap: true,
        declaration: shouldEmitDeclarations,
        declarationMap: shouldEmitDeclarations,
      },
      exclude: ['**/__tests__', 'typings'],
    },
  });
  return tsPlugin;
}

function createReplacePlugin(isProductionBuild) {
  const replace = require('@rollup/plugin-replace');
  const replacements = {
    __VERSION__: pkg.version,
    __DEV__: !isProductionBuild,
  };
  return replace({
    values: replacements,
    preventAssignment: true,
  });
}

function createNodePlugins(isCommonJSBuild) {
  return isCommonJSBuild
    ? [
        require('@rollup/plugin-commonjs')({
          sourceMap: false,
        }),
        require('@rollup/plugin-node-resolve').nodeResolve(),
      ]
    : [
        require('@rollup/plugin-commonjs')({
          sourceMap: false,
        }),
        require('rollup-plugin-polyfill-node')(),
        require('@rollup/plugin-node-resolve').nodeResolve(),
      ];
}

function createBabelPlugin(isESBuild, isRuntimeBuild, isGlobalBuild) {
  const { getBabelOutputPlugin } = require('@rollup/plugin-babel');
  return isRuntimeBuild
    ? getBabelOutputPlugin({
        allowAllFormats: isGlobalBuild,
        presets: [['@babel/preset-env', { modules: false }]],
        plugins: [['@babel/plugin-transform-runtime', { useESModules: isESBuild }]],
      })
    : getBabelOutputPlugin({
        allowAllFormats: isGlobalBuild,
        presets: [['@babel/preset-env', { modules: false }]],
      });
}

function createMinifyPlugin(isESBuild) {
  const { terser } = require('rollup-plugin-terser');
  return terser({
    module: isESBuild,
    compress: {
      ecma: 2015,
      pure_getters: true,
    },
    safari10: true,
  });
}
