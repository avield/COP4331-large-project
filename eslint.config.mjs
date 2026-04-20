import js from "@eslint/js";

export default[
  js.configs.recommended,
  {
    files:["backend/**/*.mjs", "backend/**/*.js"],
    languageOptions: {
      sourceType: "module",
      ecmaVersion: "latest",
      globals: {
        console: "readonly",
        process: "readonly"
      }
    }
  }
];