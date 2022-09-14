let activeEffect
const effectStack = []
const bucket = new WeakMap()

const data = { 
    ok:true,
    text:'test',
    foo:1,
    get bar(){
        /*
            在副作用函数中使用 obj.bar 时,即
            effect(()=>{
                console.log(obj.bar);
            })
            可以正常把 data 的 bar 访问器 getter 收集依赖
            但在执行 return this.foo 这行代码时, this 的指向为 data 本身,并不是代理对象 obj 所以 this.foo 不会收集依赖 obj.foo++ 并没有任何效果
            使用 Reflect.get(target, key, obj) 可已解决,把 data 的 bar 访问器 getter 中的 this 变为 obj 代理对象,运行 return this.foo 时触发收集依赖
            再执行 obj.foo++  操作后可执行副作用函数 console.log(obj.bar);
        */
        return this.foo
    }
}
const ITERATE_KEY = Symbol()

const TriggerType = {
    SET:'SET',
    ADD:'ADD',
    DELETE:'DELETE'
}

const obj = reactive(data)

function reactive(data){
    return new Proxy(data,{
        get(target, key){
            track(target, key)
            return Reflect.get(target,key, obj)
        },
        set(target, key, newVal, receiver){
            const oldVlaue = target[key]
            const type = Object.prototype.hasOwnProperty.call(target,key) ? TriggerType.SET : TriggerType.ADD
    
            Reflect.set(target, key, newVal, receiver)
    
            if(oldVlaue !== newVal && (oldVlaue === oldVlaue || newVal === newVal)){
                trigger(target, key, type)
            }
        },
        has(target, key){
            track(target, key)
            return Reflect.has(target, key)
        },
        ownKeys(target){
            track(target, ITERATE_KEY)
            return Reflect.ownKeys(target)
        },
        deleteProperty(target,key){
            const hadKey = Object.prototype.hasOwnProperty.call(target,key)
            const res = Reflect.deleteProperty(target,key)
    
            if(res && hadKey){
                trigger(target, key, TriggerType.DELETE)
            }
    
            return res
        }
    })
}

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
function trigger(target, key, type){
    const depsMap = bucket.get(target)
    if(!depsMap) return
    const effects = depsMap.get(key)

    const effectsToRun = new Set()
    effects && effects.forEach(effectFn => {
        if(effectFn !== activeEffect){
            effectsToRun.add(effectFn)
        }
    })

    if(type === TriggerType.ADD || type === TriggerType.DELETE){
        // 获取 for..in 循环的副作用函数
        const iterateEffects = depsMap.get(ITERATE_KEY)
        iterateEffects && iterateEffects.forEach(effectFn=>{
            if(effectFn !== activeEffect){
                effectsToRun.add(effectFn)
            }
        })
    }

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

function watch(source, cb, options){
    let getter
    // getter 函数可以决定只绑定哪些响应式数据
    if(typeof source === 'function'){
        getter = source
    }else{
        // 不是函数则对象中的key全部绑定
        getter = () => traverse(source)
    }

    let oldValue, newValue
    // 收集的对象值触发 set 时，或 options.immediate = true 调用
    const job = () => {
        // 触发 set 即值已更新,则重新执行副作用函数的值为 newValue
        newValue = effectFn()
        cb(newValue, oldValue)
        // 执行完回调函数之后,新值变为老值
        oldValue = newValue
    }

    const effectFn = effect(
        () => getter(),
        {
            lazy:true,
            scheduler:()=>{
                if(options.flush === 'post'){
                    // 当前宏任务执行完成之后再执行,实际组件更新后执行
                    const p = Promise.resolve()
                    p.then(job)
                }else{
                    job()
                }
            }
        }
    )
    
    if(options.immediate){
        // options.immediate = true 直接执行,收集的对象的值触发 set 时所执行的函数
        job()
    }else{
        // 收集 getter 函数中对象返回 getter 函数的返回值，并计算调用watch函数即初始化watch函数时当前的值，也就是 oldValue
        oldValue = effectFn()
    }

}

function traverse(value, seen = new Set()){
    if(typeof value !== 'object' || value === null || seen.has(value)) return

    seen.add(value)

    for(const k in value){
        // 自动绑定当前的副作用函数
        traverse(value[k], seen)
    }

    return value
}


effect(()=>{
    for (const key in obj) {
        console.log(key);
    }
})

obj.foo = 2



