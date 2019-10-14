var tool = require('../src/common/tools.js')
var fs = require('fs')

var path1 = '/Users/John\\hello\\123'
var path2 = '/Users/John/ello/456'

console.log(tool.fixPath(path1))
console.log(tool.fixPath(path2))