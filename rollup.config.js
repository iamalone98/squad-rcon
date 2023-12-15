import typescript from '@rollup/plugin-typescript';
import { dts } from 'rollup-plugin-dts';

const config = [
  {
    input: 'src/index.ts',
    output: {
      dir: 'lib',
    },
    plugins: [typescript()],
  },
  {
    input: './lib/types/index.d.ts',
    output: [{ file: 'lib/index.d.ts', format: 'es' }],
    plugins: [dts()],
  },
];

export default config;
