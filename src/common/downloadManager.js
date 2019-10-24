class DownloadManager{
    constructor({
        IPCManager:ipc
    }){
        this.ipc = ipc
    }

    update(obj){
        if(obj == null){
            return
        }
        this.ipc.serverEmit('transferSatus',obj)
    }

}

module.exports = DownloadManager