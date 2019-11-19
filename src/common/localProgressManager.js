const debug = require('debug')('common:localProgressManager')

class LocalProgressManager{
    constructor(){
        this.localProcessRegister = {}
    }

    register(name,expectTimeCost){
        if(name == null){
            console.error('can not register local process because process name is empty')
            return
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
        if(name == null || progress == null){
            return
        }
        if(this.localProcessRegister[name] != null){
            if(this.localProcessRegister[name].expectTimeCost != null){
                delete this.localProcessRegister[name].expectTimeCost
            }
            this.localProcessRegister[name].progress = progress
        }else{
            this.localProcessRegister[name] = {}
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
                var cost = (date.valueOf() - this.localProcessRegister[keys[i]].timeStart)
                var expectTmp = (this.localProcessRegister[keys[i]].expectTimeCost)
                if(cost >=  expectTmp){
                    this.localProcessRegister[keys[i]].expectTimeCost = null
                    this.localProcessRegister[keys[i]].progress = 0.9999
                    tmp.progress = 0.9999
                    ret.push(tmp)
                    return ret
                }
                tmp.progress = cost / expectTmp
            }else{
                tmp.progress = this.localProcessRegister[keys[i]].progress
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