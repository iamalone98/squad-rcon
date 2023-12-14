import { dts } from 'rollup-plugin-dts';
import typescript from '@rollup/plugin-typescript';

const config = [
  {
    input: "src/index.ts",
    output: {
      dir: 'lib',
      format: 'cjs'
    },
    plugins: [typescript()]
  },
  {
    input: './lib/types/index.d.ts',
    output: [{ file: 'lib/index.d.ts', format: 'es' }],
    plugins: [dts()],
  },
];

export default config;
