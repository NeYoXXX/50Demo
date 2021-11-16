class Greeter{
    public greeting:string;

    constructor(message: string){
        this.greeting = message;
    }

    greet(){
        return 'Hello,'+this.greeting;
    }

}

let greet = new Greeter('world')


class Person {
    // readonly关键字将属性设置为只读的。 只读属性必须在声明时或构造函数里被初始化。
    readonly age: number;
    protected name: string;
    constructor(name: string) { this.name = name; }
}

class Employee extends Person {
    private department: string;

    constructor(name: string, department: string) {
        super(name)
        this.department = department;
        this.name
    }

    public getElevatorPitch() {
        return `Hello, my name is ${this.name} and I work in ${this.department}.`;
    }
}

let howard = new Employee("Howard", "Sales");
console.log(howard.getElevatorPitch());
console.log(howard.name); // 错误

// 默认为public，private,protected
