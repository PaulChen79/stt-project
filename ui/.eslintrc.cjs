module.exports = {
  root: true,
  env: {
    browser: true,
    es2022: true,
  },
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
    ecmaFeatures: {
      jsx: true,
    },
  },
  plugins: ["react"],
  settings: {
    react: {
      version: "detect",
    },
  },
  extends: ["eslint:recommended"],
  rules: {
    "react/react-in-jsx-scope": "off",
    "react/jsx-uses-react": "off",
    "react/jsx-uses-vars": "error",
  },
};
