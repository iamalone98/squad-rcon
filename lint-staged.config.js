export default {
  'src/**/*.ts': [
    () => 'tsc -p tsconfig.json --noEmit',
    'eslint',
    'prettier --write',
  ],
};
