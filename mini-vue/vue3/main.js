let activeEffect
const effectStack = []
const bucket = new WeakMap()

const data = { 
    ok:true,
    text:'test',
    bar:false,
    foo:1 
}

const obj = new Proxy(data,{
    get(target, key){
        track(target, key)
        return target[key]
    },
    set(target, key, newVal){
        target[key] = newVal
        trigger(target, key)
    }
})

/**
 * 封装的副作用函数
 * @param {Function} fn 用户自定义的函数
 * @param {Object} options 配置对象
 * @returns 
 */
function effect(fn, options = {}){
    const effectFn = () => {
        cleanup(effectFn)
        activeEffect = effectFn
        effectStack.push(effectFn)
        const res = fn()
        effectStack.pop()
        activeEffect = effectStack[effectStack.length - 1]
        return res
    }

    effectFn.options = options

    effectFn.deps = []
    if(!options.lazy){
        effectFn()
    }

    return effectFn
}


/**
 * 收集操作
 * @param {Object} 需要代理的对象 
 * @param {String} key 需要代理的对象的 key
 * @returns 
 */
function track(target, key){
    if(!activeEffect) return target[key]
        
    let depsMap = bucket.get(target)

    if(!depsMap){
        bucket.set(target, (depsMap = new Map()))
    }

    let deps = depsMap.get(key)

    if(!deps){
        depsMap.set(key, (deps = new Set()))
    }

    deps.add(activeEffect)

    activeEffect.deps.push(deps)
}


/**
 * 触发操作
 * @param {Object} target 需要代理的对象
 * @param {String} key 需要代理的对象的 key
 * @returns 
 */
function trigger(target, key){
    const depsMap = bucket.get(target)
    if(!depsMap) return
    const effects = depsMap.get(key)
    const effectsToRun = new Set()
    effects && effects.forEach(effectFn => {
        if(effectFn !== activeEffect){
            effectsToRun.add(effectFn)
        }
    })
    effectsToRun.forEach(effect => {
        // 是否调度，在此处不执行 副作用函数，副作用函数传给用户使用
        if(effect.options.scheduler){
            effect.options.scheduler(effect)
        }else{
            effect()
        }
    })
}

/**
 * 针对 obj.key ，再收集依赖时，先删除之前所收集的依赖
 * @param {Function} effectFn 封装之后的副作用函数
 */
function cleanup(effectFn){
    for (let i = 0; i < effectFn.deps.length; i++) {
        const deps = effectFn.deps[i]
        deps.delete(effectFn)
    }
    effectFn.deps.length = 0
}


/**
 * 计算属性
 * @param {Function} getter 需要使用计算属性的函数
 * @returns getter 的返回值
 */
function computed(getter){
    // 上一次数据缓存
    let value
    // 脏数据标识
    let dirty = true

    const effectFn = effect(getter,{
        lazy:true,
        scheduler(){
            // getter 副作用里的对象的值改变时调用，则下次取值时需要重新计算
            dirty = true
            // 触发之前 value 注册的副作用函数，并不是 getter 副作用函数
            trigger(objCom, 'value')
        }
    })

    const objCom = {
        get value(){
            if(dirty){
                // 第一次或者 getter 副作用里的对象的值改变时
                value = effectFn()
                dirty = false
            }
            // 在此收集副作用函数，此时的副作用函数是当前注册的副作用函数，并不是 getter 副作用函数
            track(objCom, 'value')
            // 返回 getter 函数的返回值
            return value
        }
    }

    return objCom
}

function watch(source, cb, onInvalidate){
    let getter

    if(typeof source === 'function'){
        getter = source
    }else{
        getter = () => traverse(source)
    }

    let oldValue, newValue

    let cleanup
    function onInvalidate(fn){
        cleanup = fn
    }

    const obj = () => {
        newValue = effectFn()
        if(cleanup){
            cleanup()
        }
        cb(newVlaue, oldValue, onInvalidate)
        oldValue = newValue
    }

    const effectFn = effect(
        () => getter(),
        {
            lazy:true,
            scheduler:obj
        }
    )

    if(options.immediate){
        job()
    }else{
        oldValue = effectFn()
    }

}

function traverse(value, seen = new Set()){
    if(typeof value !== 'object' || value === null || seen.has(value)) return

    seen.add(value)

    for(const k in value){
        traverse(value[k], seen)
    }

    return value
}

// effect(()=>{
//     obj.bar 
// })


// 两个副作用函数，computed 会创建一个
const objCom = computed(()=>{
    console.log(123);
    return obj.bar + obj.foo
})

effect(()=>{
    obj.ok
})

effect(()=>{
    console.log(objCom.value);
})

obj.bar++

// obj bar effect
