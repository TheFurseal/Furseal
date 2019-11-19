
const Tools = require('./tools.js')
const EnvDetector = require('./enviromentDetector.js')
const debug = require('debug')('common:decideEngine')

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
   

    // (err)
    checkEvironmentRequirement(infoInput,callback){
       
        if(infoInput == null){
            callback(new Error('empty block info'),infoInput)
            return
        }
        var infoIn = JSON.parse(JSON.stringify(infoInput))
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
               
                var sp = value.applications.dapp.main[0].target.split('-')
                if(Tools.matchOS(sp[0],platform) && Tools.matchArch(sp[1],arc)){
                    
                    callback(null,infoIn)
                    return
                }else{
                    callback(new Error('no dapp for current platform'),infoIn)
                }
            }
        })
    }
}


module.exports = DecideEngine