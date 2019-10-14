var IPCManager = require('../src/common/IPCManager.js')
var debug = require('debug')('test:ipcClientTest')


var ipcManager = new IPCManager()

ipcManager.createClient({})

var messageCount = 0

ipcManager.addClientListenner('test',(data,socket) => {
    //debug(data)
    debug('message come '+messageCount++)

})

ipcManager.connect('serverTest')

// setInterval(() => {
//     if(ipcManager.serverConnected){
//         ipcManager.clientEmit('test','message from client') 
//     }
    
// }, 100);




// setInterval(() => {

//     ipcManager.debug()
    
// }, 5000);


