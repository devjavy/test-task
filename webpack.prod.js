

const HtmlWebpackPlugin = require('html-webpack-plugin');
const path = require('path');

module.exports = {
  mode: 'production',
  entry: './src/index.js',
  output: {
    filename: 'polygon-editor.min.js',
    path: path.resolve(__dirname, 'docs'), // чтобы встало на github pages
  },
  plugins: [new HtmlWebpackPlugin({
    title: "Тестовое для ГК Триумф",
    template: "./public/index.html"
  })]
};
