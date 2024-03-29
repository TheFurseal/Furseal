var Core = require('./index.js')
var fs = require('fs')
var base58 = require('bs58')
var process = require('process')


console.log('start')
//for auto login
function decode(data){
   
    var tmp = data.slice(1,data.length-1);
    tmp = data[data.length-1]+tmp+data[0];
    
    tmp = base58.decode(tmp);
    tmp = tmp.toString();
    
    return JSON.parse(tmp);
}

var appData = process.env['APPDATA']
if(appData == null){
    appData = 'test'
}

var homePath = appData+'/CoTNetwork'

var core = new Core(homePath)
core.init()

function login(){

    var data = fs.readFileSync(homePath+'/pass')
    var dataDecode = decode(data.toString())
    core.login(dataDecode)
}

setTimeout(() => {
    console.log('start login')
    login()
    setTimeout(() => {
        console.log('start main process')
        core.process()
    }, 1000);
}, 3000);
