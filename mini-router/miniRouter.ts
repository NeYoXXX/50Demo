interface router{
    template:string,
    path:string,
    [x:string]:string
}

type routers = Array<router>



const router:routers = [{
    name:'Home',
    template:'<h1>Home</h1>',
    path:'/home'
},{
    name:'Login',
    template:'<h1>Login</h1>',
    path:'/login'
},{
    name:'Info',
    template:'<h1>Info</h1>',
    path:'/info'
}]


const rlDom = document.getElementById('router-link')
const rvDom = document.getElementById('router-view')
if(rlDom){
    router.forEach(item=>{
        const a = document.createElement('a')
        a.innerText = item.name
        a.href = '/#' + item.path

        a.onclick = function(e){
            const name = (e.target as HTMLAnchorElement).innerText
            router.forEach(item1=>{
                if(name === item1.name){
                    if(rvDom){
                        rvDom.innerHTML= item1.template
                    }
                }
            })
            
        }
        rlDom.appendChild(a)
    })

}










