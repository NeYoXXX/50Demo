// 网上找的函数
function bigData(a,b){
    let res='', c=0;
    a = a.split('');
    b = b.split('');
    while (a.length || b.length || c){
        // ~~运算符 这里的做用主要是把undefined转成0
        c += ~~a.pop() + ~~b.pop();
        // 字符传相加，直接调整好前后顺序
        res = c % 10 + res;
        // c在此处是true，经过换算true=1，true+0=1，实现了进位的功能
        c = c>9;
    }
    return res.replace(/^0+/,'');
}

// 自己写的函数
function bigDataOwn(a,b){
    let res = ''
    a = a.split('')
    b = b.split('')
    let isTrue = false
    while(a.length || b.length){
        let tempa = a.pop()
        let tempb = b.pop()
        if(!isTrue){
            if(tempa && tempb){
                let temp = parseInt(tempa) + parseInt(tempb)
                if(temp>=10){
                    isTrue = true
                }else{
                    isTrue = false
                }
                res = temp%10 + res

            }else if(tempa){
                let temp = parseInt(tempa)
                if(temp>=10){
                    isTrue = true
                }else{
                    isTrue = false
                }
                res = temp%10 + res
            }else if(tempb){
                let temp = parseInt(tempb)
                if(temp>=10){
                    isTrue = true
                }else{
                    isTrue = false
                }
                res = temp%10 + res
            }
        }else{
            if(tempa && tempb){
                let temp = parseInt(tempa) + parseInt(tempb) + 1
                if(temp>=10){
                    isTrue = true
                }else{
                    isTrue = false
                }
                res = temp%10 + res
            }else if(tempa){
                let temp = parseInt(tempa) + 1
                if(temp>=10){
                    isTrue = true
                }else{
                    isTrue = false
                }
                res = temp%10 + res
            }else if(tempb){
                let temp = parseInt(tempb) + 1
                if(temp>=10){
                    isTrue = true
                }else{
                    isTrue = false
                }
                res = temp%10 + res
            }
        }
    }

    return res
}

// 测试
console.log(add('123456789','123456354356345623452345234'))
console.log(add1('123456789','123456354356345623452345234'))
