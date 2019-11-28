const AppCommon = require('../common/appCommon.js')
const IPCManager = require('../common/IPCManager.js')
const debug = require('debug')('cli:assimilatorCli')



/**
 * data = {
 *  type:'assimRequest',
 *  workName:'workname',
 *  totalBlock:64,
 *  dim:'8_8',
 *  outputs:[
 *      {
 *          index:'4_1',
 *          path:'filepath'
 *      },
 *      ...
 *  ],
 *  finalResult:{
 *      path:'path'
 *  }
 * }
 */



class AssimilatorCli{
    constructor({
        paramater:param,
        workInfo:workInfo,
        dbWork:dbW,
        dbBlock:dbB,
        dbApp:dbA
    }){
        debug('Create assimilator cli')
        if(param == null){
            console.error('empty paramater')
            return 
        }
        if(dbW == null){
            console.error('empty work database handler')
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

        this.dbB = dbB
        this.dbA = dbA
        this.dbW = dbW
        this.callbacks = {}
        var pa = this
        param.id = param.setName+'_assimilator'
        param.type = 'assimilator'
        this.appCommon = new AppCommon(param,dbA)
        function assimilate(res,callback){
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
            var finalRes = {}
            finalRes.workName = res.workName
           
            if(res.result == 'YES'){
                finalRes.path = res.outputFile.path
                callback(null,finalRes)
               
            }else if(res.result == 'NO'){
                callback(res.error,null)
            }else{
                callback('system error',null)
            }

            callback = null
        }

         //IPC
        this.ipcManager.createClient({})
        this.ipcManager.addClientListenner('result',(data) => {
            if(typeof(data) == 'string'){
                data = JSON.parse(data)
            }
            debug('revice result 2',data)
            assimilate(data,pa.callbacks[data.workName])
        })
        
        this.param = param
    }

    //common code 

    stop(){
        this.appCommon.stop()
        this.ipcManager.clientDisconnect()
    }

    start(){
        var pa = this
        if(pa.pid > 0){
            return
        }
        debug('Assimilator cli start')
        this.appCommon.start((pid) => {
            // debug('set pid '+pid)
            pa.pid = pid

        })
        this.ipcManager.connect(this.param.id)
    }

    request(workInfo,callback){
        if(typeof(workInfo) == 'string'){
            workInfo = JSON.parse(workInfo)
        }
        // make request
        var dbB = this.dbB
        function makeRequest(wInfo,callback){
            if(typeof(wInfo) == 'string'){
                wInfo = JSON.parse(wInfo)
            }
            
            dbB.getAllValue((value) => {
                var requestTmp = {}
                requestTmp.type = 'assimilateRequest'
                requestTmp.workName = wInfo.workName
                requestTmp.totalBlock = wInfo.unprotected.block.number
                requestTmp.dim = wInfo.unprotected.block.indexs
                requestTmp.outputs = []
                var count = 0
                value.forEach(element => {
                   
                    if(element.workName == wInfo.workName){
                        var subTmp = {}
                        subTmp.path = element.protected.outputFiles[0].path
                        subTmp.index = element.unprotected.block.index
                        requestTmp.outputs.push(subTmp)
                        count++
                        if(count == requestTmp.totalBlock){
                            callback(requestTmp)
                        }else{
                            debug('Wrong block number!!!!!')
                        }
                    }
                })
            })
        }

       
        this.callbacks[workInfo.workName] = callback
        
        
       
        if(!this.ipcManager.serverConnected){
            var handle = setInterval(() => {
                if(this.ipcManager.serverConnected){
                    clearInterval(handle)
                    debug('send assimilate request 1')
                    makeRequest(workInfo,(value) => {
                        if(typeof(value) != 'string'){
                            value = JSON.stringify(value)
                        }
                        this.ipcManager.clientEmit('request',value)
                    })
                }
                debug('wait assimilator ....')
            }, 500);
        }else{
            makeRequest(workInfo,(value) => {
                if(typeof(value) != 'string'){
                    value = JSON.stringify(value)
                }
                this.ipcManager.clientEmit('request',value)
                debug('send assimilate request 2')
            })  
        }
    }
}

module.exports = AssimilatorCli