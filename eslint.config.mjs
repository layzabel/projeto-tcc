import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';
import sonarjs from 'eslint-plugin-sonarjs';
import prettier from 'eslint-config-prettier';

const eslintConfig = [
  {
    ignores: [
      'node_modules/**',
      '.next/**',
      'out/**',
      'coverage/**',
      '.scannerwork/**',
      'next-env.d.ts',
      'tests/fixtures/**',
    ],
  },
  ...nextCoreWebVitals,
  ...nextTypescript,
  sonarjs.configs.recommended,
  {
    rules: {
      complexity: ['error', 10],
      'sonarjs/cognitive-complexity': ['error', 15],
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },
  prettier,
];

export default eslintConfig;
