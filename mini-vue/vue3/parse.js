const State = {
    initial:1,
    tagOpen:2,
    tagName:3,
    text:4,
    tagEnd:5,
    tagEndName:6
}

function isAlpha(char){
    return char >= 'a' && char <= 'z' || char >= 'A' && char <= 'Z'
}

// 状态机解析html元素
function tokenize(str){
    let currenState = State.initial
    const chars = []
    const tokens = []
    while (str) {
        const char = str[0]
        switch (currenState) {
            case State.initial:
                if(char === '<'){
                    currenState = State.tagOpen
                    str = str.slice(1)
                }else if(isAlpha(char)){
                    currenState = State.text
                    chars.push(char)
                    str = str.slice(1)
                }
                break;
        
            case State.tagOpen:
                if(isAlpha(char)){
                    currenState = State.tagName
                    chars.push(char)
                    str = str.slice(1)
                }else if(char === '/'){
                    currenState = State.tagEnd
                    str = str.slice(1)
                }
                break;
            
            case State.tagName:
                if(isAlpha(char)){
                    chars.push(char)
                    str = str.slice(1)
                }else if(char === '>'){
                    currenState = State.initial
                    tokens.push({
                        type:'tag',
                        name:chars.join('')
                    })
                    chars.length = 0
                    str = str.slice(1)
                }
                break;


            case State.text:
                if(isAlpha(char)){
                    chars.push(char)
                    str = str.slice(1)
                }else if(char === '<'){
                    currenState = State.tagOpen
                    tokens.push({
                        type:'text',
                        content:chars.join('')
                    })
                    chars.length = 0
                    str = str.slice(1)
                }
                break;

            case State.tagEnd:
                if(isAlpha(char)){
                    currenState = State.tagEndName
                    chars.push(char)
                    str = str.slice(1)
                }
                break;

            case State.tagEndName:
                if(isAlpha(char)){
                    chars.push(char)
                    str = str.slice(1)
                }else if(char === '>'){
                    currenState = State.initial
                    tokens.push({
                        type:'tagEnd',
                        name:chars.join('')
                    })
                    chars.length = 0
                    str = str.slice(1)
                }
                break;
        }
    }
    return tokens
}

// 解析为 html ast
function parse(str){
    const tokens = tokenize(str)
    const root = {
        type:'Root',
        children:[]
    }
    const elementStack = [root]

    while(tokens.length){
        const parent = elementStack[elementStack.length - 1]
        const t = tokens[0]
        switch (t.type) {
            case 'tag':
                const elementNode = {
                    type:'Element',
                    tag:t.name,
                    children:[]
                }
                // 结构
                parent.children.push(elementNode)
                // 压栈
                elementStack.push(elementNode)
                break;
        
            case 'text':
                const textNode = {
                    type:'Text',
                    content:t.content
                }
                parent.children.push(textNode)
                break;

            case  'tagEnd':
                elementStack.pop()
                break
        }
        tokens.shift()
    }
    return root
}

// 深度优先遍历 ast
function traverseNode(ast, context){
    // 设置当前节点
    context.currentNode = ast
    // 退出阶段的回调函数数组
    const exitFns = []
    const transforms = context.nodeTransforms
    for (let i = 0; i < transforms.length; i++) {
        // 转换函数返回另一个函数，该函数即作为退出阶段的回调函数
        const onExit = transforms[i](context.currentNode, context)
        if(onExit){
            // 存储退出阶段的函数
            exitFns.push(onExit)
        }
        // 如果其中一个转换节点删除了当前的 node 则不需要后续的处理
        if(!context.currentNode) return
    }

    const children = context.currentNode.children
    if(children){
        for (let i = 0; i < children.length; i++) {
            // 递归之前，当前节点是下次递归的父节点
            context.parent = context.currentNode
            context.childIndex = i
            traverseNode(children[i], context)
        }
    }

    // 反序执行退出阶段回调函数
    let i = exitFns.length
    while(i--){
        exitFns[i]()
    }
}

