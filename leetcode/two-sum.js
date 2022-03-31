/**
 * @param {number[]} nums
 * @param {number} target
 * @return {number[]}
 */
 var twoSum = function(nums, target) {
    let temp = {}
    for(let i=0;i<nums.length;i++){
        // 注意这里应该是不等于undefined
        if(temp[(target - nums[i]).toString()] !== undefined){
            return [temp[(target - nums[i]).toString()], i]
        }
        temp[nums[i].toString()] = i
    }
};