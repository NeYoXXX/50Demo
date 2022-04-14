class PersonClass{

    static id = '1234556'

    constructor(name){
        this.name = name
        this.num = 23
    }

    sayName(){
        console.log(this.name);
    }

    get age(){
        return this.num
    }

    set age(val){
        this.num = val
    }
}

let PersonType = (function(){
    "use strict";

    const PersonType1 = function(name){
        if(typeof new.target === 'undefined'){
            throw '必须使用new关键字调用'
        }
        this.name = name
        this.num = 23
    }

    PersonType1.id = '12312312'

    Object.defineProperty(PersonType1.prototype,'sayName',{
        value:function(){
            if(typeof new.target !== 'undefined'){
                throw '不能使用new关键字调用'
            }
            console.log(this.name);
        },
        enumerable:false,
        writable:true,
        configurable:true
    })

    Object.defineProperty(PersonType1.prototype,'age',{
        get(){
            return this.num
        },
        set(val){
            this.value = val
        },
        enumerable:false,
        configurable:true
    })

    return PersonType1
}())


let personType2 = (function(){
    const personType2 = function(bey){
        this.bey = 'bey'
    }

    Object.defineProperty(personType2.prototype,'sayBey',{
        value:function(){
            if(typeof new.target !== 'undefined'){
                throw '不能使用new关键字调用'
            }
            console.log(this.bey);
        },
        enumerable:false,
        writable:true,
        configurable:true
    })
    return personType2
})

personType2.prototype = PersonType.prototype



let person = new personType2('123')
console.log(person);
person.sayName