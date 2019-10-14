var IPCManager = require('../src/common/IPCManager.js')
var debug = require('debug')('test:ipcServerTest')


var ipcManager = new IPCManager()

ipcManager.createServer({
    id:'serverTest',
    silent:true,
    retry: 500

})

ipcManager.addServerListenner('test',(data,sock) => {
    debug(data)
})

ipcManager.serve()

var message = 'This article will explain you to salt hash passwords using Node.js Crypto. Here we’ll not go into details comparing \
the pros and cons of different ways of storing passwords, rather we’ll see how we can implement salt hashing mechanism for storing passwords in NodeJS.\
This article will explain you to salt hash passwords using Node.js Crypto. Here we’ll not go into details comparing the pros and \
 cons of different ways of storing passwords, rather we’ll see how we can implement salt hashing mechanism for storing passwords in NodeJS.\
 This article will explain you to salt hash passwords using Node.js Crypto. Here we’ll not go into details comparing the pros and\
  cons of different ways of storing passwords, rather we’ll see how we can implement salt hashing mechanism for storing passwords in NodeJS.\
  This article will explain you to salt hash passwords using Node.js Crypto. Here we’ll not go into details comparing the pros \
   and cons of different ways of storing passwords, rather we’ll see how we can implement salt hashing mechanism for storing passwords in NodeJS.\
   This article will explain you to salt hash passwords using Node.js Crypto. Here we’ll not go into details comparing \
the pros and cons of different ways of storing passwords, rather we’ll see how we can implement salt hashing mechanism for storing passwords in NodeJS.\
This article will explain you to salt hash passwords using Node.js Crypto. Here we’ll not go into details comparing the pros and \
 cons of different ways of storing passwords, rather we’ll see how we can implement salt hashing mechanism for storing passwords in NodeJS.\
 This article will explain you to salt hash passwords using Node.js Crypto. Here we’ll not go into details comparing the pros and\
  cons of different ways of storing passwords, rather we’ll see how we can implement salt hashing mechanism for storing passwords in NodeJS.\
  This article will explain you to salt hash passwords using Node.js Crypto. Here we’ll not go into details comparing the pros \
   and cons of different ways of storing passwords, rather we’ll see how we can implement salt hashing mechanism for storing passwords in NodeJS.\
   This article will explain you to salt hash passwords using Node.js Crypto. Here we’ll not go into details comparing \
the pros and cons of different ways of storing passwords, rather we’ll see how we can implement salt hashing mechanism for storing passwords in NodeJS.\
This article will explain you to salt hash passwords using Node.js Crypto. Here we’ll not go into details comparing the pros and \
 cons of different ways of storing passwords, rather we’ll see how we can implement salt hashing mechanism for storing passwords in NodeJS.\
 This article will explain you to salt hash passwords using Node.js Crypto. Here we’ll not go into details comparing the pros and\
  cons of different ways of storing passwords, rather we’ll see how we can implement salt hashing mechanism for storing passwords in NodeJS.\
  This article will explain you to salt hash passwords using Node.js Crypto. Here we’ll not go into details comparing the pros \
   and cons of different ways of storing passwords, rather we’ll see how we can implement salt hashing mechanism for storing passwords in NodeJS.\
'

var messageCount = 0
setInterval(() => {
    if(ipcManager.clientConnected){
        ipcManager.serverEmit('test',message)
        debug('message go '+messageCount++)
    }else{
        debug('client offline')
    }
}, 5);

// setInterval(() => {

//     ipcManager.debug()
    
// }, 5000);


