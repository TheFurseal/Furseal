const AppCommon = require('../common/appCommon.js')
const IPCManager = require('../common/IPCManager.js')
const debug = require('debug')('cli:validatorCli')

class ValidatorCli{
    constructor({
        paramater:param,
        workInfo:workInfo,
        dbBlock:dbB,
        dbApp:dbA,
        callback:cb
    }){
        debug("Create a validator cli")
        if(param == null){
            console.error('empty paramater')
            return 
        }
        if(dbB == null){
            console.error('empty block database handler')
            return 
        }

        if(dbA == null){
            console.error('empty application database handler')
            return 
        }


        if(workInfo == null){
            console.error('empty workinfo handler')
            return 
        }
        this.callback = cb
        this.ipcManager = new IPCManager()
        var pa = this
        param.id = param.setName+'_validator'
        param.type = 'validator'
        this.appCommon = new AppCommon(param,dbA)
        //IPC
        this.ipcManager.createClient({})
        this.ipcManager.addClientListenner('result',(data) => {
            if(typeof(data) == 'string'){
                data = JSON.parse(data)
            }
            validate(data)
        })
        function validate(res){
            var wInfo = res.workInfo
            if(typeof(wInfo) == 'string'){
                wInfo = JSON.parse(wInfo)
            }
            if(res.result == 'YES'){
                wInfo.unprotected.status = 'validated'
            }else if(res.result == 'NO'){
                wInfo.unprotected.status = 'init'
                wInfo.unprotected.inputFiles[0].path = ''
            }else{

            }
            debug('validate record',wInfo)
            if(pa.callback != null){
                pa.callback(wInfo)
            }
        }
        this.param = param
    }

    start(){
        var pa = this
        debug('Validator cli start')
        this.appCommon.start((pid) => {
            debug('set pid '+pid)
            pa.pid = pid
    
        })
        this.ipcManager.connect(this.param.id)
    }
    stop(){
        this.appCommon.stop()
        this.ipcManager.clientDisconnect()
    }
    request(workInfo){
        if(!this.ipcManager.serverConnected){
            var handle = setInterval(() => {
                if(this.ipcManager.serverConnected){
                    clearInterval(handle)
                    this.ipcManager.clientEmit('request',workInfo)
                }
            }, 500);
        }else{
            this.ipcManager.clientEmit('request',workInfo)
        }
    }
}



module.exports = ValidatorCli