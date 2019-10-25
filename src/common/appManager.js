const AppCommon = require('./appCommon.js')
const DappCli = require('../cli/dappCli.js')
const DividorCli = require('../cli/dividorCli.js')
const AssimilatorCli = require('../cli/assimilatorCli.js')
const ValidatorCli = require('../cli/validatorCli.js')
const StoreCli = require('../cli/storeCli.js')
const Tools = require('./tools.js')
const debug = require('debug')('common:appManager')


class AppManager{
    constructor(
        {
            appDB:appDB,
            blockDB:blockDB,
            workDB:workDB,
            p2pNode:p2pNode,
            appRepoPath:appRepoPath,
            configure:conf,
            downloadManager:dMgr,
            gcManager:gcMrg
        }
    ){
        debug('Create AppManager')
        this.setsRegister = {}
        this.conf = conf
        this.appDB = appDB
        this.blockDB = blockDB,
        this.workDB = workDB,
        this.p2pNode = p2pNode,
        this.dividorCount = 0
        this.appRepoPath = appRepoPath
        this.downloadManager = dMgr
        this.gcManager = gcMrg
    }

    launchDividor(setName,callback){
        debug('launch dividor')
        if(this.setsRegister[setName] == null){
            this.setsRegister[setName] = {}
            console.log('No  handler found')
        }else{
            if(this.setsRegister[setName].dividor != null){
                console.log('dividor handler already exist')
                this.setsRegister[setName].dividor.start()
                return
            }else{
                console.log('No  dividor handler found')
            }
        }

        console.log('Create a new dividor cli')
        var param = {}
        param.setName = setName
        param.arg = null
        this.setsRegister[setName].dividor = new DividorCli({
            paramater:param,
            blockDB:this.blockDB,
            workDB:this.workDB,
            appDB:this.appDB,
            p2pNode:this.p2pNode,
            configure:this.conf,
            callback:callback,
            gcManager:this.gcManager
        })
        this.dividorCount++
        this.setsRegister[setName].dividor.start() 
    }

    launchValidator(setName,workInfo,callback){
        debug('launch validator')
        if(this.setsRegister[setName] == null){
            this.setsRegister[setName] = {}
        }else{
            if(this.setsRegister[setName].validator != null){
                debug('Validator request 1')
                this.setsRegister[setName].validator.start()
                this.setsRegister[setName].validator.request(workInfo) 
                return
            }else{
                debug('Validator request 2')
            }
        }

        var param = {}
        param.setName = setName
        param.arg = null
        this.setsRegister[setName].validator = new ValidatorCli({
            paramater:param,
            workInfo:workInfo,
            dbBlock:this.blockDB,
            dbApp:this.appDB,
            callback:callback
        })

        this.setsRegister[setName].validator.start()
        this.validtorCount++
        debug('Validator request 0')
        this.setsRegister[setName].validator.request(workInfo)
    }

    launchAssimilator(setName,workInfo,callback){
        debug('launch assimilator')

        if(this.setsRegister[setName] == null){
            this.setsRegister[setName] = {}
        }else{
            if(this.setsRegister[setName].assimilator != null){
                debug('assimilator request 1')
                this.setsRegister[setName].assimilator.start()
                this.setsRegister[setName].assimilator.request(workInfo,callback) 
                return
            }else{
                
            }
        }

        var param = {}
        param.setName = setName
        this.setsRegister[setName].assimilator = new AssimilatorCli({
            paramater:param,
            workInfo:workInfo,
            dbBlock:this.blockDB,
            dbApp:this.appDB,
            dbWork:this.workDB
        })
        this.setsRegister[setName].assimilator.start()
        this.assimilatorCount++
        debug('assimilator request 0')
        this.setsRegister[setName].assimilator.request(workInfo,callback)
    }

    launchDapp(setName,arg,workInfo,callback){
        debug('launch Dapp')
        if(setName == null){
            console.error(setName)
        }
        if(this.setsRegister[setName] == null){
            this.setsRegister[setName] = {}
        }else{
            if(this.setsRegister[setName].dapp != null){
                debug('Dapp request 1')
                this.setsRegister[setName].dapp.start()
                this.setsRegister[setName].dapp.request(workInfo) 
                return
            }else{
               
            }
        }

        var param = {}
        param.setName = setName
        param.arg = arg
        this.setsRegister[setName].dapp = new DappCli({
            paramater:param,
            appDB:this.appDB,
            callback:callback
        })
        this.setsRegister[setName].dapp.start()
        this.dappCount++
        debug('Dapp request 0')
        this.setsRegister[setName].dapp.request(workInfo)  
       
    }

    launchStore(){
        debug('Ready to launch store cli')
        var param = {}
        param.repoPath = this.appRepoPath
        var storeCli = new StoreCli({
            parameter:param,
            p2pNode:this.p2pNode,
            appDB:this.appDB,
            downloadManager:this.downloadManager
        })
        if(this.setsRegister['storeCli'] == null){
            this.setsRegister['storeCli'] = storeCli
        }
    }

    getAppSet(setName,callback){
        debug('Get app set')
        this.setsRegister.storeCli.getAppSet(setName,(value) => {
            //donwload
            debug(value)
            callback(value)
        })
    }

    killDividor(setName){
        if(this.setsRegister[setName] == null){
            debug('Dividor not running ')
            return
        }
        this.setsRegister[setName].dividor.stop()
    }

    killAssimilator(setName){
        if(this.setsRegister[setName] == null){
            debug('Dividor not running ')
            return
        }
        this.setsRegister[setName].assimilator.stop()
    }

    killValidator(setName){
        if(this.setsRegister[setName] == null){
            debug('Dividor not running ')
            return
        }
        this.setsRegister[setName].validator.stop()
    }

    killDapp(setName){
        if(this.setsRegister[setName] == null){
            debug('Dividor not running ')
            return
        }
        this.setsRegister[setName].dapp.stop()
    }

    killStore(setName){

    }

    launchSet(setName){

    }

    killSet(setName){

    }
}


module.exports = AppManager