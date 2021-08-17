const progress = document.getElementById('progress')
const prev = document.getElementById('prev')
const next = document.getElementById('next')
const circles = document.querySelectorAll('.circle')

let currentAction = 1

next.addEventListener('click',function(){
    currentAction++
    if(currentAction > circles.length){
        currentAction = circles.length
    }
    update()
})

prev.addEventListener('click',function(){
    currentAction--
    if(currentAction < 0){
        currentAction = 0
    }
    update()
})


function update(){
    circles.forEach((item,index)=>{
        if(index < currentAction){
            item.classList.add('active')
        }else{
            item.classList.remove('active')
        }
    })

    const active = document.querySelectorAll('.active')
    progress.style.width = (active.length-1)/(circles.length-1) * 100 + '%'
    if(active.length === 1){
        prev.disabled = true
        next.disabled = false
    }else if(active.length > 1 && active.length !== circles.length){
        prev.disabled = false
        next.disabled = false
    }else{
        prev.disabled = false
        next.disabled = true
    }

}