import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import reactPlugin from 'eslint-plugin-react'
import importPlugin from 'eslint-plugin-import'
import unusedImports from 'eslint-plugin-unused-imports'

// Use the actual config object from eslint-plugin-react instead of a string
const reactRecommended = reactPlugin.configs.recommended

export default tseslint.config(
  { ignores: [
    'dist',
    'supabase/functions/**',
    '**/__tests__/**',
    '*.config.js',
    '*.config.ts'
  ] },
  {
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommended,
      // Do NOT spread reactRecommended here; instead, add rules below.
    ],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    // Flat config: plugins must be an object mapping names to plugin objects
    plugins: {
      react: reactPlugin,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      import: importPlugin,
      'unused-imports': unusedImports,
    },
    // Manually add recommended React rules (from eslint-plugin-react)
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      // React recommended rules (from plugin:react/recommended)
      'react/display-name': 'off',
      'react/jsx-key': 'error',
      'react/jsx-no-comment-textnodes': 'error',
      'react/jsx-no-duplicate-props': 'error',
      'react/jsx-no-target-blank': 'error',
      'react/jsx-no-undef': 'error',
      'react/jsx-uses-react': 'off', // Not needed in React 17+
      'react/jsx-uses-vars': 'error',
      'react/no-children-prop': 'error',
      'react/no-danger-with-children': 'error',
      'react/no-deprecated': 'error',
      'react/no-direct-mutation-state': 'error',
      'react/no-find-dom-node': 'error',
      'react/no-is-mounted': 'error',
      'react/no-render-return-value': 'error',
      'react/no-string-refs': 'error',
      'react/no-unescaped-entities': 'error',
      'react/no-unknown-property': 'error',
      'react/no-unsafe': 'error',
      'react/no-unused-prop-types': 'off',
      'react/no-unused-state': 'error',
      'react/prefer-es6-class': 'error',
      'react/prop-types': 'off', // Using TypeScript
      'react/react-in-jsx-scope': 'off', // Not needed in React 17+
      'react/require-render-return': 'error',
      // Import order and unused imports
      'import/order': [
        'error',
        {
          'alphabetize': { order: 'asc', caseInsensitive: true },
          'groups': [['builtin', 'external'], 'internal', ['parent', 'sibling', 'index']],
          'newlines-between': 'always'
        }
      ],
      'unused-imports/no-unused-imports': 'error',
      'unused-imports/no-unused-vars': [
        'warn',
        { vars: 'all', varsIgnorePattern: '^_', args: 'after-used', argsIgnorePattern: '^_' }
      ],
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
  },
)
