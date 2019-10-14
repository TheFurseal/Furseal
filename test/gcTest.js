const GCManager = require('../src/common/GCManager.js')



// var gcManager = new GCManager({})


// for(var i=0;i<30;i++){
//     var tmp = []
//     tmp.push('/Users/John/Desktop/'+i+'.txt')
//     tmp.push('/Users/John/Desktop/'+i+'a.txt')
//     gcManager.register(tmp,'hello,world')
// }


// gcManager.register('/Users/John/Desktop/sigle.txt','hello,world')


// for(var i=30;i<60;i++){
//     var tmp = []
//     tmp.push('/Users/John/Desktop/'+i+'.txt')
//     tmp.push('/Users/John/Desktop/'+i+'a.txt')
//     gcManager.register(tmp,'hello,world')
// }

// gcManager.clearByEvent('hello,world')

// setInterval(() => {
//     gcManager.dump()
// }, 3000);

var value = ['1','john','4','hello']
var files = ['hello','file1','file2']

var tmpArray = [...new Set([...value ,...files])]

console.log(tmpArray)

