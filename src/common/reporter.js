const debug = require('debug')('common:reporter')
class Reporter{
    constructor(){
        this.reportKeeper = {}
    }


    check(blockName){
        if(this.reportKeeper[blockName] == null){
            this.reportKeeper[blockName] = 1
            return true
        }else if(this.reportKeeper[blockName] < 5){
            this.reportKeeper[blockName]++
            return true
        }else{
            debug('Over retry')
            return false
        }
    }
}

module.exports = Reporter