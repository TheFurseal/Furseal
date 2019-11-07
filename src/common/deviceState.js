const debug = require('debug')('common:deviceState')

const stateType = [
    'init',
    'standby',
    'busy',
    'reporting',
    'disable',
    'enable',
    'ready' //login
]

var powerSwitch

const stage = {
    'init':0,
    'login':1,
    'moduleReady':2
}

var unlockKey

class DeviceState{
    constructor({
        Configure:conf
    }){
        this.mainStatus = 'init'
        this.mainStage = stage['init']
        this.freeFrom = NaN
        this.configure = conf
        if(conf.config.powerSharing){
            powerSwitch = 'enable'
        }else{
            powerSwitch = 'disable'
        }
    
        this.shouldDoSupply = true
        //free for long time (blocked for some reason)
        // in this case send a supply message to every node in peerBook to make sure 
        // nodes unblock this device hardly
        var pa = this
        setInterval(() => {
            if(powerSwitch == 'enable' && pa.mainStatus == 'standby' && !isNaN(pa.freeFrom)){
                var date = new Date()
                if(date.valueOf() - pa.freeFrom > 60000){
                    debug('Device may blocked by other node, send a supply message')
                    this.shouldDoSupply = true
                }else{

                }
            }
        }, 60000);
    }

    isLogin(){
        if(this.mainStage > 0){
            return true
        }else{
            return false
        }
    }

    disableSharing(){
        powerSwitch = 'disable'
        this.configure.update('powerSharing',false)
    }

    enableSharing(){
        powerSwitch = 'enable'
        this.configure.update('powerSharing',true)
    }

    timeFreed(){
        var date = new Date()
        if(this.mainStatus == 'standby' && !isNaN(this.freeFrom)){
            return date.valueOf() - this.freeFrom
        }else{
            return 0
        }
    }

    needSupply(){
        return this.shouldDoSupply
    }

    noMoreSupply(){
        this.shouldDoSupply = false
    }

    avaliable(){
        // if it was disabled by user self
        if(powerSwitch == 'disable'){
            debug("power switch disabled")
            return false
        }
        // if it was disabled by progress
        if(this.mainStatus == 'standby'){
            return true
        }else{
            debug('Not avaliable because '+this.mainStatus)
            return false
        }
    }

    update(stat,key){
        if(key == null || stat == null || stateType.indexOf(stat) < 0){
            debug('invalid state string'+'['+stat+']')
            return
        }
       
        if(stat == 'standby'){
            if(unlockKey != key && key != 'golden'){
                debug('Unlock with wrong key '+key+' and excepted '+unlockKey)
                return
            }
            var date = new Date()
            this.freeFrom = date.valueOf()
            unlockKey = null
        }else if(stat == 'busy'){
            if(unlockKey != null){
                debug('Already locked with key '+unlockKey)
                return
            }
            unlockKey = key
            this.freeFrom = NaN
        }
        this.mainStatus = stat
        debug('Device update to '+stat+' with key '+key)
    }

    stageUp(stageName){
        debug('Stage up to '+stageName)
        this.mainStage=stage[stageName]
    }

    isModuleReady(){
        if(this.mainStage > 1){
            return true
        }else{
            return false
        }
    }
    
}

module.exports = DeviceState