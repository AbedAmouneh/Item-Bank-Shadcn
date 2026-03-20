import baseConfig from './eslint.base.config.mjs';
import nx from '@nx/eslint-plugin';
import noSxLayoutPropsRule from './eslint-rules/no-sx-layout-props.mjs';

export default [
  ...baseConfig,
  {
    ignores: ['**/dist', '**/out-tsc', '**/vite.config.*.timestamp*'],
  },
  {
    files: [
      '**/*.ts',
      '**/*.tsx',
      '**/*.cts',
      '**/*.mts',
      '**/*.js',
      '**/*.jsx',
      '**/*.cjs',
      '**/*.mjs',
    ],
    rules: {
      '@nx/enforce-module-boundaries': [
        'error',
        {
          allow: [],
          depConstraints: [
            { sourceTag: 'type:app', onlyDependOnLibsWithTags: ['type:lib'] },
            { sourceTag: 'type:lib', onlyDependOnLibsWithTags: ['type:lib'] },
          ],
        },
      ],
    },
  },
  {
    files: ['**/eslint.config.mjs', '**/eslint.config.js', '**/.eslintrc.*'],
    rules: { '@nx/enforce-module-boundaries': 'off' },
  },
  ...nx.configs['flat/react'],
  {
    files: ['**/*.tsx'],
    ignores: [
      '**/src/pages/free-hand-drawing/**',
      '**/src/pages/record-audio/**',
      'libs/questions/src/pages/free-hand-drawing/**',
      'libs/questions/src/pages/record-audio/**',
    ],
    plugins: {
      'item-bank': {
        rules: { 'no-sx-layout-props': noSxLayoutPropsRule },
      },
    },
    rules: {
      'item-bank/no-sx-layout-props': 'error',
    },
  },
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    rules: {},
  },
];
