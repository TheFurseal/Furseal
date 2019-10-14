const IPCManager = require('../src/common/IPCManager.js')

console.log('version: 0.0.4')

var ipcManager = new IPCManager() 

// validation code
function run(data){
    console.log(data)
    if(typeof(data) == 'string'){
        data = JSON.parse(data)
    }
    var msg = {}
    if(data.protected.outputFiles != null){
        msg.result = 'YES'
    }else{
        msg.result = 'NO'
    }
    msg.workInfo = data
    ipcManager.serverEmit('result',JSON.stringify(msg))
}



ipcManager.createServer({
    id:'validator'
})
ipcManager.addServerListenner('request',(data,socket) => {
    run(data)
})
ipcManager.serve()

