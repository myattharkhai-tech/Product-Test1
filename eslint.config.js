import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist', 'supabase/functions/**'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      // Security: block dangerous APIs globally in app code
      'no-restricted-syntax': [
        'error',
        {
          selector: "CallExpression[callee.object.name='child_process']",
          message: 'child_process is forbidden — no shell/process execution allowed.',
        },
        {
          selector: "CallExpression[callee.name='eval']",
          message: 'eval() is forbidden in app code.',
        },
        {
          selector: "NewExpression[callee.name='Function']",
          message: 'Dynamic Function() constructor is forbidden in app code.',
        },
      ],
    },
  },
  // Stricter rules for AI chat feature files only
  {
    files: ['src/lib/api.ts', 'src/components/ChatPanel.tsx'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: "CallExpression[callee.object.name='child_process']",
          message: 'child_process is forbidden in chat feature code.',
        },
        {
          selector: "CallExpression[callee.name='eval']",
          message: 'eval() is forbidden in chat feature code.',
        },
        {
          selector: "NewExpression[callee.name='Function']",
          message: 'Dynamic Function() is forbidden in chat feature code.',
        },
        {
          selector: "CallExpression[callee.object.name='console'][callee.property.name='log']",
          message: 'console.log is forbidden in chat feature code — never log API keys, user messages, or auth headers.',
        },
      ],
    },
  }
);
