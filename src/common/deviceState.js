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
    constructor({
        SupplyCallback:cb
    }){
        this.mainState = 'init'
        this.mainStage = stage['init']
        //free for long time (blocked for some reason)
        // in this case send a supply message to every node in peerBook to make sure 
        // nodes unblock this device hardly
        var pa = this
        setInterval(() => {
            if(pa.mainStage == 'standby' && !isNaN(pa.freeFrom)){
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
        if(this.mainStage > 1){
            return true
        }else{
            return false
        }
    }

    timeFreed(){
        var date = new Date()
        if(this.mainStage == 'standby' && !isNaN(this.freeFrom)){
            return date.valueOf() - this.freeFrom
        }else{
            return 0
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
        if(this.mainStage > 0){
            return true
        }else{
            return false
        }
    }
    
}

module.exports = DeviceState