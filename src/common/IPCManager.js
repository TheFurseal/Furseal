const debug = require('debug')('common:IPCManager')
const IPC = require('node-ipc')

class IPCManager{
    constructor(){
        this.clientConnected = false
        this.serverConnected = false
        this.serverHandleFuncs = []
        this.clientHandleFuncs = []
        this.IPC = IPC
    }

    createServer({
        id:id,
        silent:silent,
        retry:retry
    }){
        var parent = this
        if(id == null){
            console.error('Empty id for server')
            return
        }

        parent.IPC.config.id = id

        if(silent != null){
            parent.IPC.config.silent = silent
        }else{
            parent.IPC.config.silent = true
        }
        if(retry != null){
            parent.IPC.config.retry = retry
        }else{
            parent.IPC.config.retry = 500
        }
        parent.IPC.config.maxRetries = 100
    }

    serve(){
        var parent = this
        parent.IPC.serve(function(){
            parent.IPC.server.on("connect",function(socket){
                parent.clientSockTmp = socket;
                parent.clientConnected = true
    
            })
            parent.IPC.server.on(
                'socket.disconnected',
                function(socket,destroyedSocketID){
                    debug('Client disconnected')
                    parent.clientConnected = false
                    parent.clientSockTmp = null
    
                }
            )
            parent.IPC.server.on(
                'error',
                function(err){
                    console.log(err)
                }
            )
            parent.serverHandleFuncs.forEach(elem => {
                parent.IPC.server.on(
                    elem.event,
                    elem.callback
                )
            })
        })
        parent.IPC.server.start()
    }

    connect(id){
        if(id == null){
            console.error('Empty id to connecting')
        }
        this.serverID = id
        var parent = this
        parent.IPC.connectTo(id,function(){

            parent.IPC.of[parent.serverID].on('connect',function(){
                parent.serverConnected = true
                debug('Connect to '+parent.serverID)
            })
            parent.IPC.of[parent.serverID].on('disconnect',function(){
                if(parent.serverConnected){
                    debug('Disconnected from server '+parent.serverID)
                }
                parent.serverConnected = false
            })
            parent.IPC.of[parent.serverID].on('err',function(err){
                console.log(err)
            })
            parent.clientHandleFuncs.forEach(element => {
                parent.IPC.of[parent.serverID].on(element.event,element.callback)
            });
        })
       
    }

    createClient({
        silent:silent,
        retry:retry
    }){
        var parent = this
        if(silent != null){
            parent.IPC.config.silent = silent
        }else{
            parent.IPC.config.silent = true
        }
        if(retry != null){
            parent.IPC.config.retry = retry
        }else{
            parent.IPC.config.retry = 500
        }
        parent.IPC.config.maxRetries = 100
    }

    addServerListenner(event,callback){
        if(event == null || callback == null){
            console.error('Empty event or callback')
        }
        var parent = this
        var tmp = {}
        tmp.event = event
        tmp.callback = callback
        parent.serverHandleFuncs.push(tmp)
    }

    addClientListenner(event,callback){
        if(event == null || callback == null){
            console.error('Empty event or callback')
        }
        var parent = this
        var tmp = {}
        tmp.event = event
        tmp.callback = callback
        parent.clientHandleFuncs.push(tmp)
    }

    serverEmit(event,data,sock){
        if(event == null){
            console.error('empty event')
            return
        }
        if(data == null){
            console.error('empty data')
            return
        }
        if(sock == null){
            sock = this.clientSockTmp
        }
        var parent = this
        if(sock != null){
            parent.IPC.server.emit(
                sock,
                event,
                data
            )
        }else{
            console.error('No client connection')
        }
       
    }

    clientEmit(event,data,sock){
        if(event == null){
            console.error('empty event')
            return
        }
        if(data == null){
            console.error('empty data')
            return
        }
        if(sock == null){
            sock = this.serverID
        }
        var parent = this
        if(sock != null){
            parent.IPC.of[sock].emit(
                event,
                data
            )
        }else{
            console.error('No server connection')
        }
    
       
    }

    serverDisconnect(){
        this.IPC.server.stop()
    }

    clientDisconnect(){
        this.IPC.disconnect(this.serverID)
    }
}

module.exports = IPCManager