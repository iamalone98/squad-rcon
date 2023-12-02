import { dts } from 'rollup-plugin-dts';

const config = [
  {
    input: './lib/types/index.d.ts',
    output: [{ file: 'lib/index.d.ts', format: 'es' }],
    plugins: [dts()],
  },
];

export default config;
