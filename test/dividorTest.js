const IPCManager = require('../src/common/IPCManager.js')
const fs = require('fs')

console.log('version: 0.0.6')

var ipcManager = new IPCManager()

function constrcutTemplate(){
        
    //test
   
    var date = new Date();
    var input = {};
    input.workName = 'test'+date.valueOf()+'.zip';
    input.protected = {};

    input.protected.inputFiles = [];
    var file1 = {};
    file1.fileName = 'IMG_2146.JPG';
    file1.url = "/Users/john/Downloads/IMG_2146.JPG";
    file1.size = 1027;
    file1.md5 = 'unknow4';

    var file2 = {};
    file2.fileName = 'cryptopp-CRYPTOPP_8_2_0.zip';
    file2.url = "/Users/john/Downloads/cryptopp-CRYPTOPP_8_2_0.zip";
    file2.size = 1027;
    file2.md5 = 'unknow4';
    input.protected.inputFiles.push(file1)
    input.protected.inputFiles.push(file2)

    input.unprotected = {}
    input.unprotected.appSet = 'test02'
    input.unprotected.target = ['darwin-x86_64','linux-amd64','linux-x86_64','windows-x86_64']
    input.unprotected.block = {}
    input.unprotected.block.number = 64;
    input.unprotected.block.indexs = '8_8';
    input.unprotected.info = {};
    var startTime = new Date();
    startTime = startTime.valueOf();
    input.unprotected.info.startTime = startTime;
    input.unprotected.info.progress = 0;
    input.unprotected.ownner = 'QmWQiBanwUSrFCmoeD9DgR6xcqNUYZ4ozZiUvKwFArCVj6'
    ipcManager.serverEmit('request',JSON.stringify(input))
}


ipcManager.createServer({
    id:'dividor'
})
// ipcManager.addServerListenner('')
ipcManager.serve()

console.log('start IPC service')

setInterval(() => {
    if(fs.existsSync('./testWork')){
        fs.renameSync('./testWork','./testWork.done')
        constrcutTemplate()
    }
}, 3000);


