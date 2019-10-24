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
            configure:conf
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
    }

    launchDividor(setName,callback){
        debug('launch dividor')

        if(this.setsRegister[setName] == null){
            this.setsRegister[setName] = {}
        }else{
            if(this.setsRegister[setName].dividor != null){

            }else{
            }
        }

        var param = {}
        param.setName = setName
        param.arg = null
        var dividorCli = new DividorCli({
            paramater:param,
            blockDB:this.blockDB,
            workDB:this.workDB,
            appDB:this.appDB,
            p2pNode:this.p2pNode,
            configure:this.conf,
            callback:callback
        })
        this.setsRegister[setName].dividor = dividorCli
        this.dividorCount++
       
        
    }

    launchValidator(setName,workInfo,callback){
        debug('launch validator')
        if(this.setsRegister[setName] == null){
            this.setsRegister[setName] = {}
        }else{
            if(this.setsRegister[setName].validator != null){
                debug('Validator request 1')
                this.setsRegister[setName].validator.request(workInfo) 
                return
            }else{
                debug('Validator request 2')
            }
        }

        var param = {}
        param.setName = setName
        param.arg = null
        var validatorCli = new ValidatorCli({
            paramater:param,
            workInfo:workInfo,
            dbBlock:this.blockDB,
            dbApp:this.appDB,
            callback:callback
        })
       
        this.setsRegister[setName].validator = validatorCli
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
                this.setsRegister[setName].assimilator.request(workInfo,callback) 
                return
            }else{
                
            }
        }

        var param = {}
        param.setName = setName
        var assimilatorCli = new AssimilatorCli({
            paramater:param,
            workInfo:workInfo,
            dbBlock:this.blockDB,
            dbApp:this.appDB,
            dbWork:this.workDB
        })
       
        this.setsRegister[setName].assimilator = assimilatorCli
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
                this.setsRegister[setName].dapp.request(workInfo) 
                return
            }else{
               
            }
        }

        var param = {}
        param.setName = setName
        param.arg = arg
        var dappCli = new DappCli({
            paramater:param,
            appDB:this.appDB,
            callback:callback
        })
       
        this.setsRegister[setName].dapp = dappCli
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
            appDB:this.appDB
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
        var pid = this.setsRegister[setName].dividor.pid

        if(!isNaN(pid)){
            Tools.killProcess(pid)
            debug('Kill dividor process '+pid)
            this.setsRegister[setName].dividor = null
        }else{
            debug('Not a pid number: '+pid)
        }
        
       
    }

    killAssimilator(setName){
        if(this.setsRegister[setName] == null){
            debug('Assimilator not running ')
            return
        }
        this.setsRegister[setName].assimilator.stop()
        var pid = this.setsRegister[setName].assimilator.pid

        if(!isNaN(pid)){
            Tools.killProcess(pid)
            debug('Kill assimilator process '+pid)
            this.setsRegister[setName].assimilator = null
        }else{
            debug('Not a pid number: '+pid)
        }
    }

    killValidator(setName){
        if(this.setsRegister[setName] == null){
            debug('Validator not running ')
            return
        }
        this.setsRegister[setName].validator.stop()
        var pid = this.setsRegister[setName].validator.pid

        if(!isNaN(pid)){
            Tools.killProcess(pid)
            debug('Kill validator process '+pid)
            this.setsRegister[setName].validator = null
        }else{
            debug('Not a pid number: '+pid)
        }
    }

    killDapp(setName){
        if(this.setsRegister[setName] == null){
            debug('dapp not running ')
            return
        }
        this.setsRegister[setName].dapp.stop()
        var pid = this.setsRegister[setName].dapp.pid

        if(!isNaN(pid)){
            Tools.killProcess(pid)
            debug('Kill dapp process '+pid)
            this.setsRegister[setName].dapp = null
        }else{
            debug('Not a pid number: '+pid)
        }
    }

    killStore(setName){

    }

    launchSet(setName){

    }

    killSet(setName){

    }
}


module.exports = AppManager