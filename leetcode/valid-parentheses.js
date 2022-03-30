/**
 * @param {string} s
 * @return {boolean}
 */
 var isValid = function(s) {
  // let temp = []
  // for(let str of s){
  //     let a = temp[temp.length - 1]
  //     if(str === '('){
  //         temp.push(str)
  //     }else if(str === '{'){
  //         temp.push(str)
  //     }else if(str === '['){
  //         temp.push(str)
  //     }else if(str === ')'){
  //         if(a === '('){
  //             temp.pop()
  //         }else{
  //             return false
  //         }
  //     }else if(str === ']'){
  //         if(a === '['){
  //             temp.pop()
  //         }else{
  //             return false
  //         }
  //     }else if(str === '}'){
  //         if(a === '{'){
  //             temp.pop()
  //         }else{
  //             return false
  //         }
  //     }
  // }
  // if(temp.length === 0){
  //     return true
  // }
  // return false

  let n = s.length
  // 长度为奇数，出错
  if(n % 2 === 1){
      return false
  }
  let mapTemp = new Map([
      [')','('],
      [']','['],
      ['}','{'],
  ])
  let temp = []

  for(let str of s){
      if(mapTemp.has(str)){
          if(!temp.length || mapTemp.get(str) !== temp[temp.length - 1]){
              return false
          }
          temp.pop()
      }else{
          temp.push(str)
      }
  }

  return !temp.length





};