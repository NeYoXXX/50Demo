function parseOptions(options){
    if(options.template){
        return parseInterpolation(options.template,options.data)
    }
}



function parseInterpolation(templateString,data){
    if(templateString.startsWith('{{')){
        let temp = templateString.slice(2,-2)
        return data[temp]
    }
    return undefined
}


let dom = document.getElementById('app')

let options = {
    template:'{{msg}}',
    data:{
        msg:'holle word'
    }
}


dom.innerHTML = parseOptions(options)