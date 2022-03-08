(function(modules){
    function require(filePath){
        const fun = modules(filePath)
        const module = {
            exports:{}
        }
        fun(require,module,module.exports)
    }
    require('./main.js')
})({
    './main.js':function(require,module,exports){
        
    },
    './foo.js':function(require,module,exports){

    },
    './foo1.js':function(require,module,exports){

    },
    './bar.js':function(require,module,exports){

    }
})