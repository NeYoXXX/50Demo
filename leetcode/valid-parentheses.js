/**
 * @param {string} s
 * @return {boolean}
 */
 var isValid = function(s) {
    let temp = []
    const KAISHI = ['(','[','{']
    const BIHE = [')',']','}']
    for(let item of s){
      if(KAISHI.includes(item)){
        temp.push(item)
      } else if (BIHE.includes(item)){
        let val = temp.pop()
        if(!val){
          return false
        }else if(val === '(' && item !== ')'){
          return false
        }else if(val === '[' && item !== ']'){
          return false
        }else if(val === '{' && item !== '}'){
          return false
        }
      }
    }
    if(temp.length !== 0) return false
    return true
  };