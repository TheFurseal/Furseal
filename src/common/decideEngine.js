
const Tools = require('./tools.js')
const EnvDetector = require('./enviromentDetector.js')
const debug = require('debug')('common:decideEngine')

function convertRequirement(appSetInfo){
    if(typeof(appSetInfo) == 'string'){
        appSetInfo = JSON.parse(appSetInfo)
    }

    var env = appSetInfo.envriment
    var ret = {}
    ret.basic = {}
    ret.basic.platform = env.os
    ret.basic.architecture = env.arc
    ret.optional = {}
    ret.optional.CPUSpeed = 6000
    ret.optional.memory = 8
    ret.optional.disk = 80
    ret.optional.bandwidth = 40
    ret.optional.thirdParty = env.thirdParty

    return ret
}

class DecideEngine{
    constructor(
       {
        DappDatabase:db,
        AppManager:appM
       }
    ){
        this.db = db
        this.cli = appM.setsRegister['storeCli']
        if(this.cli == null){
            throw new Error('can not get store cli')
        }
        this.envDetector = new EnvDetector()
    }

    // check if we have dapp, if not send false to callback else send true and dapp info to callback
    checkBlockAcceptable(info,callback){
        if(info == null){
            cli.
            callback(false)
        }
        var detector = this.envDetector
        var cliTemp = this.cli
        var setName = info.unprotected.appSet 
        this.db.get(setName,(err,value) => {
            if(err){//don't have
                //callback(false)
                debug('no appset '+ setName +' record in db')
                cliTemp.getDApp(setName,(err,info) => {
                    if(err == null){  
                        callback(true,info,true)
                    }else{
                        debug('do not have app set in store')
                        callback(false,null,false)
                    }
                    
                })

            }else{// have
                if(typeof(value) == 'string'){
                    value = JSON.parse(value)
                }

                var arc = Tools.getArchInfo()
                var platform = Tools.getPlatformInfo()
                for(var i = 0;i<value.apps.dapp.length;i++){
                    var sp = value.apps.dapp[i].target.split('-')

                    if(Tools.matchOS(sp[0],platform) && Tools.matchArch(sp[1],arc)){
                        
                        var bascInfo = convertRequirement(value)
                        detector.match3rdPartyRequest(bascInfo).then(ret => {
                            if(ret){
                                var valueTmp = value.apps.dapp[i]
                                value.apps.dapp = []
                                value.apps.dapp.push(valueTmp)
                                callback(true,value,false)
                            }else{
                                console.error('3rd Party requrement check failed')
                                callback(false,null,true)
                            }
                        })
                        return
                    }
                }
                debug('no dapp for current platform')
                callback(false,null,true)
            }
        })
    }

    // (err)
    enviromentValidation(infoInput,callback){
       
        if(infoInput == null){
            callback(new Error('empty block info'),infoInput)
            return
        }
        var infoIn = JSON.parse(JSON.stringify(infoInput))
        var detector = this.envDetector
        var cliTemp = this.cli
        var setName = infoIn.unprotected.appSet 
        this.db.get(setName,(err,value) => {
            if(err){//don't have
                cliTemp.getDApp(setName,(err,info) => {
                    if(err){  
                        callback(err,infoIn)
                    }else{
                        callback(null,infoIn)
                    }
                })
            }else{// have
                var arc = Tools.getArchInfo()
                var platform = Tools.getPlatformInfo()
                for(var i = 0;i<value.apps.dapp.length;i++){
                    var sp = value.apps.dapp[i].target.split('-')
                    if(Tools.matchOS(sp[0],platform) && Tools.matchArch(sp[1],arc)){
                        var bascInfo = convertRequirement(value)
                        detector.match3rdPartyRequest(bascInfo).then(ret => {
                            if(ret){
                                var valueTmp = value.apps.dapp[i]
                                value.apps.dapp = []
                                value.apps.dapp.push(valueTmp)
                                //enviroment check passed, preper input files
                                
                                callback(null,infoIn)
                            }else{
                                callback(new Error('3rd Party requrement check failed'),infoIn)
                            }
                        })
                        return
                    }
                }
                callback(new Error('no dapp for current platform'),infoIn)
            }
        })
    }
}


module.exports = DecideEngine