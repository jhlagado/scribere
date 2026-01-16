export default [
  {
    files: ["**/*.js"],
    ignores: ["build/**", "temp/**", "node_modules/**"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "script",
      globals: {
        console: "readonly",
        process: "readonly",
        __dirname: "readonly",
        __filename: "readonly",
        module: "readonly",
        require: "readonly",
        Buffer: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly"
      }
    },
    rules: {
      "no-undef": "error",
      "no-unused-vars": ["error", { args: "none", varsIgnorePattern: "^_" }],
      "no-unused-expressions": "error",
      "no-constant-condition": "error",
      "no-empty": ["error", { allowEmptyCatch: true }]
    }
  }
];
