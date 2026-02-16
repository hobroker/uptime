import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import eslintConfigPrettier from "eslint-config-prettier";
import unusedImports from "eslint-plugin-unused-imports";

/**
 * @param {import('eslint').Linter.Config[]} configs
 */
export function defineConfig(...configs) {
  return tseslint.config(
    eslint.configs.recommended,
    ...tseslint.configs.stylistic,
    eslintConfigPrettier,
    {
      plugins: {
        "unused-imports": unusedImports,
      },
      rules: {
        "prefer-const": "error",
        "no-unused-vars": "off",
        "unused-imports/no-unused-imports": "error",
        "unused-imports/no-unused-vars": [
          "warn",
          {
            vars: "all",
            varsIgnorePattern: "^_",
            args: "after-used",
            argsIgnorePattern: "^_",
          },
        ],
      },
    },
    {
      languageOptions: {
        parserOptions: {
          tsconfigRootDir: import.meta.dirname,
        },
      },
    },
    ...configs,
  );
}
