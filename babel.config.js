module.exports = (api) => {
  api.cache(false)
  if (process.env.NODE_ENV === "production") {
    return {
      presets: [
        [
          "@babel/preset-env",
          {
            targets: {
              browsers: ["last 2 versions", "safari >= 7"],
            },
          },
        ],
        "@babel/preset-react",
      ],
      plugins: [
        "@babel/plugin-proposal-class-properties",
        [
          "@babel/plugin-transform-runtime",
          {
            corejs: false,
            helpers: true,
            regenerator: false,
            useESModules: true,
          },
        ],
        "@babel/plugin-proposal-object-rest-spread",
      ],
    }
  } else {
    return {
      presets: ["@babel/preset-env", "@babel/preset-react"],
      plugins: [
        "@babel/plugin-proposal-class-properties",
        "@babel/plugin-transform-runtime",
        "@babel/plugin-proposal-object-rest-spread",
      ],
    }
  }
}
