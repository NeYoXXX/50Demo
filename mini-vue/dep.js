export default class Dep{

    // watcher 是作为中间值，随时变化
    static target = null

    constructor(){
        this.depArray = []
    }

    addSub(val){
        this.depArray.push(val)
    }

    depend(){
        Dep.target.addDep(this)
    }

    notify(val){
        /*
            通知 watcher ，其实是执行 watcher 中回调
            val 是新值
        */
        for (const item of this.depArray) {
            // item.zhixinghuidiao(val)
        }
    }
}

export function pushTarget (target) {
    Dep.target = target
  }
  
  export function popTarget () {
    // Dep.target = targetStack[targetStack.length - 1]
  }