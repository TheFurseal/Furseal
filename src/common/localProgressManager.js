const debug = require('debug')('common:localProgressManager')

class LocalProgressManager{
    constructor(){
        this.localProcessRegister = {}
    }

    register(name,expectTimeCost){
        if(blockName == null){
            console.error('can not register local process because process name is empty')
        }
        var date = new Date()
        this.localProcessRegister[name] = {}
        this.localProcessRegister[name].timeStart = date.valueOf()
        if(expectTimeCost != null){
            this.localProcessRegister[name].expectTimeCost = expectTimeCost
        }else{
            this.localProcessRegister[name].progress = 0
        }
    }

    update(name,progress){
        if(this.localProcessRegister[name] != null){
            this.localProcessRegister[name].progress = progress
        }
    }

    getLocalProgressByName(name){
        if(this.localProcessRegister[name] == null){
            return 1
        }
        if(this.localProcessRegister[name].expectTimeCost == null){
            return this.localProcessRegister[name].progress
        }
        var date = new Date()
        var costed = date.valueOf() - this.localProcessRegister[name].timeStart
        var ret =  costed / this.localProcessRegister[name].expectTimeCost
        if(ret > 1){
            ret = 1
        }
        if(ret == 1){
            delete this.localProcessRegister[name]
        }
        return ret
    }

    getAllLocalProgress(){
        var date = new Date()
        var keys = Object.keys(this.localProcessRegister)
        var ret = []
        for(var i = 0;i < keys.length;i++){
            var tmp = {}
            tmp.name = keys[i]
            if(this.localProcessRegister[keys[i]].expectTimeCost != null){
                tmp.progress = (date.valueOf() - this.localProcessRegister[keys[i]].timeStart) / this.localProcessRegister[keys[i]].expectTimeCost
            }else{
                tmp.progress = this.localProcessRegister[keys[i]].progress
            }
            
            if(tmp.progress > 1){
                tmp.progress = 1
            }
            ret.push(tmp)
            if( tmp.progress == 1){
                delete this.localProcessRegister[keys[i]]
            }
        }
        return ret
    }
}

module.exports = LocalProgressManager