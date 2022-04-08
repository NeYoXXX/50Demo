import Dep, { pushTarget, popTarget } from './dep.js'
export default class Watcher{

    constructor(vm,expOrFn,cb) {
        this.vm = vm
        this.getter = parsePath(expOrFn)
        this.func = cb
        // value 是获取目前 expOrFn 的值
        this.value = this.get()
    }

    get(){
        pushTarget(this)
        let value = this.getter.call(this.vm,this.vm)
        return value
    }

    addDep(dep){
        dep.addSub(this)
    }
}

export function watch(vm,str,cb){
    new Watcher(vm,str,cb)
}
/*
    有两种数据需要收集，模板中的数据和使用 watcher 函数的数据
    1. 使用 vm.watcher('a',function(newVal,oldVal){ ... })
    依据上面的示例需要有的属性，‘a’，newVal，oldVal，func
*/

const bailRE = /[^\w.$]/;
export function parsePath(path) {
  if (bailRE.test(path)) {
    return;
  }
  const segments = path.split(".");
  return function (obj) {
    for (let i = 0; i < segments.length; i++) {
      if (!obj) return;
      obj = obj[segments[i]];
    }
    return obj;
  };
}