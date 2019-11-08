const debug = require('debug')('common:downloadManager')
var gSpeed = 0

class DownloadManager{
    constructor({
        IPCManager:ipc,
        ProgressManager:pm
    }){
        this.ipc = ipc
        this.element = {}
        this.pm = pm
        var pa = this
        var date = new Date()
        this.startTime = date.valueOf()
        setInterval(() => {
            gSpeed = 0
            var keys = Object.keys(pa.element)
            for(var i=0;i<keys.length;i++){
                if(pa.element[keys[i]].deltaT  == 0){
     
                }else{
                    gSpeed+=pa.element[keys[i]].deltaD / pa.element[keys[i]].deltaT
                    pa.element[keys[i]].deltaD = 0
                    pa.element[keys[i]].deltaT = 0
                }
            }
        }, 1000);
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
            this.element[obj.fileName].deltaT = 0
            // this.element[obj.fileName].speed = 0
            this.pm.register(obj.fileName)
        }else{
            this.element[obj.fileName].deltaD += obj.recived - this.element[obj.fileName].recived
            this.element[obj.fileName].recived = obj.recived
            this.element[obj.fileName].deltaT += (obj.timeStamp - this.element[obj.fileName].timeStamp) / 1000
            this.element[obj.fileName].timeStamp = obj.timeStamp
            // this.element[obj.fileName].speed = this.element[obj.fileName].deltaD / this.element[obj.fileName].deltaT
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
        var report = {}
        report.speed = gSpeed
        return report
    }

}

module.exports = DownloadManager