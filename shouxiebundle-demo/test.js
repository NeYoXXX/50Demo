function bar(){
    // bar.js
    export default 456
}

function foo1(){
    // foo1.js
    export default 123
}

function foo(){
    // foo.js
    import foo1 from "./foo1.js"
    export default foo1
}

function main(){
    // main.js
    import foo from "./foo.js";
    import bar from "./bar.js"

    console.log(foo);
    console.log(bar);
}

