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
- optimization.runtimeChunk = 'single'
- optimization.splitChunks.cacheGroups.vendor = {test: /[\\/]node_modules[\\/]/, name: 'vendors',chunks: 'all'}
- optimization.moduleIds='hashed'
## Authoring Libraries
目标：
- ES2015 模块。即import webpackNumbers from 'webpack-numbers'。
- CommonJS 模块。即require('webpack-numbers')。
- 通过script标签包含的全局变量。
- 使用externals以避免捆绑lodash，因此消费者需要加载它。
- 将库名称设置为webpack-numbers.
- 将库公开为名为webpackNumbers.
- 能够访问 Node.js 中的库。
libraryTarget:
- Variable: as a global variable made available by a script tag (libraryTarget:'var').
- This: available through the this object (libraryTarget:'this').
- Window: available through the window object, in the browser (libraryTarget:'window').
- UMD: available after AMD or CommonJS require (libraryTarget:'umd').
## 环境变量
命令行修改环境变量
webpack --env.NODE_ENV=local --env.production --progress
## 构建性能
- Loaders + include:'path'
- Bootstrap 每个额外的加载器/插件都有一个启动时间。尝试使用尽可能少的工具。
- Resolving 
  - 尽量减少resolve.modules, resolve.extensions, resolve.mainFiles, 中的项目数resolve.descriptionFiles，因为它们会增加文件系统调用的数量。
  - 设置resolve.symlinks: false是否不使用符号链接（例如npm link或yarn link）。
  - 设置resolve.cacheWithContext: false是否使用不特定于上下文的自定义解析插件。
- Smaller = Faster
  - 使用更少/更小的库。
  - 使用SplitChunksPlugin在多页应用。
  - 在多页应用程序中使用SplitChunksPlugininasync模式。
  - 删除未使用的代码。
  - 仅编译您当前正在开发的代码部分
- Worker Pool 该thread-loader可用于卸载昂贵装载机的工作池。
- Persistent cache 使用cache-loader. 清除缓存目录"postinstall"中的package.json
- Custom plugins/loaders 对它们进行概要分析，以免在此处引入性能问题。
- Progress plugin 可以通过progress-plugin从 webpack 的配置中删除来缩短构建时间。请记住，progress-plugin可能也不会为快速构建提供尽可能多的价值，因此请确保您正在利用使用它的好处。
### Development
- 增量构建 使用 webpack 的 watch 模式。不要使用其他工具来监视你的文件和调用 webpack。内置监视模式将跟踪时间戳并将此信息传递给编译以进行缓存失效。在某些设置中，观看会退回到轮询模式。对于许多监视文件，这可能会导致大量 CPU 负载。在这些情况下，您可以使用 增加轮询间隔watchOptions.poll。
- 在内存中编译
  - webpack-dev-server
  - webpack-hot-middleware
  - webpack-dev-middleware
- stats.toJson 速度
- Devtool
  - "eval" 具有最佳性能，但不能帮助您转译代码。
  - cheap-source-map如果您可以忍受稍差的映射质量，这些变体的性能会更高。
  - 使用eval-source-map变体进行增量构建。
  - => 在大多数情况下，cheap-module-eval-source-map是最好的选择。
- 避免生产特定的工具
  - TerserPlugin
  - ExtractTextPlugin
  - [hash]/[chunkhash]
  - AggressiveSplittingPlugin
  - AggressiveMergingPlugin
  - ModuleConcatenationPlugin
- 最小入口块
- 避免额外的优化步骤
  - webpack 做了额外的算法工作来优化输出的大小和负载性能。这些优化对于较小的代码库是有效的，但在较大的代码库中可能代价高昂：
  ```
  module.exports = {
    // ...
    optimization: {
      removeAvailableModules: false,
      removeEmptyChunks: false,
      splitChunks: false,
    },
  };
  ```
- 没有路径信息的输出 output.pathinfo = false
- TypeScript Loader
### Production
- Multiple Compilations
  - parallel-webpack：它允许在工作池中编译。
  - cache-loader: 缓存可以在多个编译之间共享。
- source map
## Content Security Policies
## Dependency Management
- require.context 
- importAll 

`importAll(require.context('../components/', true, /\.js$/));`
## Hot Module Replacement
- webpack-dev-server + devServer.hot=true
- module.hot.accept
## Tree Shaking
摇树是 JavaScript 上下文中常用于消除死代码的术语。它依赖于ES2015 模块语法的静态结构，即import和export。
- 使用 ES2015 模块语法（即import和export）。
- 确保没有编译器将您的 ES2015 模块语法转换为 CommonJS 模块（这是流行的 Babel 预设 @babel/preset-env 的默认行为 -有关更多详细信息，请参阅文档）。
- 将"sideEffects"属性添加到您的项目package.json文件中。
- 使用配置选项启用各种优化，包括缩小和摇树。production mode
## Production
- webpack-merge
- Minimize CSS

## Lazy Loading
- import()