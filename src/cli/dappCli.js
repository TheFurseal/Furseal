const AppCommon = require('../common/appCommon.js')
const IPCManager = require('../common/IPCManager.js')
const debug = require('debug')('cli:dappCli')



class DAppCli{
    constructor({
        paramater:param,
        appDB:appDB
    }){
        debug('Create dapp cli')
        var pa = this
        this.ipcManager = new IPCManager()
        param.id = param.setName+'_dapp'
        param.type = 'dapp'
        this.appCommon = new AppCommon(param,appDB)
        //IPC
        this.ipcManager.createClient({})
        this.ipcManager.addClientListenner('result',(data) => {
            if(typeof(data) == 'string'){
                data = JSON.parse(data)
            }
            debug('DApp result comming !')
            if(pa.callback != null){
                pa.callback(data)
                debug('callback excuted')
            }else{
                console.error('No callback for '+data.unprotected.blockName)
            }
        })
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
            pa.pid = pid
        })
        pa.callback = callback
        this.ipcManager.connect(this.param.id)
    }

    request(workInfo){
        if(typeof(workInfo) == 'string'){
            workInfo = JSON.parse(workInfo)
        }
        var pa = this
        if(!this.ipcManager.serverConnected){
            var handle = setInterval(() => {
                if(pa.ipcManager.serverConnected){
                    clearInterval(handle)
                    pa.ipcManager.clientEmit('request',JSON.stringify(workInfo))
                } 
            }, 500)
            debug('waitting dapp .......')
        }else{
            this.ipcManager.clientEmit('request',JSON.stringify(workInfo))
        }       
    }
}

module.exports = DAppCli