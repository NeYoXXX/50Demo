/**
 * webpack version 4
 */
 const path = require('path');
 const HtmlWebpackPlugin = require('html-webpack-plugin');
 const { CleanWebpackPlugin } = require('clean-webpack-plugin');
 
 module.exports = {
   // 开发模式
   mode: 'development',
   devtool:'inline-source-map',
   devServer: {
     contentBase: './dist',
   },
   entry: {
     index:'./src/index.js',
     print:'./src/print.js',
     another: './src/another-module.js',
   },
   output: {
     filename: '[name].bundle.js',
     path: path.resolve(__dirname, 'dist'),
     publicPath: '/',
   },
   module:{
     rules:[
       {
         test:/\.css$/,
         use:[
           'style-loader',
           'css-loader'
         ]
       }
     ]
   },
   plugins: [
     // 会把dist文件夹下的文件全部清除
     new CleanWebpackPlugin(),
     new HtmlWebpackPlugin({
       title: 'Development',
     }),
   ],
   optimization: {
     // 使用SplitChunksPlugin插件
     splitChunks: {
       chunks: 'all',
     },
   },
 };