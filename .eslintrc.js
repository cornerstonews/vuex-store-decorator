module.exports = {
    root: true,

    env: {
        node: true,
        es6: true
    },

    rules: {
        // "no-console": process.env.NODE_ENV === "production" ? "error" : "off",
        "no-debugger": process.env.NODE_ENV === "production" ? "error" : "off"
    },

    parserOptions: {
        ecmaVersion: 2020,
        parser: "@typescript-eslint/parser",
        sourceType: "module"
    },

    extends: [
        "eslint:recommended",
        "plugin:@typescript-eslint/recommended", // Uses the recommended rules from @typescript-eslint/eslint-plugin
        "prettier/@typescript-eslint", // Disable ESLint rules from @typescript-eslint/eslint-plugin that conflicts with prettier
        "plugin:prettier/recommended" // eslint-plugin-prettier & eslint-config-prettier Make sure to keep this last
    ]
};
