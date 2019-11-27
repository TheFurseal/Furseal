const Tools = require('../src/common/tools.js')
const Spawn = require('child_process').spawn

for(var i=0;i<1;i++){

    Tools.addEnv('PATH','C:/Users/Administrator/AppData/Roaming/CoTNetwork/applicationRepository')
}



var cmd = Spawn('ffmpeg',['ls'])
cmd.stdout.on('data',(data) => {
    console.log(data.toString())
})

cmd.stdout.on('error',(data) => {
    console.log(data.toString())
})