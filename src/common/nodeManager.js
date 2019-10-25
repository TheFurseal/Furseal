const debug = require('debug')('common:nodeManager')
class NodeManager{
    constructor(){
        this.pHardBlockList = []
        this.pBlockList = {}
        this.pBlockList['QmUoL3udUypkWjGzap46sw3AqxnBN6496xHS3YZ8NbnsLN'] = 5
        var pa = this
        setTimeout(() => {
            var keys = Object.keys(pa.pBlockList)
            keys.forEach(element => {
                pa.pBlockList[element]--
                if(pa.pBlockList[element] <= 0){
                    delete pa.pBlockList[element]
                }
            });
        }, 60000);
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
        if(this.pHardBlockList.indexOf(id) >= 0){
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
        if(this.pHardBlockList.indexOf(id) < 0){
            //debug('Block '+id+' hard')
            this.pHardBlockList.push(id)
        }
    }

    hardUnBlock(id){
        if(id == null){
            console.error('Empty ID')
            return
        }
        var index = this.pHardBlockList.indexOf(id)
        if(index >= 0){
            //debug('Unblock '+id+' hard')
            this.pHardBlockList.splice(index,1)
        }
    }

}

module.exports = NodeManager