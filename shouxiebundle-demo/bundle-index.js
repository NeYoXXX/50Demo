import fs from 'fs'
import path from 'path'
import babelParser from '@babel/parser'
import traverse from '@babel/traverse'

/**
 * 图结构
 * 1.读取文件内容
 * 2.查询依赖关系
 *      正则查询
 *      构建sat √
 * 3.构建捆绑后的文件样式 TODO:可仿照test.js,继续完善，test1.js是崔老师的方式
 *
 */
function lujing (pathName){
    return path.resolve('./src',pathName)
}

function createAsset(filePath) {
  const depTemp = []
  const fileStr = fs.readFileSync(filePath, 'utf-8')
  const ast = babelParser.parse(fileStr, {
    sourceType: 'module',
  })
  traverse.default(ast, {
    ImportDeclaration({ node }) {
        depTemp.push(node.source.value)
    },
  })
  return {
    name:filePath,
    deps:depTemp
  }
}

function createGraph(){
    const mainAsset = createAsset('./src/main.js')
    const queue = [mainAsset]
    for (const item of queue) {
        item.deps.forEach(relativePath=>{
            const temp = createAsset(lujing(relativePath))
            console.log(temp);
        })
    }
}
createGraph()
