export default {
  '**/*.ts': [
    () => 'tsc -p tsconfig.json --noEmit',
    'eslint',
    'prettier --write',
  ],
};
