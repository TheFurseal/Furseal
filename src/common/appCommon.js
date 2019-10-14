
const Tool = require('./tools.js')
const fs = require('fs')
const Http = require('./httpClient.js')
const debug = require('debug')('common:appCommon')


class AppCommon{
    constructor(param,db){

        this.param = param
        this.status = false
        if(param == null || param.id == null || param.type == null || db == null){
            var err = Error('Bad paramater')
            console.error(err)
            return
        }

        if(param.option == null){
            param.option = {}
        }
       
        this.db = db 
        if(param.tempPath != null && !fs.existsSync(Tool.fixPath(param.tempPath))){
            if(!fs.existsSync(Tool.fixPath(param.tempPath))){
                fs.mkdirSync(Tool.fixPath(param.tempPath),{ recursive: true })
            }
        }

    }

    resetStatus(value,pa){
        if(pa == null){
            pa = this
        }
        pa.status = value
    }

    isInitDone(){
        return this.status
    }

    

    start(callback){
        debug('step 1',this.param)
        // see if file is exist
        var paramTmp = this.param
        var pa = this
        var resetFunc = this.resetStatus
        var dbTmp = this.db


         this.hadler = setInterval(() => {

            dbTmp.get(paramTmp.setName,(err,value) => {
               
                if(err || value == null){
                    console.error(err,paramTmp.setName)
                }else{
                    var tmp = value
                    if(typeof(tmp) == 'string'){
                        tmp = JSON.parse(tmp)
                    }
                    var infoObj = tmp.apps[paramTmp.type]
                    if(paramTmp.type == 'dapp'){
                        infoObj = infoObj[0]
                    }
                    if(infoObj.path != null && infoObj.path != ''){
                     
                        Tool.getPIDByName(infoObj.name,(pid) => {
                            if(pid > 0){
                                resetFunc(true,pa)
                                callback(pid)
                                // if(callback != null){
                                //     callback(pid)
                                // }
                                //debug(infoObj.name,'  already launched!!')
                            }else{
                                paramTmp.option.path = infoObj.path
                                paramTmp.option.tempPath = paramTmp.tempPath
                                debug(paramTmp)
                                Tool.createProcess(paramTmp.option,(err,value) => {
                                    if(err){
                                        console.error(err)
                                    }else{
                                        resetFunc(true,pa)
                                        debug(infoObj.name,'  launched!!')
                                        if(callback != null){
                                            callback(value)
                                        }
                                    }
                                })
                            }
                        })
                    }else{
                        debug('app path is empty')
                        debug(paramTmp,tmp)
                    }
                    
                }
               
            })
             
         }, 10000);        
        
    }

    stop(){
        var handler = this.hadler
        clearInterval(handler)
    }

}

module.exports = AppCommon