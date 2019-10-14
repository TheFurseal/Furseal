var EnvDetector = require('../src/common/enviromentDetector.js')



var envDete = new EnvDetector()

var info = {}

info.basic = {}
info.basic.platform = ['darwin','windows']
info.basic.architecture = 'x64'
info.optional = {}
info.optional.CPUSpeed = 6000
info.optional.memory = 8
info.optional.disk = 80
info.optional.bandwidth = 40
info.optional.thirdParty = []
// var tmp = {}
// tmp.path = '/bin/ls'

// info.optional.thirdParty.push(tmp)

// var tmp2 = {}
// tmp2.path = '/usr/bin/cd'
// info.optional.thirdParty.push(tmp2)

var tmp = {}
tmp.regedit = 'HKLM\\SOFTWARE\\Google\\Chrome'
info.optional.thirdParty.push(tmp)

console.log(info)


envDete.match(info,(err,value) => {
    if(err){
        console.error(err)
    }else{
        console.log('test passed with return value '+value)
    }
})
