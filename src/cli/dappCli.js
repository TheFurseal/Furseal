const AppCommon = require('../common/appCommon.js')
const IPCManager = require('../common/IPCManager.js')
const debug = require('debug')('cli:dappCli')



class DAppCli{
    constructor({
        paramater:param,
        appDB:appDB
    }){
        debug('Create dapp cli')
        this.ipcManager = new IPCManager()
        param.id = param.setName+'_dapp'
        param.type = 'dapp'
        this.appCommon = new AppCommon(param,appDB)
        //IPC
        this.ipcManager.createClient({})
        this.param = param
    }

    //other function
    stop(){
        this.appCommon.stop()
        this.ipcManager.clientDisconnect()
    }

    start(callback){
        var pa = this
        debug('DApp cli start')
        this.appCommon.start((pid) => {
            debug('set pid '+pid)
            pa.pid = pid
        })
        this.ipcManager.addClientListenner('result',(data) => {
            debug('revice result')
            if(typeof(data) == 'string'){
                data = JSON.parse(data)
            }
            if(callback != null){
                callback(data)
            }else{
                console.error('No callback for '+data.unprotected.blockName)
            }
        })
        this.ipcManager.connect(this.param.id)
    }

    request(workInfo){
        if(typeof(workInfo) == 'string'){
            workInfo = JSON.parse(workInfo)
        }
        if(!this.ipcManager.serverConnected){
            var handle = setInterval(() => {
                if(this.ipcManager.serverConnected){
                    clearInterval(handle)
                    this.ipcManager.clientEmit('request',JSON.stringify(workInfo))
                } 
                
            }, 500)
            debug('waitting dapp .......')
        }else{
            this.ipcManager.clientEmit('request',JSON.stringify(workInfo))
        }       
    }
}

module.exports = DAppCli