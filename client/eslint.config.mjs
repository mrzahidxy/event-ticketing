import { FlatCompat } from '@eslint/eslintrc'

const compat = new FlatCompat({
  baseDirectory: import.meta.dirname,
})

const config = [
  {
    ignores: [
      '**/node_modules/**',
      '.next/**',
      'out/**',
      'Digital Menu Builder UI - Client/**',
    ],
  },
  ...compat.extends('next/core-web-vitals', 'prettier'),
  {
    rules: {
      'import/order': 'off',
      'prefer-arrow-callback': 'warn',
      'no-console': [
        'warn',
        {
          allow: ['warn', 'error'],
        },
      ],
    },
  },
]

export default config
