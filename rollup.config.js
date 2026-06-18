import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';
import terser from '@rollup/plugin-terser';

const dev = process.env.ROLLUP_WATCH === 'true';

export default {
  input: 'src/index.ts',
  output: {
    file: 'dist/pauls-cards.js',
    format: 'es',
    sourcemap: dev,
    inlineDynamicImports: true,
  },
  plugins: [
    resolve({
      browser: true,
      exportConditions: ['browser'],
    }),
    commonjs(),
    typescript({
      tsconfig: './tsconfig.json',
      sourceMap: dev,
      inlineSources: dev,
    }),
    !dev && terser(),
  ].filter(Boolean),
};
