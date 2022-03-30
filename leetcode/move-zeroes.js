/**
 * @param {number[]} nums
 * @return {void} Do not return anything, modify nums in-place instead.
 */
 var moveZeroes = function(nums) {
    // 非0下标
    let j = 0
    // 把非0的数据移动到数组最前面
    for(let i = 0; i < nums.length; i++){
        if(nums[i] !== 0){
            nums[j] = nums[i]
            j++
        }
    }
    // j 下标以后的数据都是0
    for(;j < nums.length; j++){
        nums[j] = 0
    }

};