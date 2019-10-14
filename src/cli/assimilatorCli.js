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
        this.globalCallback = {}

        this.dbB = dbB
        this.dbA = dbA
        this.dbW = dbW
        var pa = this
        param.id = param.setName+'_assimilator'
        param.type = 'assimilator'
        this.appCommon = new AppCommon(param,dbA)
        this.appCommon.start((pid) => {
            debug('set pid '+pid)
            pa.pid = pid

        })

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
                finalRes.path = res.finalResult.path
                callback(null,finalRes)
                delete pa.globalCallback[res.workName]
            }else if(res.result == 'NO'){
                callback(res.error,null)
                delete pa.globalCallback[res.workName]
            }else{
                callback('system error',null)
                delete pa.globalCallback[res.workName]
            }
           
        }

         //IPC
        this.ipcManager.createClient({})
        this.ipcManager.addClientListenner('result',(data) => {
            if(typeof(data) == 'string'){
                data = JSON.parse(data)
            }
            debug('revice result 2',data)
            assimilate(data,pa.globalCallback[data.workName])
        })
        this.ipcManager.connect(param.id)
        this.param = param
    }

    //common code 

    stop(){
        this.appCommon.stop()
        this.ipcManager.clientDisconnect()
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
            
            dbB.getAll((value) => {
               
                var requestTmp = {}
                requestTmp.type = 'assimilateRequest'
                requestTmp.workName = wInfo.workName
                requestTmp.totalBlock = wInfo.unprotected.block.number
                requestTmp.dim = wInfo.unprotected.block.indexs
                requestTmp.outputs = []
                var count = 0
                value.forEach(element => {
                    var tmp = element.value
                    if(typeof(tmp == 'string')){
                        tmp = JSON.parse(tmp)
                    }
                    if(tmp.workName == wInfo.workName){
                        var subTmp = {}
                        subTmp.path = tmp.protected.outputFiles[0].path
                        subTmp.index = tmp.unprotected.block.index
                        requestTmp.outputs.push(subTmp)
                        count++
                        if(count == requestTmp.totalBlock){
                            callback(requestTmp)
                            debug(requestTmp)
                        }
                    }
                    
                })
                
            })
        }
       
        this.globalCallback[workInfo.workName] = callback
       
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