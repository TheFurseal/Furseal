var IPCManager = require('../src/common/IPCManager.js')
var debug = require('debug')('test:ipcClientTest')


var ipcManager = new IPCManager()

ipcManager.createClient({})

var messageCount = 0

ipcManager.addClientListenner('test',(data,socket) => {
    //debug(data)
    console.log('message come '+messageCount++)
    ipcManager.clientDisconnect()

})



setInterval(() => {
    ipcManager.connect('serverTest')
    if(ipcManager.serverConnected){
        console.log('1')
        ipcManager.clientEmit('server','message from client') 
    }else{
        console.log('wait to connect server')
    }
    
}, 3000);




// setInterval(() => {

//     ipcManager.debug()
    
// }, 5000);


