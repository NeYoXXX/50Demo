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
                    currenState = State.tagName
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
    const currentNode = ast
    const transforms = context.nodeTransforms
    for (let i = 0; i < transforms.length; i++) {
        transforms[i](currentNode, context)
    }

    const children = currentNode.children
    if(children){
        for (let i = 0; i < children.length; i++) {
            traverseNode(children[i], context)
        }
    }
}

function transform(ast){
    const context = {
        // 当前节点
        currentNode:null,
        // 在当前节点，children 中的下标
        childIndex:0,
        // 父节点
        parent:null,
        nodeTransforms:[
            transformElement,
            transformText
        ]
    }

    traverseNode(ast, context)
    console.log(dump(ast));
}


function transformElement(node){
    if(node.type === 'Element' && node.tag === 'p'){
        node.tag = 'h1'
    }
}

function transformText(node){
    if(node.type === 'Text'){
        node.content = node.content.repeat(2)
    }
}





function dump(node, indent = 0){
    const type = node.type
    const desc = node.type === 'Root'
        ? ''
        : node.type === 'Element'
            ? node.tag
            : node.content
    
    console.log(`${'-'.repeat(indent)}${type}: ${desc}`)

    if(node.children){
        node.children.forEach(n => dump(n, indent + 2))
    }
}

const ast = parse('<div><p>Vue</p></div>')

transform(ast)
