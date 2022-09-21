
import { reactive } from "./reactive-mini.js";
/**
 * 原始值响应，会产生 ref
 * @param {*} val 原始类型
 * @returns proxy 对象
 */
export function ref(val){
    const wrapper={
        value:val
    }

    Object.defineProperty(wrapper, '__v_isRef', {
        value:true
    })

    return reactive(wrapper)
}

/**
 * 对象想要使用 拓展语法 ... ，传产生ref
 * @param {Object} target proxy 对象
 * @param {String} key proxy 对象 key
 * @returns 
 */
 export function toRef(target, key){
    const wrapper = {
        get value(){
            return target[key]
        },
        set value(val){
            obj[key] = val
        }
    }

    Object.defineProperty(wrapper,'__v_isRef',{
        value:true
    })

    return wrapper
}

/**
 * 把对象的每一个值都转成 ref 
 * @param {*} target 对象
 * @returns 
 */
export function toRefs(target){
    const res = {}
    for (const key in target) {
        res[key] = toRef(target, key)
    }
    return res
}


/**
 * 访问代理，对ref进行 脱 ref 操作
 * @param {*} target 
 * @returns 
 */
export function proxyRefs(target){
    return new Proxy(target,{
        get(target, key, receiver){
            const value = Reflect.get(target,key,receiver)
            return value.__v_isRef ? value.value : value
        },
        set(target, key, newValue, receiver){
            const value = target[key]
            if(value.__v_isRef){
                value.value = newValue
                return true
            }
            return Reflect.set(target, key, newValue, receiver)
        }
    })
}
