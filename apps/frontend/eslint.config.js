const nextConfig = require("eslint-config-next/core-web-vitals");

module.exports = [
  ...nextConfig,
  {
    rules: {
      // React Compiler's stricter rules flag valid patterns (reading DOM/localStorage
      // on mount, initializing loading state). These codebase patterns are intentional.
      "react-hooks/set-state-in-effect": "off",
    },
  },
];
