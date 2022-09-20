// 文本节点标识
const Text = Symbol()
// 注释节点标识
const Comment = Symbol()
// 片段，解决组件必须包裹的问题，本质上只处理其 children 数组中的 vnode
const Fragment = Symbol()


const options = {
    createElement(tag){
        return document.createElement(tag)
    },
    setElementText(el, text){
        el.textContent = text
    },
    insert(el, parent, anchor = null){
        parent.insertBefore(el, anchor)
    },
    patchProps(el, key, preValue, nextValue){
        if(/^on/.test(key)){
            // 元素伪造事件
            let invokers = el._vei || (el._vei = {})
            const invoker = invokers[key]
            // 事件操作
            const name = key.slice(2).toLowerCase()
            if(nextValue){
                if(!invoker){
                    invoker = el._vei[key] = (e)=>{
                        // 事件发生时间早于事件处理函数绑定的时间，则不执行事件处理函数
                        // 正常情况下次处代码是在，事件发生之后执行的，即 e.timeStamp > invoker.attached
                        // 而出现 e.timeStamp < invoker.attached 的情况是事件已经发生了，正在发生中注册了 invoker 函数，即子元素事件冒泡到父元素导致父元素以外注册 invoker 函数
                        if(e.timeStamp < invoker.attached) return
                        if(Array.isArray(invoker.value)){
                            invoker.value.forEach(item=>item(e))
                        }else{
                            invoker.value(e)
                        }
                    }
                    invoker.value = nextValue
                    invoker.attached = performance.now()
                    el.addEventListener(name, invoker)
                }else{
                    invoker.value = nextValue
                }
            }else if(invoker){
                // 新事件不存在，有旧事件，则移除旧事件
                el.removeEventLienter(name, invoker)
            }
            /*
            // 移除 el 旧事件
            preValue && el.removeEventListener(key, preValue)
            // 添加 el 新事件
            el.addEventListener(name, nextValue)
            */
        }else if(key === 'class'){
            el.className = nextValue || ''
        }else if(shouldSetAsProps(el, key, nextValue)){
            const type = typeof el[key]
            if(type === 'boolean' && nextValue === ''){
                el[key] = true
            }else{
                el[key] = nextValue
            }
        }else{
            el.setAttribute(key, nextValue)
        }
    },
    createText(text){
        return document.createTextNode(text)
    },
    setText(el,text){
        el.nodeValue = text
    }
}


function shouldSetAsProps(el, key, value){
    if(key === 'form' && el.tagName === 'INPUT') return false
    return key in el
}


function createRenderer(options){
    const {
        createElement,
        insert,
        setElementText,
        patchProps,
        createText,
        setText
    } = options

    function render(vnode, container){
        if(vnode){
            patch(container._vnode, vnode, container)
        }else{
            if(container._vnode){
                unmount(container._vnode)
            }
        }
        // _vnode 旧的 vnode
        container._vnode = vnode
    }

    // 挂载操作，处理 props children
    function mountElement(vnode, container){
        const el = vnode.el = createElement(vnode.type)
        // childern 处理
        if(typeof vnode.childern === 'string'){
            setElementText(el, vnode.childern)
        }else if(Array.isArray(vnode.childern)){
            vnode.childern.forEach(child=>{
                patch(null, child, el)
            })
        }

        // props 处理
        if(vnode.props){
            for (const key in vnode.props) {
                patchProps(el, key, null, vnode.props[key])
            }
        }

        insert(el, container)
    }

    // vnode 卸载操作
    function unmount(vnode){
        if(vnode.type === Fragment){
            vnode.childern.forEach(item=>unmount(item))
            return
        }
        const parent = vnode.el.parentNode
        if(parent){
            parent.removeChild(vnode.el)
        }
    }

    // n1 旧 vnode，n2 新 vnode
    function patch(n1, n2, container){
        // n1 存在且 n1 和 n2 不是相同的元素
        if(n1 && n1.type !== n2.type){
            // 卸载 n1，即卸载旧 vnode
            unmount(n1)
            n1 = null
        }

        // n1 和 n2 是相同元素
        const {type} = n2
        if(typeof type === 'string'){
            // 普通元素操作
            if(!n1){
                mountElement(n2, container)
            }else{
                patchElement(n1, n2)
            }
        }else if(typeof type === 'object'){
            // 组件操作

        }else if(type === Text){
            if(!n1){
                const el = n2.el = createText(n2.childern)
                insert(el, container)
            }else{
                const el = n2.el = n1.el
                if(n2.childern !== n1.childern){
                    // dom 的 nodeValue 属性完成文本更新
                    setText(el,n2.childern)
                }
            }
        }else if(type === Fragment){
            if(!n1){
                n2.childern.forEach(item=>patch(null,item,container))
            }else{
                patchChildren(n1,n2,container)
            }
        }

        
    }

    function patchElement(n1, n2){
        // 此时的 n2.el 是 undefinde， n2.el = n1.el 则把旧 dom 赋值给新 vnode ，即在旧 dom 上继续更新，完成了 dom 复用功能
        const el = n2.el = n1.el
        const oldProps = n1.props
        const newProps = n2.props

        // 添加和更新 newProps
        for (const key in newProps) {
            if(newProps[key] !== oldProps[key]){
                patchProps(el, key, oldProps[key], newProps[key])
            }
        }

        // 删除已经存在的 oldProps
        for (const key in oldProps) {
            if(!(key in newProps)){
                patchProps(el, key, oldProps[key], null)
            }
        }


        patchChildren(n1, n2, el)
    }

    function patchChildren(n1, n2, container){
        if(typeof n2.childern === 'string'){
            // n1.childern 是数组则按个卸载
            if(Array.isArray(n1.childern)){
                n1.childern.forEach((c)=>unmount(c))
            }
            setElementText(container, n2.childern)
        }else if(Array.isArray(n2.childern)){
            if(Array.isArray(n1.childern)){
                // 核心diff算法
                const oldChildren = n1.childern
                const newChildren = n2.childern
                // 最大索引值
                let lastIndex = 0
                for (let i = 0; i < newChildren.length; i++) {
                    const newVNode = newChildren[i];
                    for (let j = 0; j < oldChildren.length; j++) {
                        const oldVNode = oldChildren[j];
                        if(newVNode.key === oldVNode.key){
                            patch(oldVNode, newVNode, container)
                            if(j<lastIndex){

                            }else{
                                lastIndex = j
                            }
                            break
                        }
                        
                    }
                    
                }

            }else{
                // 旧节点是文本或者不存在
                setElementText(container, '')
                // n2.childern 逐一挂载
                n2.childern.forEach(item=>patch(null,item,container))
            }
        }else{
            if(Array.isArray(n1.childern)){
                n1.childern.forEach(item=>unmount(item))
            }else if(typeof n1.childern === 'string'){
                setElementText(container, '')
            }
            // 如果子节点为 null 则什么也不做
        }
    }

    function hydrate(vnode, container){

    }
    return {
        render,
        hydrate,
        patch
    }
}

/*
使用 key，
根据 key 属性，找可复用 dom ，即能不创建新 dom 就不创建
根据 key 属性，找到新 dom 和对应旧 dom 的位置，即下标（以新 dom 下标为准），根据下标移动旧 dom

*/ 




