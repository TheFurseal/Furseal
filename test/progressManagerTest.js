const ProgressManager = require('../src/common/progressManager.js')


var pm = new ProgressManager(10,92,0)

console.log('start ',pm.getProgress())
pm.updateProgressWithIndex(0,0,true)
console.log('in total range ',pm.getProgress())

pm.updateProgressWithIndex(9,0,true)
console.log('in total range ',pm.getProgress())

pm.updateProgressWithIndex(9,9,true)
console.log('over total range ',pm.getProgress())

pm.updateProgressWithIndex(8,9,true)
console.log('in total range ',pm.getProgress())