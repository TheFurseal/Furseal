class A{
    constructor(){
        var pa = this
        setInterval(() => {
            pa.hello()
        }, 5000);
    }

    hello(){
        console.log('hello,world')
    }
}

module.exports = A

var a = new A()
