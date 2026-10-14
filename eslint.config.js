// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*"],
  },
  {
    // react-hooks/immutability assumes React Compiler semantics (app.json has
    // experiments.reactCompiler: false) and doesn't recognize Reanimated's
    // SharedValue.value mutation — the documented way to drive worklets.
    rules: {
      "react-hooks/immutability": "off",
    },
  },
]);
