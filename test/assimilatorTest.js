const IPCManager = require('../src/common/IPCManager.js')

console.log('version: 0.0.4')

var ipcManager = new IPCManager() 

// validation code
function run(data){
    if(data == null){
        return
    }
    console.log(data)
    if(typeof(data) == 'string'){
        data = JSON.parse(data)
    }

    var msg = {}
   
    if(data.totalBlock != null && data.outputs != null && data.totalBlock == data.outputs.length){
        msg.result = 'YES'
        msg.finalResult = {}
        msg.finalResult.path = 'final result path'
    }else{
        msg.result = 'NO'
        msg.error =  'total block '+data.totalBlock+' output len '+data.outputs.length
    }
    msg.workName = data.workName
    ipcManager.serverEmit('result',JSON.stringify(msg))
}


ipcManager.createServer({
    id:'assimilator'
})
ipcManager.addServerListenner('request',(data,socket) => {
    run(data)
})
ipcManager.serve()