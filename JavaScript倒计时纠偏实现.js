// 模拟主线程还有其他任务
setInterval(function(){ 
    let j = 0
    while(j++ < 100000000){}
}, 0)

// 间隔为1秒
const interval = 1000
// 从服务器和活动开始时间计算出的时间差，这里测试用 50000 ms
let ms = 50000  
let count = 0
const startTime = new Date().getTime()
let timeCounter
if( ms >= 0) {
  timeCounter = setTimeout(countDownStart, interval)
}

// 原理是：计算出1秒种内的偏差时间，下一次的setTimeout的时间使用1000-偏差时间，也就是说减去了其他任务占用的主线程时间
function countDownStart () {
    count++
    // 偏差值
    const offset = new Date().getTime() - (startTime + count * interval)
    // 下一次执行时间
    let nextTime = interval - offset
    if (nextTime < 0) { 
        nextTime = 0 
    }
    // 重置剩下的活动时间
    ms -= interval
    console.log(`误差：${offset} ms，下一次执行：${nextTime} ms 后，离活动开始还有：${ms} ms`)
    if (ms < 0) {
        clearTimeout(timeCounter)
    } else {
        timeCounter = setTimeout(countDownStart, nextTime)
    }
 }
