const Tools = require('./tools.js')
const debug = require('debug')('common:enviromentDetector')



function matchBandWidthRequest(info){
    if(info == null){
        return true
    }
    return true
}

async function matchDiskRequest(info){
    if(info == null){
        return true
    }
    var ret = 0
    await Tools.diskAbility().then((value) => {
        ret = value
    })


    if(ret>=info.optional.disk){
        debug('match disk '+info.optional.disk + ' ------> '+ret)
        return true
    }else{
        return false
    }
}

function matchMemoryRequest(info){
    if(info == null){
        return true
    }
    var localMem = Tools.memoryAbility()
    if(info.optional.memory <= localMem){
        debug('match memory '+info.optional.memory + ' ------> '+localMem)
        return true
    }else{
        return false
    }
}

function matchCPUSpeed(info){
    if(info == null){
        return true
    }
    var localSpeed = Tools.CPUAbility()
    if(info.optional.CPUSpeed <= localSpeed){
        debug('match CPU speed '+info.optional.CPUSpeed + ' ------> '+localSpeed)
        return true
    }else{
        return false
    }
}

 async function match3rdPartyRequest(info){
    if(info == null){
        debug('empty 3rd party request input')
        return true
    }

    if(info.optional.thirdParty != null){
        
        for(var i=0;i<info.optional.thirdParty.length;i++){
            var element = info.optional.thirdParty[i]
            if(element.path != null){
                if(Tools.get3rdPartyInfoFromPath(element.path)){
                    debug('match 3rd party from path '+element.path)
                }else{
                    debug('return false')
                    return false
                }
            }else if(element.regedit != null){
                
               var retValue = Tools.get3rdPartyInfoFromRegedit(element.regedit)
               if(retValue == null){
                   return false
               }
               return true
            }else if(element.name != null){
                var result = true
                await Tools.get3rdPartyInfoFromName(element.name).then((value) => {
                    debug('match 3rd party from name '+element.name)
                    result = true
                }).catch((err) => {
                    debug('dismatch 3rd party from name '+element.regedit)
                    result = false
                })
                if(!result){
                    return result
                }
            }else if(element.env != null){
                return Tools.get3rdPartyInfoFromEnv(element.env)
            }else{
                return false
            }
        }

       
    }
    debug('3rd party check all pass')
    return true

    

}


class EnvDetector{

    constructor(){
        this.match3rdPartyRequest = match3rdPartyRequest
    }

    /**
     * info: JSON struct
     * callback(err,bool) if bool is true means passed match process or failed
     */
    
    match(info,callback){

        if(info == null){
            var err = new Error('Empty enviroment requirement')
            callback(err,false)
        }
        if(typeof(info) == 'string'){
            info = JSON.parse(info)
        }

        if(info.basic == null){
            var err = new Error('Empty basic enviroment requirement')
            callback(err,false)
            return
        }

        //match platform
        if(info.basic.platform == null){
            var err = new Error('Empty basic.platform enviroment requirement')
            callback(err,false)
            return
        }else{
            var localPlat = Tools.getPlatformInfo()
            var flag = false
            for(var i = 0;i < localPlat,info.basic.platform.length;i++){
                if(!Tools.matchOS(localPlat,info.basic.platform[i])){
                    
                }else{
                    debug('match platform '+localPlat+' ------> '+info.basic.platform)
                    flag = true
                    break
                }
            }
            if(!flag){
                var err = new Error('dismatch platform: local '+localPlat+' ----> required '+info.basic.platform)
                callback(err,false)
                return
            }
        }

        
        //match architecture
        if(info.basic.architecture == null){
            var err = new Error('Empty basic.architecture enviroment requirement')
            callback(err,false)
            return
        }else{
            var localArch = Tools.getArchInfo()
            var flag = false
            for(var i=0;i<info.basic.architecture.length;i++){
                if(!Tools.matchArch(localArch,info.basic.architecture[i])){
                   
                }else{
                    debug('match architecture '+localArch+' ------> '+info.basic.architecture)
                    flag = true
                    break
                }
            }

            if(!flag){
                var err = new Error('dismatch architecture: local '+localArch+' ----> required '+info.basic.architecture)
                callback(err,false)
                return
            }
            
        }

        //TODO
        //match GPU series
        async function run (){


            if(info.optional == null){
                debug('skip optional check')
                callback(null,true)
                return
            }
    
            //match CPU series (ability)
            if(info.optional.CPUSpeed != null){
                if(!matchCPUSpeed(info)){
                    var err = new Error('dismatch cpu speed')
                    callback(err,false)
                    return
                }
            }
    
            //match memory
            if(info.optional.memory != null){
                if(!matchMemoryRequest(info)){
                    var err = new Error('dismatch memory size')
                    callback(err,false)
                    return
                }
            }

            //match free disk
            if(info.optional.disk != null){
                await matchDiskRequest(info).then((ret) => {
                    if(!ret){
                        var err = new Error('dismatch disk size')
                        callback(err,false)
                        return
                    }
                     //match bandwide
                    if(info.optional.bandwidth != null){
                        if(!matchBandWidthRequest(info)){
                            var err = new Error('dismatch bandwidth size')
                            callback(err,false)
                            return
                        }
                    }
                }) 
                
            }
            //match 3rd party requirement
            if(info.optional.thirdParty != null){
                await match3rdPartyRequest(info).then((value) => {
                    if(!value){
                        debug('dismatch third party requirement')
                        var err = new Error('dismatch third party requirement')
                        callback(err,false)
                        return
                    }else{
                    }
                    debug('match process end')
                    callback(null,true)
                })  
            }
        }
        run()
    }
}


module.exports = EnvDetector