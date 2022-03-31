// 26. 删除有序数组中的重复项

/*
    解法与 move-zeroes 算法类似
*/

/**
 * @param {number[]} nums
 * @return {number}
 */
 var removeDuplicates = function(nums) {
    // 不重复元素下标
    let j = 0
    for(let i = 0; i < nums.length; i++){
        // 进入第一次循环，直接复制，也是初始化值
        if(j === 0){
            nums[j] = nums[i]
            // 非元素下标向前移动
            j++
        }
        // 比较非元素下标j前一位元素，是否与i下标元素相等
        if(nums[j-1] !== nums[i]){
            // 不相等 替换当前 j 元素 
            nums[j] = nums[i]
            // j 向前移动一位
            j++
        }
    }
    // 删除 nums 数组 j 下标之后（重复元素）的所有元素
    nums.splice(j,nums.length-j)
    return nums.length
};