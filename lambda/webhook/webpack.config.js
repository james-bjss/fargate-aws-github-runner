/* eslint-disable @typescript-eslint/no-var-requires */
const path = require('path');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');

module.exports = {
  entry: './src/index.ts',
  target: 'node',
  output: {
    libraryTarget: 'commonjs2',
    path: path.join(__dirname, 'dist'),
    filename: 'index.js',
    clean: true,
  },
  optimization: {
    minimize: true,
    minimizer: [new TerserPlugin()],
  },
  module: {
    rules: [
      {
        test: /\.ts?$/,
        use: ['ts-loader'],
        exclude: /node_modules/,
      },
      {
        test: /node_modules\/@octokit\/webhooks(-methods)?/,
        resolve: {
          mainFields: ['main'],
        },
      },
    ],
  },
  resolve: {
    extensions: ['.ts', '.js', '.json'],
  },
  mode: 'production',
  devtool: 'source-map',
  ignoreWarnings: [
    {
      module: /@aws-sdk/,
      message: /aws-crt/,
    },
    (warning) => true,
  ],
};
