import tseslint from "typescript-eslint";

/**
 * ESLint 9 扁平配置。
 * 说明：ESLint 9 自身不具备 TypeScript 解析能力，8.1 的依赖清单里没有解析器，
 * 因此补充 `typescript-eslint`（仅 lint 期使用，不进入运行时）。
 */
export default tseslint.config(
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "archive/**",
      "logs/**",
      "public/**",
      "next-env.d.ts",
      "playwright-report/**",
      "test-results/**",
    ],
  },
  ...tseslint.configs.recommended,
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/consistent-type-imports": "off",
    },
  },
);
