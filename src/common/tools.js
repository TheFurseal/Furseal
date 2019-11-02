var Process = require('process')
var Path = require('path')
var Child = require('child_process')
var Spawn = Child.spawn
var fs = require('fs');
const os = require('os')
const {Registry} = require('rage-edit')
const disk = require('diskusage-ng')
const debug = require('debug')('common:tools')
// const lz4 = require('lz4')
const lz4 = require('lz4js')
const base58 = require('bs58')
const crypto = require('crypto')
const keyLeng = 1024
const msgPDLength = 128
const msgLength = 110





module.exports = {
    publicEncrypt: (pubKey,data) => {
       
        var enBuf = null
        for(var i = 0; i< data.length; i+=msgLength){
            var len = msgLength
            if(i+len > data.length){
                len = data.length - i
            }
            var subStr = data.substr(i,len)
            var tmp = crypto.publicEncrypt(
                {
                    key:pubKey,
                    padding: crypto.constants.RSA_PKCS1_PADDING
                },
                Buffer.from(subStr),
            )
            if(enBuf == null){
                enBuf = tmp
            }else{
                enBuf = Buffer.concat([enBuf,tmp])
            }
        }
        return enBuf
    },
    publicDecrypt: (pubKey,data) => {
        if(typeof(data) == 'string'){
            debug('Convert string to Buffer')
            data = Buffer.from(data)
        }
        var protectedTmp = null
        for(var i=0;i<data.length;i+=msgPDLength){
            var len = msgPDLength
            if(i+len > data.length){
                len = data.length - i
            }
            var subBuffer = Buffer.alloc(len)
            data.copy(subBuffer,0,i,i+len)
            var tmp = crypto.publicDecrypt(
                {
                    key:pubKey,
                    passphrase:'top secret',
                    padding: crypto.constants.RSA_PKCS1_PADDING
                },
                subBuffer
            )
            if(protectedTmp == null){
                protectedTmp = tmp
            }else{
                protectedTmp = Buffer.concat([protectedTmp,tmp])
            }
        }
        return protectedTmp
    },
    privateDecrypt: (privKey,data) => {
        if(typeof(data) == 'string'){
            debug('Convert string to Buffer')
            data = Buffer.from(data)
        }
        var protectedTmp = null
        for(var i=0;i<data.length;i+=msgPDLength){
            var len = msgPDLength
            var subBuffer = Buffer.alloc(len)
            data.copy(subBuffer,0,i,i+len)
            var tmp = crypto.privateDecrypt(
                {
                    key:privKey,
                    passphrase:'top secret',
                    padding: crypto.constants.RSA_PKCS1_PADDING
                },
                subBuffer
            )
            if(protectedTmp == null){
                protectedTmp = tmp
            }else{
                protectedTmp = Buffer.concat([protectedTmp,tmp])
            }
        }
        return protectedTmp
    },
    base58: base58,
    fixPath: (path) => {
        return path.replace(/\\/g,'/')
    },
    setEnv:(key,value) => {

        //fix space

        if(Process.platform == 'darwin'){
            var profilePath = Process.env['HOME']+'/.bash_profile'
            var buf = fs.readFileSync(profilePath)
            buf = buf.toString()
            if(!buf.includes(key)){
                Process.env[key] = value
                    buf = buf+'\nexport '+key+'=\''+value+'\'\n'
                    fs.writeFileSync(profilePath,buf)
                
                }else{
                Process.env[key] = value
                var start = 0
                var tmp = ''
                for(var i=0;i<buf.length;i++){
    
                    if(buf[i] == '\n'|| i == buf.length-1){
                        var elem = buf.substring(start,i)
                        start = i
                        if(elem.includes(key)){
                            var fixed = '\nexport '+key+'=\''+value+'\'\n'
                            tmp = tmp + fixed
                        }else{
                            tmp = tmp+elem
                        }
                    }else{
                    }
                }
                fs.writeFileSync(profilePath,tmp)
            
            }   
        }else if(Process.platform == 'win32'){
            var arg = []
            arg.push(key)
            arg.push(value)
            var cmd = Spawn('setx',arg)
            cmd.stdout.on('data',(data) => {
                console.log(data.toString())
            })
        }else if(Process.platform == 'linux'){
    
        }else{
            console.error('[setEnv]:Unsupport platform')
        }
    },
    decompressionBuffer:(inBuffer) => {
        return Buffer.from(lz4.decompress(inBuffer))
    },
    compressionBuffer:(inBuffer) => {
        return Buffer.from(lz4.compress(inBuffer))
    },
    decompression: (src,dest) => {
        var decoder = lz4.createDecoderStream()
        var input = fs.createReadStream(src)
        var output = fs.createWriteStream(dest)
        input.pipe(decoder).pipe(output)
    },
    compression: (src,dest) => {
        var encoder = lz4.createEncoderStream()
        var input = fs.createReadStream(src)
        var output = fs.createWriteStream(dest)
        input.pipe(encoder).pipe(output)
    },
    diskAbility: (partition) => {
        if(partition == null){
            if(Process.platform == 'win32'){
                partition = 'C:\\'
            }else{
                partition = '/'
            }
            
        }
        return new Promise((resolve,reject) => {
            disk.diskusage(partition, function(err, info) {
                if(err){
                    reject(err)
                }else{
                    resolve(info.available/1024/1024/1024)
                }
                
            });
        })
        
    },
    get3rdPartyInfoFromName: (name) => {
        var tmp = Process.env.PATH
        var spl = tmp.split(':')

        return new Promise((resolve,reject) => {
            for(var i=0;i<spl.length;i++){
                var element = spl[i]
                var targetPath = element+'/'+name
                if(fs.existsSync(targetPath)){
                    resolve(targetPath)
                    return
                }else{

                }
            }
            reject(targetPath)
        })

        

    },
    get3rdPartyInfoFromPath: (path) => {
        if(fs.existsSync(path)){
            return true
        }else{
            return false
        }
    },

    get3rdPartyInfoFromEnv: (env) => {
        if(this.process.env[env] != null){
            return true
        }else{
            return false
        }
    },
    // win32 only
    get3rdPartyInfoFromRegedit: async (key) => {
        return await Registry.get(key)
    },
    memoryAbility: () => {
        return os.totalmem()/1024/1024/1024
    },
    CPUAbility: () => {
        var cpuInfo = os.cpus()
        var abli = 0
        cpuInfo.forEach((element) => {
            abli+=element.speed
        })
        return abli
    },
    process: Process,
    signalHelper: (sig,callback) => {

        Process.once(sig,(code) => {
            debug('Recive '+sig+' '+code)
            callback(sig,code)
            
        }) 

    },
    removeRepoLock: (lockPath) => {
        if(fs.existsSync(lockPath)){
            fs.unlinkSync(lockPath)
        }
    },
    lockCleaner:(lockPath) => {
        debug('registe lock '+lockPath)
        function removeRepoLock(lockPath){
            if(fs.existsSync(lockPath)){
                fs.unlinkSync(lockPath)
            }
        }
        
        Process.once('SINGTERM',(code) => {
            removeRepoLock(lockPath)
            debug('Recive  SINGTERM '+code)
        })
        
        Process.once('SIGINT',(code) => {
            removeRepoLock(lockPath)
            debug('Recive SIGINT '+code)
        })

    },
    copyFile: (file, file2)=>{
      fs.copyFileSync(file,file2)
    },

    getPlatformInfo: function(){
        var tmp =  Process.platform
        
        return tmp
    },
    getArchInfo: function(){
        return Process.arch
    },
    matchOS:function(os1,os2){
        if(os1 == null || os2 == null){
            return false
        }
        if(os1 == 'win32'){
            os1 = 'windows'
        }
        if(os2 == 'win32'){
            os2 = 'windows'
        }
        os1 = os1.toLowerCase()
        os2 = os2.toLowerCase()
        if(os1.includes(os2) || os2.includes(os1)){
            return true
        }else{
            debug('dismatch ',os1,os2)
            return false
        }

    },
    matchArch:function(arc1,arc2){
        if(arc1 == null || arc2 == null){
            return false
        }
        arc1 = arc1.toLowerCase()
        arc2 = arc2.toLowerCase()

        if(arc1 == 'x64'){
            arc1 = 'x86_64'
        }

        if(arc2 == 'x64'){
            arc2 = 'x86_64'
        }


        if(arc1.includes(arc2) || arc2.includes(arc1)){
            return true
        }else{
            return false
        }
    },
    getAppName: function(path){
        if(path == null){
            console.error('Empty app path')
            return
        }
    
        path = path.replace(/\\/g,'/')
        var sp = path.split('/')
        if(sp == null){
            return 
        }
        return sp[sp.length -1]
    },

    getPIDByName: function(name,callback){
       
        if(name == null){
            console.error('Empty process name')
            callback(-1)
        }
        name = name.toLowerCase()
        var cmd=Process.platform=='win32'?'tasklist':'ps -A';
        var exec = Child.exec;
        
        exec(cmd, function(err, stdout, stderr) {
            if(err){ 
                debug(err)
                return 
            }

            var lines = stdout.split('\n')

            for(var i=0;i<lines.length;i++){
                var line = lines[i]
                var p
                if(Process.platform == 'win32'){
                    p=line.trim().split(/\s+/),nameStr=p[0],pidStr=p[1]
                    if(nameStr.toLowerCase().indexOf(name)>=0 && parseInt(pidStr)){
                       
                        callback(parseInt(pidStr))
                        return;
                    }else{
                        //callback(-1)
                    }
                }else if(Process.platform = 'darwin'){
                    p=line.trim().split(/\s+/),pidStr=p[0],nameStr=p[p.length-1]
                    
                    if(nameStr.toLowerCase().indexOf(name)>=0 && parseInt(pidStr)){
                       
                        callback(parseInt(pidStr))
                        return;
                    }else{
                        //callback(-1)
                    }
                }
            }
            debug('not got pid')
            callback(-1)

            
        });
    
    },

    createProcess:function(option,callback){
        if(option == null){
            var err =Error('Empty param')
            console.error(err)
            return
        }
        if(option.path == null){
            var err =Error('Empty path')
            console.error(err)
            return 
        }
        
        option.path = Path.resolve(option.path)
        debug(option.path)

        if(option.tempPath != null){
            debug('copy to tempPath')
            var name = this.getAppName(option.path)
            name = option.tempPath+'/'+name
            this.copyFile(option.path,name )
            option.path = name
        }


        if(option.name == null){
            var p
            if(Process.platform == 'win32'){
                p = option.path.split('\\')
            }else{
                p = option.path.split('/')
            }
            
           option.name = p[p.length-1]
        }
        if(option.args == null){
           
        }else{
            if(typeof(option.args) != 'object'){
                console.error('option.args must be a object')
                return
            }
        }

        debug('Luanch ',option)
    
        if(Process.platform == 'win32'){

            var cmd
            var opt = {}
            opt.env = process.env
            console.log(process.env.COT_DATA_PATH)
            cmd = Spawn(option.path,option.args,opt)
            

            callback(null,cmd.pid)

            cmd.stdout.on('data', function (data) {
                debug(data.toString())
            });
            
            // 捕获标准错误输出并将其打印到控制台
            cmd.stderr.on('data', function (data) {
                debug(data.toString())
               
            });
            
            // 注册子进程关闭事件
            cmd.on('exit', function (code, signal) {
                //callback(null,-1)
                debug('child process exit')
            });
        }else if(Process.platform == 'darwin'){
            
            var cmd
            var opt = {}
            opt.env = process.env
            cmd = Spawn(option.path,option.args,opt)

            callback(null,cmd.pid)

            cmd.stdout.on('data', function (data) {
                debug(data.toString())
            });
            
            // // 捕获标准错误输出并将其打印到控制台
            cmd.stderr.on('data', function (data) {
                debug(data.toString())
            });
            
            // // 注册子进程关闭事件
            cmd.on('exit', function (code, signal) {
                //callback(null,-1)
                debug('child process exit')
            });
           
        }

        
        

    },
    killProcess: function(pid){
        Process.kill(pid)
    }
    
}