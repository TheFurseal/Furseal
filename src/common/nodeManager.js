const debug = require('debug')('common:nodeManager')
class NodeManager{
    constructor(){
        this.pHardBlockList = {}
        this.pBlockList = {}
        this.pBlockList['QmUoL3udUypkWjGzap46sw3AqxnBN6496xHS3YZ8NbnsLN'] = 5
        var pa = this
        setTimeout(() => {
            var keys = Object.keys(pa.pBlockList)
            keys.forEach(element => {
                delete pa.pBlockList[element]
            });
        }, 300000);
        this.workingNodes = {}
    }

    check(id){
        if(id == null){
            return
        }
        if(this.pBlockList[id] == null || isNaN(this.pBlockList[id])){
            this.pBlockList[id] = 0
        }else{
            this.pBlockList[id]++
        }
    }

    isBlock(id){
        if(id == null){
            console.error('Empty ID')
            return true
        }
        if(this.pHardBlockList[id] != null){
            //debug(id + 'is blocked')

            return true
        }else if(this.pBlockList[id] >= 5){
            //debug(id + 'is soft blocked')
            return true
        }else{
            return false
        }
    }

    block(id){
        if(id == null){
            console.error('Empty ID')
            return
        }
        this.pBlockList[id] = 5
    }

    unblock(id){
        if(id == null){
            console.error('Empty ID')
            return
        }
        delete this.pBlockList[id]
    }

    hardBlock(id){
        if(id == null){
            console.error('Empty ID')
            return
        }
        if(this.pHardBlockList[id] == null){
            //debug('Block '+id+' hard')
            this.pHardBlockList[id] = 1
        }
    }

    hardUnBlock(id){
        if(id == null){
            console.error('Empty ID')
            return
        }
        if(this.pHardBlockList[id] != null){
            delete this.pHardBlockList[id]
        }
    }

    addWorkingNodes(id){
        if(id == null){
            return
        }
        this.workingNodes[id] = id
    }
    removeWorkingNodes(id){
        if(id == null){
            return 
        }
        delete this.workingNodes[id]
    }

    getWorkingNodesNumber(){
        var keys = Object.keys(this.workingNodes)
        return keys.length
    }
}

module.exports = NodeManager