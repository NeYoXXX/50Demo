const TextModes = {
    DATA:'DATA',
    RCDATA:'RCDATA',
    RAWTEXT:'RAWTEXT',
    CDATA:'RAWTEXT'
}

function parse(str){
    const context = {
        source:str,
        mode: TextModes.DATA,
        advanceBy(num){
            // 消费指定长度字符
            context.source = context.source.slice(num)
        },
        advanceSpaces(){
            // 消费空白符
            const match = /^[\t\r\n\f ]+/.exec(context.source)
            if(match){
                context.advanceBy(match[0].length)
            }
        }
    }

    const nodes = parseChildren(context, [])

    return {
        type:'Root',
        children:nodes
    }
}


function parseChildren(context, ancestors){
    let nodes = []

    const { mode, source } = context
    while(!isEnd(context, ancestors)){
        let node
        if(mode === TextModes.DATA || mode === TextModes.RCDATA){
            if(mode === TextModes.DATA && source[0] === '<'){
                if(source[1] === '!'){
                    if(source.startsWith('<!--')){
                        node = parseComment(context)
                    }else if(source.startsWith('<![CDATA[')){
                        node = parseCDATA(context, ancestors)
                    }
                }else if (source[1] === '/'){
                    console.error('无效的结束标签')
                    continue
                }else if (/[a-z]/i.test(source[1])){
                    node = parseElement(context, ancestors)
                }
            }else if(source.startsWith('{{')){
                node = parseInterpolation(context)
            }
        }

        if(!node){
            node = parseText(context)
        }

        nodes.push(node)
    }

    return nodes
}


function isEnd(context, ancestors){
    if(!context.source) return true

    // 一直向上找，直到找到对应的开始标签，次做法是为了解决 <div><span></div></span> 这种嵌套元素
    for (let i = ancestors.length - 1; i >= 0; i--) {
        if(context.source.startsWith(`</${ancestors[i].tag}`)){
            return true
        }
    }
}


function parseElement(context, ancestors){
    // 解析开始标签
    const element = parseTag(context)
    if(element.isSelfClosing) return element

    if(element.tag === 'textarea' || element.tag === 'title'){
        context.mode = TextModes.RCDATA
    }else if(/style|xmp|iframe|noembed|noframes|noscript/.test(element.tag)){
        context.mode = TextModes.RAWTEXT
    }else{
        context.mode = TextModes.DATA
    }

    ancestors.push(element)
    element.children = parseChildren(context, ancestors)
    ancestors.pop()

    if(context.source.startsWith(`</${element.tag}`)){
        // 再次调用传递 end 表示为结束标签
        parseTag(context, 'end')
    }else{
        console.error(`${element.tag} 标签缺少闭合标签`)
    }

    return element
}


function parseTag(context, type = 'start'){
    const { advanceBy, advanceSpaces } = context
    const match = type ==='start' 
        ? /^<([a-z][^\t\r\n\f />]*)/i.exec(context.source) 
        : /^<\/([a-z][^\t\r\n\f />]*)/i.exec(context.source)
    
    const tag = match[1]
    advanceBy(match[0].length)
    advanceSpaces()

    const props = parseAttributes(context)

    const isSelfClosing = context.source.startsWith('/>')

    advanceBy(isSelfClosing ? 2 : 1)

    return {
        type:'Element',
        tag,
        props,
        children:[],
        isSelfClosing
    }
}

function parseAttributes(context){
    const { advanceBy, advanceSpaces } = context
    const props = []

    while(
        !context.source.startsWith('>') &&
        !context.source.startsWith('/>')
    ){
        advanceSpaces()
        const match = /^[^\t\r\n\f />][^\t\r\n\f />=]*/.exec(context.source)

        const name = match[0]

        advanceBy(name.length)
        advanceSpaces()
        advanceBy(1)
        advanceSpaces()

        let value = ''

        const quote = context.source[0]
        const isQuoted = quote === '"' || quote === "'"

        if(isQuoted){
            advanceBy(1)
            const endQuoteIndex = context.source.indexOf(quote)
            if(endQuoteIndex > -1){
                value = context.source.slice(0, endQuoteIndex)
                advanceBy(value.length)
                advanceBy(1)
            }else{
                console.error('缺少引号');
            }
        }else{
            const match = /^[^\t\r\n\f >]+/.exec(context.source)
            value = match[0]
            advanceBy(value.length)
        }

        advanceBy()

        props.push({
            type: 'Attribute',
            name,
            value
        })
    }

    return props
}

function parseText(context){
    let endIndex = context.source.length
    const ltIndex = context.source.indexOf('<')
    const delimiterIndex = context.source.indexOf('{{')
    if(ltIndex > -1 && ltIndex < endIndex){
        endIndex = ltIndex
    }
    if(delimiterIndex > -1 && delimiterIndex < endIndex){
        endIndex = delimiterIndex
    }
    const content =  context.source.slice(0, endIndex)
    context.advanceBy(content.length)

    return {
        type:'Text',
        content
    }
}


let test = parse('<div id="foo" v-show="display">Text</div>')
console.log(test);
