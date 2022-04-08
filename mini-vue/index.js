import Dep from './dep.js'
import Watcher,{watch} from './watcher.js'
let testData = {
    a:1,
    b:'test',
    c:[],
    d:{},
    e:{
        f:1,
        g:'123'
    }
}

let depIns = null
function defineReactive(data,key,value){
    /*
        value 参数作为了中间值
        针对每个 data 中的属性，创建一个 Dep 类
    */
    depIns = new Dep()
    Object.defineProperty(data,key,{
        configurable:true,
        enumerable:true,
        get(){
            // 收集依赖
            depIns.depend()
            return value
        },
        set(val){
            // 触发依赖
            value = val
            depIns.notify(val)
        }
    })
}

defineReactive(testData,'a',1)

watch(testData,'a',function(newVal,oldVal){
    console.log(newVal,oldVal);
})

// testData.a = 2

// 如何使用
// console.log(testData.a);
// console.log(testData.a);
// console.log(testData.a);
// console.log(testData.a);
// console.log(testData.a);
console.log(depIns);