const debug = require('debug')('common:deviceState')

const stateType = [
    'init',
    'standby',
    'busy',
    'reporting',
    'disavaliable',
    'ready' //login
]

const stage = {
    'init':0x0,
    'moduleReady':0x1,
    'login':0x2
}

class DeviceState{
    constructor(){
        this.mainState = 'init'
        this.mainStage = stage['init']
    }

    isLogin(){
        if(this.mainStage > 1){
            return true
        }else{
            return false
        }
    }

    avaliable(){
        if(this.mainState == 'standby' || this.mainState == 'reporting'){
            return true
        }else{
            return false
        }
    }

    update(stat){
        if(stat == null || stateType.indexOf(stat) < 0){
            debug('invalid state string'+'['+stat+']')
            return
        }
        this.mainState = stat
    }

    stageUp(stageName){
        debug('Stage up to '+stageName)
        this.mainStage+=stage[stageName]
    }

    isModuleReady(){
        if(this.mainStage > 0){
            return true
        }else{
            return false
        }
    }
}

module.exports = DeviceState