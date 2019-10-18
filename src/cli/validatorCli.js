const AppCommon = require('../common/appCommon.js')
const IPCManager = require('../common/IPCManager.js')
const debug = require('debug')('cli:validatorCli')

class ValidatorCli{
    constructor({
        paramater:param,
        workInfo:workInfo,
        dbBlock:dbB,
        dbApp:dbA
    }){
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

        this.ipcManager = new IPCManager()

        var pa = this
        param.id = param.setName+'_validator'
        param.type = 'validator'
        this.appCommon = new AppCommon(param,dbA)
        this.appCommon.start((pid) => {
            debug('set pid '+pid)
            pa.pid = pid

        })

      
        //IPC
        this.ipcManager.createClient({})
        this.ipcManager.addClientListenner('result',(data) => {
            debug('revice result 2',JSON.parse(data))
            validate(data)
        })
        this.ipcManager.connect(param.id)


        function validate(res){
            if(res == null){
                return
            }
            if(typeof(res) == 'string'){
                res = JSON.parse(res)
            }
            var wInfo = res.workInfo
            if(typeof(wInfo) == 'string'){
                wInfo = JSON.parse(wInfo)
            }
            if(res.result == 'YES'){
                wInfo.unprotected.status = 'validated'
            }else if(res.result == 'NO'){
                wInfo.unprotected.status = 'init'
            }else{

            }

            debug('validate record',wInfo)

            dbB.update(wInfo.unprotected.blockName,wInfo,(err) => {
                if(err){
                    console.error(err)
                }else{
                    debug(wInfo.unprotected.blockName+'  validated!!!!!!!!!')
                }
            })

        }

        this.param = param
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