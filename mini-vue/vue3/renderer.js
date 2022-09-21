import { reactive, effect } from "./reactive-mini"

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
    function mountElement(vnode, container, anchor = null){
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

        insert(el, container, anchor)
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
    function patch(n1, n2, container, anchor = null){
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
                mountElement(n2, container, anchor)
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

    function mountComponent(vnode, container, anchor){
        const componentOptions = vnode.type
        const { render, data } = componentOptions
        const state = reactive(data())
        effect(()=>{
            const subTree = render.call(state, state)
            patch(null, subTree, container, anchor)
        })
        
    }

    // patch vnode props，即增加更新或删除 props 和 children，children 中又是新的 vnode 节点，需要再次调用 patch 函数，如此循环
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
                patchKeyedChildren(n1, n2, container)

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

    // 简单的 diff 算法，帮助理解 diff 实现原理
    function jiandanDiff(){
        const oldChildren = n1.childern
        const newChildren = n2.childern
        // 最大索引值
        let lastIndex = 0
        for (let i = 0; i < newChildren.length; i++) {
            const newVNode = newChildren[i];
            // 表示在旧的一组节点中是否有可复用元素
            let find = false
            for (let j = 0; j < oldChildren.length; j++) {
                const oldVNode = oldChildren[j];
                if(newVNode.key === oldVNode.key){
                    find = true
                    patch(oldVNode, newVNode, container)
                    if(j < lastIndex){
                        // 代码运行到这里，说明 newVNode 对应的真实 DOM 需要移动
                        // 先获取 newVNode 的前一个 vnode，即 prevVNode
                        const prevVNode = newChildren[i-1]
                        // 如果 prevVNode 不存在，说明是 newVNode 是第一个节点，则不需要移动
                        if(prevVNode){
                            // 由于要将 newVNode 对应的真实 DOM 移动到prevVNode 所对应真实 DOM 后面，
                            // 所以需要获取 prevVNode 对应真实 DOM 的下一个兄弟节点，并将其作为锚点
                            const anchor = prevVNode.el.nextSibling
                            // 调用 insert 方法将 newVNode 对应的真实 DOM 插入到锚点元素前面，
                            // 也就是 prevVNode 对应真实 DOM 的后面
                            insert(newVNode.el, container, anchor)
                        }
                    }else{
                        lastIndex = j
                    }
                    break
                }

                // 如果没有，则 newVNode 是新增节点，需要挂载
                if(!find){
                    const prevVNode = newChildren[i-1]
                    let anchor = null
                    if(prevVNode){
                        anchor = prevVNode.el.nextSibling
                    }else{
                        anchor = container.firstChild
                    }
                    patch(null, newVNode, container, anchor)
                }
                
            }
            
        }

        for (let i = 0; i < oldChildren.length; i++) {
            const oldVNode = oldChildren[i];
            const has = newChildren.find(vnode => vnode.key === oldVNode.key)
            if(!has){
                unmount(oldVNode)
            }
        }

    }
    // 双端 diff 算法，vue2 正在使用
    function patchKeyedChildrenDiff(n1, n2, container){
        const oldChildren = n1.childern
        const newChildren = n2.childern
        // 四个索引值
        let oldStartIdx = 0
        let oldEndIdx = oldChildren.length - 1
        let newStartIdx = 0
        let newEndIdx = newChildren.length - 1
        // 四个索引指向的 vnode 节点
        let oldStartVNode = oldChildren[oldStartIdx]
        let oldEndVNode = oldChildren[oldEndIdx]
        let newStartVNode = oldChildren[newStartIdx]
        let newEndVNode = oldChildren[newEndIdx]
        while(oldStartIdx <= oldEndIdx && newStartIdx <= newEndIdx){
            // 此以下调用的 path 函数主要调用 patch -> patchElement 函数，进行 props 和 children 操作
            if(!oldStartVNode){
                oldStartVNode = oldChildren[++oldEndIdx]
            }else if(oldStartVNode.key === newStartVNode.key){
                patch(oldStartVNode, newStartVNode, container)
                // 两者都在顶部不需要移动
                // 更新索引值，并指向下一个位置
                oldStartVNode = oldChildren[++oldEndIdx]
                oldStartVNode = newChildren[++newEndIdx]

            }else if(oldEndVNode.key === newEndVNode.key){
                patch(oldEndVNode, newEndVNode, container)

                // 两者都在尾部不需要移动

                // 更新索引值，并指向下一个位置
                oldEndVNode = oldChildren[--oldEndIdx]
                newEndVNode = newChildren[--newEndIdx]

            }else if(oldStartVNode.key === newEndVNode.key){
                patch(oldStartVNode, newEndVNode, container)
                // 将旧的一组子节点的头部节点对应的真实 DOM 节点 oldStartVNode.el 移动到旧的一组子节点的尾部节点对应的真实 DOM 节点后面
                insert(oldStartVNode.le, container, oldEndVNode.le.nextSibling)

                // 移动 DOM 完成后，更新索引值，并指向下一个位置
                oldStartVNode = oldChildren[++oldEndIdx]
                newEndVNode = newChildren[--newEndIdx]
            }else if(oldEndVNode.key === newStartVNode.key){
                patch(oldEndVNode, newStartVNode, container)
                // oldEndVNode.le 移动到 oldStartVNode.le 之前
                insert(oldEndVNode.le, container, oldStartVNode.le)

                // 移动 DOM 完成后，更新索引值，并指向下一个位置
                oldEndVNode = oldChildren[--oldEndIdx]
                newStartVNode = newChildren[++newStartIdx]
            }else{
                // 当不满足四个条件时，使用 newStartVNode 在旧的一组节点中找
                const idxInOld = oldChildren.findIndex(node=>node.key === newStartVNode.key)
                // 如果找到
                if(idxInOld > 0){
                    const vnodToMove = oldChildren[idxInOld]
                    patch(vnodToMove,newStartVNode, container)
                    insert(vnodToMove.el,container,oldStartVNode.el)
                    oldChildren[idxInOld] = undefined
                }else{
                    // 没有找到，就是新增的节点，可以直接挂载，以 oldStartVNode.el 即旧的一组节点的第一个节点作为锚点，此时是 oldStartVNode.el 上一个元素
                    patch(null, newStartVNode, container, oldStartVNode.el)
                }
                
                newStartVNode = newChildren[++newStartIdx]
            }
        }

        // 循环结束后检查索引值的情况
        if(oldEndIdx < oldStartIdx && newStartIdx <= newEndIdx){
            // 如果满足条件，则说明有新的节点遗留，需要挂载它们
            for (let i = newStartIdx; i <= newEndIdx; i++) {
                // 在最后的 DOM 的上面插入
                const anchor = newChildren[newEndIdx + 1] ? newChildren[newEndIdx + 1].el : null
                patch(null, newChildren[i], container, anchor)
                
            }
        }else if(newEndIdx < newStartIdx && oldStartIdx <= oldEndIdx){
            for (let i = oldStartIdx; i < oldEndIdx; i++) {
                // 移除操作
                unmount(oldChildren[i])
            }
        }

        
    }

    // 快速 diff 算法
    function patchKeyedChildren(n1, n2, container){
        const oldChildren = n1.childern
        const newChildren = n2.childern

        // 更新相同的前置节点
        let j = 0
        let oldVNode = oldChildren[j]
        let newVNode = newChildren[j]
        while(oldVNode.key === newVNode.key){
            patch(oldVNode, newVNode, container)
            j++
            oldVNode = oldChildren[j]
            newVNode = newChildren[j]
        }

        // 更新相同的后置节点
        // 索引 oldEnd 指向旧的一组节点的最后一个节点
        let oldEnd = oldChildren.length - 1
        // 索引 newEnd 指向新的一组节点的最后一个节点
        let newEnd = newChildren.length - 1
        oldVNode = oldChildren[oldEnd]
        newVNode = newChildren[newEnd]
        while (oldVNode.key === newVNode.key) {
            patch(oldVNode, newVNode, container)
            oldEnd--
            newEnd--
            oldVNode = oldChildren[oldEnd]
            newVNode = oldChildren[newEnd]
        }

        // j > oldEnd 说明旧的一组子节点都已处理，j <= newEnd 说明新的一组子节点还有未被处理的节点
        // 两者结合到一起则 j 到 newEnd 之间的节点是新节点需要插入
        if(j > oldEnd && j <= newEnd){
            // 锚点索引
            const anchorIndex = newEnd + 1
            const anchor = anchorIndex < newChildren.length ? newChildren[anchorIndex].el : null
            while(j <= newEnd){
                patch(null, newChildren[j++], container, anchor)
            }
        } else if(j > newEnd && j <= oldEnd){
            // j > newEnd 说明新的一组子节点都已处理，j <= oldEnd 说明旧的一组子节点还有未被处理的节点
            // 两者结合到一起则 j 到 oldEnd 之间的节点是旧节点需要删除
            while(j <= oldEnd){
                unmount(oldChildren[j++])
            }
        }else{
            // 构造 source 数组
            // 新的一组节点中剩余未处理节点的数量
            const count = newEnd - j + 1
            const source = new Array(count)
            source.fill(-1)

            // oldStart 和 newStart 分别为起始索引，即 j
            const oldStart = j
            const newStart = j
            /*
            // 两层的循环有性能问题，写代替方案
            for (let i = 0; i <= oldEnd; i++) {
                const oldVNode = oldChildren[i];
                for (let k = 0; k < newEnd; k++) {
                    const newVNode = oldChildren[k];
                    if(oldVNode.key === newVNode.key){
                        patch(oldVNode, newVNode, container)
                        source[k - newStart] = i
                    }
                }
                
            }
            */
            // 是否需要移动
            let moved = false
            // 最大索引值
            let pos = 0
            // 更新过的节点数量
            let patched = 0
            // 构建索引表
            const keyIndex ={}
            for (let i = newStart; i < newEnd; i++) {
                keyIndex[newChildren[i].key] = i
            }
            for (let i = oldStart; i < oldEnd; i++) {
                oldVNode = oldChildren[i];
                // 如果更新过的节点数量小于等于需要更新的节点数量，则执行更新
                if(patched <= count){
                    const k = keyIndex[oldVNode.key]
                    if(typeof k !== 'undefined'){
                        newVNode = newChildren[k]
                        patch(oldVNode,newVNode,container)
                        // 每更新一个节点，都将 patched 变量 +1
                        patched++
                        source[k - newStart] = i
                        if(k < pos){
                            moved = true
                        }else{
                            pos = k
                        }
                    }else{
                        // 没找到
                        unmount(oldVNode)
                    }
                }else{
                    // 否则卸载多余的节点
                    unmount(oldVNode)
                }
            }

            // 需要移动，计算最长递增子序列
            if(moved){
                // 最长递增子序列
                const seq = lis(source)
                // s 指向最长递增子序列的最后一个元素
                let s = seq.length - 1
                // i 指向新的一组子节点的最后一个元素
                let i = count - 1
                // for 循环使得 i 递减
                for (; i >= 0; i--) {
                    // 需要挂载
                    if(source[i] === -1){
                        // 在新的一组子节点中的索引
                        const pos = i + newStart
                        const newVNode = newChildren[pos]
                        // 锚点索引
                        const nextPos = pos + 1
                        const anchor = nextPos < newChildren.length
                        ? newChildren[nextPos].el
                        : null
                        // 挂载
                        patch(null, newVNode, container, anchor)
                    } else if(i !== seq[s]){
                        // 需要移动
                        // 在新的一组子节点中的索引
                        const pos = i + newStart
                        const newVNode = newChildren[pos]
                        // 锚点索引
                        const nextPos = pos + 1
                        const anchor = nextPos < newChildren.length
                        ? newChildren[nextPos].el
                        : null
                        // 移动
                        insert(newVNode.el, container, anchor)
                    }else{
                        // 不需要移动，只需要让 s 指向下一个位置
                        s--
                    }
                    
                }

            }

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




