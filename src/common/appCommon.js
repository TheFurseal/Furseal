
const Tool = require('./tools.js')
const fs = require('fs')
const process = require('process')
const debug = require('debug')('common:appCommon')

function getMainIntry(application){
    if(application == null){
        debug('application is empty')
        return null
    }
    
    for(var i=0;i<application.main.length;i++){
        for(var j=0;j<application.files.length;j++){
            if(application.main[i].name == application.files[j].name && application.main[i].target == application.files[j].target){
                var sp = application.files[j].target.split('-')
                debug(sp)
                if(Tool.matchOS(process.platform,sp[0]) && Tool.matchArch(process.arch,sp[1])){
                    return application.files[j]
                }else{

                }
                
            }
        }
    }
    return null
}


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
        // see if file is exist
        if(this.hadler != null){
            return
        }
        var paramTmp = this.param
        var pa = this
        var resetFunc = this.resetStatus
        var dbTmp = this.db
        var locker = false
      
        dbTmp.get(paramTmp.setName,(err,value) => {
            if(err || value == null){
                console.error(err,paramTmp.setName)
            }else{
                var tmp = value
                if(typeof(tmp) == 'string'){
                    tmp = JSON.parse(tmp)
                }
                var infoObj = tmp.applications[paramTmp.type]
                var toRun = getMainIntry(infoObj)
                if(toRun == null){
                    debug('Not found main intry')
                }else{
                    debug('Found intry ')
                    debug(toRun)
                    if(toRun.path != null && toRun.path != ''){
                        pa.hadler = setInterval(() => {
                            if(locker){
                                return
                            }
                            locker = true
                            Tool.getPIDByName(toRun.name,(pid) => {
                                if(pid > 0){
                                    resetFunc(true,pa)
                                    callback(pid)
                                    pa.pid = pid
                                }else{
                                    paramTmp.option.path = toRun.path
                                    paramTmp.option.tempPath = paramTmp.tempPath
                                    Tool.createProcess(paramTmp.option,(err,value) => {
                                        if(err){
                                            console.error(err)
                                        }else{
                                            pa.pid = value
                                            resetFunc(true,pa)
                                            debug(toRun.name,'  launched!!')
                                            if(callback != null){
                                                callback(value)
                                            }
                                        }
                                    })
                                }
                                locker = false
                            })
                        }, 15000);  
                    }else{
                        debug('app path is empty')
                    }
                }
            }
        })
            
    }

    stop(){
        var handler = this.hadler
        if(!isNaN(this.pid)){
            Tool.killProcess(this.pid)
            debug('Kill process '+this.pid)
            this.pid = -1
        }
        debug('Clear interval handler')
        clearInterval(handler)
        this.hadler = null
    }

}

module.exports = AppCommon