class DownloadManager{
    constructor({
        IPCManager:ipc
    }){
        this.ipc = ipc
        this.element = {}
    }

    update(obj){
        if(obj == null){
            return
        }
        if(this.element[obj.fileName] == null){
            this.element[obj.fileName] = {}
            this.element[obj.fileName].deltaD = obj.recived
            this.element[obj.fileName].deltaT = 0
        }else{
            this.element[obj.fileName].deltaD = obj.recived - this.element[obj.fileName].deltaD
            var date = new Date()
            this.element[obj.fileName].deltaT = date.valueOf() - obj.timeStamp
            this.element[obj.fileName].speed = this.element[obj.fileName].deltaD / (this.element[obj.fileName].deltaT/1000)


            //report global speed

            var keys = Object.keys(this.element)
            var pa = this
            var gSpeed = 0
            keys.forEach(key => {
                gSpeed+=pa.element[key]
            })

            var report = {}
            report.speed = gSpeed
            if(obj.recived == obj.total){
                delete this.element[obj.fileName]
            }else{ 
            }
            
            this.ipc.serverEmit('transferSatus',report)
            
        }
       
    }

}

module.exports = DownloadManager