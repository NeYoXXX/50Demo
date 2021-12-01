# base concept
entry
output
loader
plugin
mode

webpack中模块分类
- import es6
- require() cmd
- define and require amd
- css/sass/less @import
- css中url() and `<img src='...'>`

# 案例
## Asset Management
## Output Management
- html-webpack-plugin
- clean-webpack-plugin
## Development
- `mode:'development'`
- source-map,`devtool:'inline-source-map'`
- Development Tool
  - webpack's Watch Mode  PS:自动build文件保存到本地，需要手动刷新，
  - webpack-dev-server  recommend  PS:文件保存再内存中不需要本地build的文件，此功能是自动编译并不是热替换，不需要手动刷新
  - webpack-dev-middleware PS:需要借助外部服务，如：express，使用node代理文件，文件保存再内存中不需要本地build的文件，需要手动刷新
## code splitting
支持三种用法
### Entry Points: 
Manually split code using entry configuration. 手动指定Entry文件名称。
缺点：
- 如果入口 chunk 之间包含一些重复的模块，那些重复模块都会被引入到各个 bundle 中。
- 这种方法不够灵活，并且不能动态地将核心应用程序逻辑中的代码拆分出来。
### Prevent Duplication
Use the SplitChunksPlugin to dedupe and split chunks. PS:使用SplitChunksPlugin
### Dynamic Imports: 
Split code via inline function calls within modules.  PS:使用import()函数导入
支持两种用法，分别是：
- ECMAScript 提议的动态导入的import()语法； recommend
- require.ensure()传统的、特定于 webpack 的方法。
## caching
- output filename `filename: '[name].[contenthash].js'`

