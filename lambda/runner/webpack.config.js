/* eslint-disable @typescript-eslint/no-var-requires */
const path = require('path');
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
      // Prevents browser bundle being used
      {
        test: /node_modules\/@octokit\/auth(-app)?/,
        resolve: {
          mainFields: ['main'],
        },
      },
      {
        test: /node_modules\/@octokit\/rest/,
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
