const Config = require('../src/common/config.js')
const base58 = require('bs58')


var config = new Config('/Users/john/Library/Application Support/CoTNetwork')


var str = "/key/swarm/psk/1.0.0/\n\
/base16/\n\
0027383418fdc16487212c9e70f4ce7163afae6ffef873da4fcf8208449aaab9"
var tmp = base58.encode(Buffer.from(str))
console.log(tmp)

