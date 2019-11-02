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

const stage = {
    'init':0,
    'login':1,
    'moduleReady':2
}

class DeviceState{
    constructor({
        SupplyCallback:cb,
        Configure:conf
    }){
        this.mainStatus = 'disable'
        this.mainStage = stage['init']
        this.freeFrom = NaN
        this.configure = conf
        if(conf.config.powerSharing){
            this.mainStatus = 'enable'
        }else{
            this.mainStatus = 'disable'
        }
        //free for long time (blocked for some reason)
        // in this case send a supply message to every node in peerBook to make sure 
        // nodes unblock this device hardly
        var pa = this
        setInterval(() => {
            if(pa.mainStatus == 'standby' && !isNaN(pa.freeFrom)){
                var date = new Date()
                if(date.valueOf() - pa.freeFrom > 60000){
                    debug('Device may blocked by other node, send a supply message')
                    cb()
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
        this.mainStatus = 'disable'
        this.configure.update('powerSharing',false)
    }

    enableSharing(){
        this.mainStatus = 'enable'
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

    avaliable(){
        // if it was disabled by user self
        if(this.mainStatus == 'disable'){
            return false
        }
        // if it was disabled by progress
        if(this.mainStatus == 'standby' || this.mainStatus == 'reporting'){
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
        this.mainStatus = stat
        if(stat == 'standby'){
            var date = new Date()
            this.freeFrom = date.valueOf()
        }else if(stat == 'busy'){
            this.freeFrom = NaN
        }
        debug('Device update to '+stat)
    }

    stageUp(stageName){
        debug('Stage up to '+stageName)
        this.mainStage+=stage[stageName]
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