// html ast 转 JavaScript ast
function transform(ast){
    const context = {
        // 当前节点
        currentNode:null,
        // 在当前节点，children 中的下标
        childIndex:0,
        // 父节点
        parent:null,
        // 替换节点
        replaceNode(node){
            context.parent.children[context.childIndex] = node
            context.currentNode = node
        },
        // 删除节点
        removeNode(){
            if(context.parent){
                context.parent.children.splice(context.childIndex, 1)
                context.currentNode = null
            }
        },
        nodeTransforms:[
            transformRoot,
            transformElement,
            transformText
        ]
    }

    traverseNode(ast, context)
}

function transformRoot(node){
    return ()=>{
        if(node.type !== 'Root'){
            return 
        }

        const vnodeJSAST = node.children[0].jsNode

        node.jsNode = {
            type:'FunctionDecl',
            id:{type:'Identifier', name:'render'},
            params:[],
            body:[{
                type:'ReturnStatement',
                return:vnodeJSAST
            }]
        }
    }
}


function transformElement(node){
    // 返回 Element 操作完成阶段的具体试实函数
    return ()=>{
        if(node.type !== 'Element'){
            return
        }

        const callExp = createCallExpression('h',[
            createStringLiteral(node.tag)
        ])
        node.children.length === 1
            ? callExp.arguments.push(node.children[0].jsNode)
            : callExp.arguments.push(
                createArrayExpression(node.children.map(c=>c.jsNode))
            )
        node.jsNode = callExp
    }
}

function transformText(node, context){
    if(node.type !== 'Text'){
        return
    }
    node.jsNode = createStringLiteral(node.content)
}


function  createStringLiteral(value){
    return {
        type: 'StringLiteral',
        value
    }
}

function createIdentifier(name) {
    return {
        type:'Identifier',
        name
    }
}

function createCallExpression(callee, arguments) {
    return {
        type:'CallExpression',
        callee:createIdentifier(callee),
        arguments
    }
}

function createArrayExpression(elements){
    return {
        type: 'ArrayExpression',
        elements
    }
}

// JavaScript ast 生成 渲染函数
function generate(node) {
    const context = {
        code:'',
        push(code){
            context.code += code
        },
        currentIndent:0,
        newline(){
            context.code += '\n' + '  '.repeat(context.currentIndent)
        },
        indent(){
            context.currentIndent++
            context.newline()
        },
        deIndent(){
            context.currentIndent--
            context.newline()
        }
    }

    genNode(node, context)

    return context.code
}

function genNode(node, context) {
    switch (node.type) {
        case 'FunctionDecl':
            genFunctionDecl(node, context)
            break;
        case 'ReturnStatement':
            genReturnStatement(node, context)
            break;
        case 'CallExpression':
            genCallExpression(node, context)
            break;
        case 'StringLiteral':
            genStringLiteral(node, context)
            break;
        case 'ArrayExpression':
            genArrayExpression(node, context)
            break;
    }
}

function genFunctionDecl(node, context){
    const {push, indent, deIndent} = context
    push(`function ${node.id.name}`)
    push('(')
    genNodeList(node.params, context)
    push(')')
    push('{')
    indent()
    node.body.forEach(n=>genNode(n, context))
    deIndent()
    push('}')
}

function genArrayExpression(node, context){
    const { push } = context
    push('[')
    genNodeList(node.elements, context)
    push(']')
}

function genReturnStatement(node, context){
    const { push } = context
    push('return ')
    genNode(node.return, context)
}

function genStringLiteral(node, context){
    const { push } = context
    push(`'${node.value}'`)
}

function genCallExpression(node, context){
    const { push } = context
    const { callee, arguments: args} = node
    push(`${callee.name}(`)
    genNodeList(args, context)
    push(')')
}

function genNodeList(nodes, context){
    const { push } = context
    for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        genNode(node, context)
        if(i < nodes.length - 1){
            push(', ')
        }
    }
}


function compile(template){
    const ast = parse(template)
    transform(ast)
    const code = generate(ast.jsNode)
    return code
}

console.log(compile(`<div><p>Vue</p><p>Template</p></div>`));




// function dump(node, indent = 0){
//     const type = node.type
//     const desc = node.type === 'Root'
//         ? ''
//         : node.type === 'Element'
//             ? node.tag
//             : node.content
    
//     console.log(`${'-'.repeat(indent)}${type}: ${desc}`)

//     if(node.children){
//         node.children.forEach(n => dump(n, indent + 2))
//     }
// }

// const ast = parse('<div><p>Vue</p></div>')

// transform(ast)
