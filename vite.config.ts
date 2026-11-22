import { defineConfig } from 'vite-plus'

const ignored = [
  '.git/**',
  '.turbo/**',
  '.alchemy/**',
  '.wrangler/**',
  'node_modules/**',
  'dist/**',
  'coverage/**',
]

export default defineConfig({
  fmt: {
    ignorePatterns: [...ignored, '**/*.d.ts'],
    semi: false,
    singleQuote: true,
    trailingComma: 'all',
  },
  lint: {
    ignorePatterns: ignored,
    options: { typeAware: true, typeCheck: false },
    plugins: ['typescript', 'unicorn', 'oxc'],
    rules: {
      'no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
      'typescript/no-explicit-any': 'error',
    },
  },
})
