const path = require("path");
const webpack = require("webpack");

const SRC_PATH = path.resolve(__dirname, "./src");
const DIST_SSR_PATH = path.resolve(__dirname, "../dist-ssr");

/** @type {import('webpack').Configuration} */
const config = {
  target: "node",
  devtool: false,
  entry: path.resolve(SRC_PATH, "./entry-server.tsx"),
  mode: "production",
  module: {
    rules: [
      {
        exclude: /node_modules/,
        test: /\.(jsx?|tsx?|mjs|cjs)$/,
        use: [{ loader: "babel-loader" }],
      },
      {
        test: /\.css$/i,
        use: [{ loader: path.resolve(__dirname, "./ssr-null-loader.js") }],
      },
      {
        resourceQuery: /binary/,
        type: "asset/bytes",
      },
    ],
  },
  output: {
    filename: "entry-server.cjs",
    path: DIST_SSR_PATH,
    libraryTarget: "commonjs2",
    clean: true,
  },
  plugins: [
    new webpack.EnvironmentPlugin({
      BUILD_DATE: new Date().toISOString(),
      COMMIT_HASH: process.env.SOURCE_VERSION || "",
      NODE_ENV: "production",
    }),
  ],
  resolve: {
    extensions: [".tsx", ".ts", ".mjs", ".cjs", ".jsx", ".js"],
    alias: {
      "bayesian-bm25$": path.resolve(__dirname, "node_modules", "bayesian-bm25/dist/index.js"),
      ["kuromoji$"]: path.resolve(__dirname, "node_modules", "kuromoji/build/kuromoji.js"),
    },
  },
  optimization: {
    minimize: false,
  },
  ignoreWarnings: [],
};

module.exports = config;
