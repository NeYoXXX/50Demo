/**
 * webpack version 4
 */
 const path = require('path');
 const HtmlWebpackPlugin = require('html-webpack-plugin');
 const { CleanWebpackPlugin } = require('clean-webpack-plugin');
 
 module.exports = {
   entry: {
     index:'./src/index.js',
   },
   output: {
     filename: '[name].bundle.js',
     path: path.resolve(__dirname, 'dist'),
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
   ]
 };