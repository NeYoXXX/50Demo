import { reactive, effect } from "./reactive.js"

// 文本节点标识
const Text = Symbol()
// 注释节点标识
const Comment = Symbol()
// 片段，解决组件必须包裹的问题，本质上只处理其 children 数组中的 vnode
const Fragment = Symbol()

// 任务缓存列表，可自动对任务进行去重
const queue = new Set()
// 表示是否正在刷新任务队列
let isFlushing= false
// 创建微任务
const p = Promise.resolve()
// 当组件中收集的副作用函数缓存，再一次性执行
function queueJob(job){
    queue.add(job)
    if(!isFlushing){
        // 避免重复刷新
        isFlushing = true
        p.then(()=>{
            try{
                queue.forEach(job=>job())
            }finally{
                isFlushing = false
                queue.clear = 0
            }
        })
    }
}

// 存储当前正在被初始化的组件实例
let currentInstance = null
function setCurrentInstance(instance){
    currentInstance = instance
}

// 生命周期 mounted 函数
function onMounted(fn){
    if(currentInstance){
        // 将生命周期函数添加到 instance.mounted 数组中
        currentInstance.mounted.push(fn)
    }else{
        console.error('onMounted 函数只能在 setup 中调用')
    }
}

// 异步组件实现
function defineAsyncComponent(options){
    if(typeof options === 'function'){
        options = {
            loader:options
        }
    }

    const { loader } = options
    let InnerComp = null
    let retries = 0
    function load(){
        return loader()
        .catch((err)=>{
            if(options.onError){
                return new Promise((resolve, reject)=>{
                    const retry = () =>{
                        resolve(load())
                        retries++
                    }
                    const fail = () => reject(err)
                    options.onError(retry,fail,retries)
                })
            }else{
                throw error
            }
        })
    }



    return {
        name:'AsyncComponentWrapper',
        setup(){
            const loaded = ref(false)
            const error = shallowRef(null)
            const loading = ref(false)

            const loadingTimer = null
            if(options.delay){
                loadingTimer = setTimeout(()=>{
                    loading.value = true
                }, options.delay)
            }else{
                loading.value = true
            }

            load().then(c=>{
                InnerComp = c
                loaded.value = true
            })
            .catch((err)=>{
                error.value = err
            })
            .finally(()=>{
                loading.value = false
                clearTimeout(loadingTimer)
            })

            let timer = null
            if(options.timeout){
                timer = setTimeout(()=>{
                    const err = new Error(`超时${options.timeout}`)
                    error.value = err
                }, options.timeout)
            }
            onUmounted(()=>clearTimeout(timer))

            const placeholder = { type: Text, childern:'' }

            return ()=>{
                if(loaded.value){
                    return { type: InnerComp }
                }else if(error.value && options.errorComponent){
                    return { type: options.errorComponent, props: {error: error.value} }
                }else if(loading.value && options.loadingComponent){
                    return { type:options.loadingComponent }
                }
                return placeholder
            }
        }
    }
}

// KeepAlive 实现
const KeepAlive = {
    // 标识
    __isKeepAlive:true,
    // 显示配置需要缓存的组件
    props:{
        include: RegExp,
        exclude: RegExp
    },
    setup(props,{ slots }){
        // 缓存对象，key:vnode.type value:vnode
        const cache = new Map()
        // 当前 KeepAlive 组件实例
        const instance = currentInstance
        const { move, createElement } = instance.keepAliveCtx
        // 隐藏容器
        const storageContainer = createElement('div')
        instance._deActivate = (vnode) => {
            move(vnode, storageContainer)
        }
        instance._activate = (vnode, container, anchor) => {
            move(vnode, container, anchor)
        }

        return ()=>{
            // KeepAlive 的默认插槽，就是需要被 KeepAlive 的组件
            let rawVNode = slots.default()
            // 如果不是组件则返回，非组件的虚拟节点无法被 KeepAlive
            if(typeof rawVNode.type !== 'object'){
                return rawVNode
            }
            const name = rawVNode.type.name
            if(name && 
                (
                    (props.include && !props.include.test(name)) ||
                    (props.exclude && props.exclude.test(name))
                )){
                    // 直接渲染内部组件，不进行缓存操作
                    return rawVNode
                }


            const cachedVNode = cache.get(rawVNode.type)
            if(cachedVNode){
                rawVNode.component = cachedVNode.component
                rawVNode.keptAlive = true
            }else{
                // 添加缓存，下次激活组件不执行挂载
                cache.set(rawVNode.type, rawVNode)
            }
            rawVNode.shouldKeepAlive = true
            rawVNode.keepAliveInstance = instance
            return rawVNode
        }
    }
}

