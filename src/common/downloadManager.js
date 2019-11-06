const debug = require('debug')('common:downloadManager')

class DownloadManager{
    constructor({
        IPCManager:ipc,
        ProgressManager:pm
    }){
        this.ipc = ipc
        this.element = {}
        this.pm = pm
    }

    update(obj){
        if(obj == null){
            return
        }
        debug(JSON.stringify(obj))
        if(this.element[obj.fileName] == null){
            this.element[obj.fileName] = {}
            this.element[obj.fileName].recived = obj.recived
            this.element[obj.fileName].timeStamp = obj.timeStamp
            this.element[obj.fileName].deltaD = 0
            this.element[obj.fileName].deltaT = 1
            this.element[obj.fileName].speed = 0
            this.pm.register(obj.fileName)
        }else{
            var deltaTtmp = (obj.timeStamp - this.element[obj.fileName].timeStamp)/1000
            if(deltaTtmp == 0){
                return
            }
            this.element[obj.fileName].deltaD = obj.recived - this.element[obj.fileName].recived
            this.element[obj.fileName].recived = obj.recived
            this.element[obj.fileName].deltaT = deltaTtmp
            this.element[obj.fileName].timeStamp = obj.timeStamp
            this.element[obj.fileName].speed = this.element[obj.fileName].deltaD / this.element[obj.fileName].deltaT
            this.pm.update(obj.fileName,obj.recived/obj.total)
            if(obj.recived == obj.total){
                debug('Delete element '+obj.fileName)
                delete this.element[obj.fileName]
            }else{ 
            }   
        }
       
    }

    getGlobalReport(){
        //report global speed
        var keys = Object.keys(this.element)
        var pa = this
        var gSpeed = 0
        for(var i=0;i<keys.length;i++){
            gSpeed+=pa.element[keys[i]].speed
        }
        var report = {}
        report.speed = gSpeed
        return report
    }

}

module.exports = DownloadManager