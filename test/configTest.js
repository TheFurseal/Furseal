const Config = require('../src/common/config.js')


var config = new Config('./conf')



var str = 'this is a test string'
console.log(str)
var enStr = config.encrypto(str)
console.log(enStr)
enStr = config.decrypto(enStr)
console.log(enStr)

