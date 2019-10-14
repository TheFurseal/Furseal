const IPCManager = require('../src/common/IPCManager.js')
const fs = require('fs')
const progress = require('process')

console.log('version: 0.0.4')

var ipcManager = new IPCManager()

function run(data){
    console.log(data)
    if(typeof(data) == 'string'){
        data = JSON.parse(data)
    }
    data.protected.outputFiles = []
    var output = {}
    var targetPath = progress.cwd()+'/'+data.unprotected.blockName+'_result.txt'
    fs.writeFile(targetPath, data.unprotected.blockName, (err) => {
        // throws an error, you could also catch it here
        if(err){
            console.error(err)
            ipcManager.serverEmit('result',{})
        }else{
           
            output.path = targetPath
            output.fileName = data.unprotected.blockName+'_result.txt'
            data.protected.outputFiles.push(output)
            ipcManager.serverEmit('result',JSON.stringify(data))
        }
    })
   
    
}

ipcManager.createServer({
    id:'dapp'
})

ipcManager.addServerListenner('request',(data,socket) => {
    run(data)
})

ipcManager.serve()
