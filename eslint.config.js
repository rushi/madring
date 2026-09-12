import pluginJs from "@eslint/js";
import { globalIgnores } from "eslint/config";
import eslintComments from "eslint-plugin-eslint-comments";
import pluginImport from "eslint-plugin-import";
import pluginN from "eslint-plugin-n";
import extendNative from "eslint-plugin-no-use-extend-native";
import prettier from "eslint-plugin-prettier/recommended";
import pluginReact from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import unicorn from "eslint-plugin-unicorn";
import globals from "globals";
import tseslint from "typescript-eslint";

/** @type {import('eslint').Linter.Config[]} */
export default [
    globalIgnores([
        "**/node_modules",
        "**/dist",
        "**/docs",
        "**/git_ignore",
        "public/data",
        "src/styles/tokens.generated.css",
        "eslint.config.js",
        "vite.config.ts",
    ]),
    {
        settings: { react: { version: "detect" } },
        plugins: {
            unicorn,
            "eslint-comments": eslintComments,
            import: pluginImport,
            n: pluginN,
            "no-use-extend-native": extendNative,
        },
    },
    prettier,
    pluginJs.configs.recommended,
    ...tseslint.configs.recommended,
    {
        rules: {
            "@typescript-eslint/no-explicit-any": "off",
            "@typescript-eslint/no-unused-vars": [
                "error",
                { varsIgnorePattern: "^_", argsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" },
            ],
            "@typescript-eslint/ban-ts-comment": [
                "warn",
                {
                    "ts-ignore": "allow-with-description",
                    "ts-expect-error": "allow-with-description",
                    "ts-nocheck": "allow-with-description",
                    minimumDescriptionLength: 5,
                },
            ],
            "@typescript-eslint/no-dynamic-delete": "error",
            "@typescript-eslint/no-empty-interface": ["error", { allowSingleExtends: true }],
            "@typescript-eslint/prefer-as-const": "error",
            "@typescript-eslint/prefer-for-of": "error",
            "@typescript-eslint/prefer-function-type": "error",
            "capitalized-comments": "off",
            complexity: ["warn", { max: 25 }],
            "eslint-comments/disable-enable-pair": ["error", { allowWholeFile: true }],
            "eslint-comments/no-aggregating-enable": "error",
            "import/extensions": "off",
            "import/named": "off",
            "import/no-unresolved": "off",
            "import/newline-after-import": "error",
            "import/no-anonymous-default-export": "error",
            "import/no-cycle": ["error", { ignoreExternal: true }],
            "import/no-useless-path-segments": "error",
            "max-params": ["error", 6],
            "max-depth": ["error", 6],
            "n/no-path-concat": "error",
            "n/prefer-global/process": "error",
            "n/prefer-global/url-search-params": "error",
            "n/prefer-global/url": "error",
            "n/prefer-promises/fs": "error",
            "n/process-exit-as-throw": "error",
            "n/no-unsupported-features/node-builtins": "off",
            "new-cap": "error",
            "no-alert": "error",
            "no-empty": ["error", { allowEmptyCatch: true }],
            "no-implicit-coercion": ["error", { boolean: false }],
            "no-use-extend-native/no-use-extend-native": "error",
            "object-shorthand": ["error", "methods"],
            "prefer-const": ["error", { destructuring: "all", ignoreReadBeforeAssign: false }],
            "unicorn/better-regex": "error",
            "unicorn/prefer-ternary": ["error", "only-single-line"],
        },
    },
    pluginReact.configs.flat.recommended,
    {
        files: ["**/*.{jsx,tsx}"],
        languageOptions: { globals: globals.browser },
    },
    reactHooks.configs.flat["recommended-latest"],
    {
        files: ["**/*.{jsx,tsx}"],
        rules: {
            "react/function-component-definition": [
                "error",
                {
                    namedComponents: ["function-declaration", "function-expression", "arrow-function"],
                    unnamedComponents: ["function-expression", "arrow-function"],
                },
            ],
            "react/hook-use-state": "off",
            "react/jsx-max-depth": ["error", { max: 7 }],
            "react/prop-types": "off",
            "react/react-in-jsx-scope": "off",
        },
    },
    {
        files: ["scripts/**/*.ts"],
        languageOptions: { globals: globals.node },
    },
];