// Teleport 实现
const Teleport = {
    __isTeleport: true,
    process(n1, n2, container, anchor, internals){
        const { patch, patchChildren, move } = internals
        if(!n1){
            // 获取挂载点
            const target = typeof n2.props.to === 'string'
                ? document.querySelector(n2.props.to)
                : n2.props.to
            // 渲染到指定挂载点
            n2.childern.forEach(c=>patch(null, c, target, anchor))
        }else{
            patchChildren(n1, n2, container)
            // 如果新旧 to 参数的值不同，则需要对内容进行移动
            if(n2.props.to !== n1.props.to){
                const newTarget = typeof n2.props.to === 'string'
                    ? document.querySelector(n2.props.to)
                    : n2.props.to
                // 移动到新的容器
                n2.childern.forEach(c => move(c, newTarget))
            }
        }
    }
}

// Transition 实现
const Transition = {
    name: 'Transition',
    setup(props, { slots }){
        return ()=>{
            // 默认插槽获取需要过度的元素
            const innerVNode = slots.default()

            // 钩子函数
            innerVNode.Transition = {
                beforeEnter(el){
                    el.classList.add('enter-from')
                    el.classList.add('enter-active')
                },
                enter(el){
                    nextFrame(()=>{
                        el.classList.remove('enter-from')
                        el.classList.add('enter-to')
                        el.addEventListener('transitionend',()=>{
                            el.classList.remove('enter-to')
                            el.classList.remove('enter-active')
                        })
                    })
                },
                leave(el, performRemove){
                    el.classList.add('leave-from')
                    el.classList.add('leave-active')
                    document.body.offsetHeight
                    nextFrame(()=>{
                        el.classList.remove('leave-from')
                        el.classList.add('leave-to')
                        el.addEventListener('transitionend',()=>{
                            el.classList.remove('leave-to')
                            el.classList.remove('leave-active')
                            performRemove()
                        })
                    })
                }
            }
            // 需要过渡的元素
            return innerVNode
        }
    }
}


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

        // 判断一个 VNode 是否需要过渡
        const needTransition = vnode.transition
        if(needTransition){
            // 调用钩子函数
            vnode.transition.beforeEnter(el)
        }

        insert(el, container, anchor)

        if(needTransition){
            // 调用钩子函数
            vnode.transition.enter(el)
        }
    }

    // vnode 卸载操作
    function unmount(vnode){
        // 判断一个 VNode 是否需要过渡
        const needTransition = vnode.transition
        if(vnode.type === Fragment){
            vnode.childern.forEach(item=>unmount(item))
            return
        }else if(typeof vnode.type === 'object'){
            if(vnode.shouldKeepAlive){
                vnode.keepAliveInstance._deActivate(vnode)
            }else{
                // 对于组件的卸载，本质上是要卸载组件所渲染的内容，即 subTree
                unmount(vnode.component.subTree)
            }
            return
        }
        const parent = vnode.el.parentNode
        if(parent){
            const performRemove = ()=> parent.removeChild(vnode.el)
            if(needTransition){
                vnode.transition.leave(vnode.el, performRemove)
            }else{
                performRemove()
            }
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
        }else if(typeof type === 'object' && type.__isTeleport){
            type.process(n1, n2, container, anchor, {
                patch,
                patchChildren,
                unmount,
                // 用来移动被 Teleport 的内容
                move(vnode, container, anchor){
                    insert(vnode.component 
                        ? vnode.component.subTree.el  // 移动一个组件
                        : vnode.el,  // 移动普通元素
                        container, anchor)
                }
            })
        }else if(typeof type === 'object' || typeof type === 'function'){
            // 组件操作
            if(!n1){
                if(n2.keptAlive){
                    n2.keepAliveInstance._activate(n2, container, anchor)
                }
                mountComponent(n2, container, anchor)
            }else{
                patchComponent(n1, n2, anchor)
            }

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
        const isFunctional = typeof vnode.type === 'function'
        const componentOptions = vnode.type
        if(isFunctional){
            componentOptions = {
                render:vnode.type,
                props: vnode.type.props
            }
        }
    
        const { render, data, setup, props:propsOption, beforeCreate, created, beforeMount, mounted, beforeUpdate, updated } = componentOptions

        beforeCreate && beforeCreate()
        const state = data ? reactive(data()) : null
        const [props, attrs] = resolveProps(propsOption, vnode.props)

        const instance = {
            // 自身状态数据
            state,
            props: shallowReactive(props),  
            // 表示组件是否已经被挂载
            isMounted:false,
            // 组件渲染的内容
            subTree:null,
            slots,
            mounted:[],
            // 只有 KeepAlive 组件下有
            keepAliveCtx:null
        }

        const isKeepAlive = vnode.type.__isKeepAlive
        if(isKeepAlive){
            instance.keepAliveCtx = {
                move(vnode, container, anchor){
                    insert(vnode.component.subTree.el, container, anchor)
                },
                createElement
            }
        }

        // 事件
        function emit(event,...payload){
            const eventName = `on${event[0].toUpperCase() + event.slice(1)}`
            // 根据 eventName 获取绑定在 props 上的事件
            const handler = instance.props[eventName]
            if(handler){
                handler(...payload)
            }else{
                console.error('事件不存在')
            }
        }
        // 插槽，直接使用编译好的 vnode.children 对象作为 solts 对象即可
        const slots = vnode.childern || {}

        const setupContext = { attrs, emit, slots }
        // 设置为当前运行的实例
        setCurrentInstance(instance)
        const setupResult = setup(shallowReadonly(instance.props), setupContext)
        // 重置当前运行的实例
        setCurrentInstance(null)
        let setupState = null
        if(typeof setupResult === 'function'){
            if(render) console.error('setup 函数返回渲染函数，render 选项将被忽略')
            render = setupResult
        }else{
            setupState = setupResult
        }

        // vnode 设置组件实例
        vnode.component = instance

        // 在选项使用 this 的代理
        const renderContext = new Proxy(instance,{
            get(t,k,r){
                const {state, props, slots} = t

                if(k === '$slots') return slots

                if(state && k in state){
                    return state[k]
                }else if(k in props){
                    return props[k]
                }else if(setupState && k in setupState){
                    // setup this上下文支持
                    return setupState[k]
                }else{
                    console.log('不存在')
                }
            },
            set(t, k, v, r){
                const {state, props} = t
                if(state && k in state){
                    state[k] = v
                }else if(k in props){
                    console.log('组件 props 是只读属性');
                }else if(setupState && k in setupState){
                    // setup this上下文支持
                    setupState[k] = v
                }else{
                    console.log('不存在')
                }
            }
        })


        created && created.call(renderContext)

        effect(()=>{
            // 调用组件渲染函数，获得子树
            const subTree = render.call(state, state)
            if(instance.isMounted){
                beforeMount && beforeMount.call(renderContext)
                // 挂载
                patch(null, subTree, container, anchor)
                instance.isMounted = true
                mounted && mounted.call(renderContext)
                // 组合式 api mounted 生命周期
                instance.mounted && instance.mounted.forEach(hook=>hook.call(renderContext))
            }else{
                beforeUpdate && beforeUpdate.call(renderContext)
                patch(instance.subTree, subTree, container, anchor)
                updated && updated.call(renderContext)
            }
            // 更新组件实例的子树
            instance.subTree = subTree 
        },{
            scheduler:queueJob
        })
        
    }

    function patchComponent(n1){
        // n2.component = n1.component 否则下次更新将无法取得组件实例在
        const instance = (n2.component = n1.component)
        const {props} = instance
        if(hasPropsChanged(n1.props, n2.props)){
            const [nextProps] = resolveProps(n2.type.props, n2.props)
            for (const k in nextProps) {
                props[k] = nextProps[k]
            }
            
            for (const k in props) {
                if(!(k in nextProps)) delete props[k]
            }
        }
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


/**
 * 解析 props 和 attrs 数据
 * @param {Object} options 组件实例 props
 * @param {Object} propsData DOM 组件自身attrs
 * @returns 
 */
 export function resolveProps(options, propsData){
    const props = {}
    const attrs = {}
    for (const key in propsData) {
        // 针对 on 开头的事件属性特殊处理
        if(key in options || key.startsWith('on')){
            // 组件传递的 props 数据在组件自身的 props 选项中有定义，则视为合法的 props
            props[key] = propsData[key]
        }else{
            // 否则作为 attrs
            attrs[key] = propsData[key]
        }
    }
    return [props, attrs]
}


export function hasPropsChanged(prevProps, nextProps){
    const nextKeys = Object.keys(nextProps)
    if(nextKeys.length !== Object.keys(prevProps).length){
        return true
    }

    for (let i = 0; i < nextKeys.length; i++) {
        const key = nextKeys[i]
        if(nextProps[key] !== prevProps[key]) return true
    }
    return false
}







/*
使用 key，
根据 key 属性，找可复用 dom ，即能不创建新 dom 就不创建
根据 key 属性，找到新 dom 和对应旧 dom 的位置，即下标（以新 dom 下标为准），根据下标移动旧 dom

*/ 




