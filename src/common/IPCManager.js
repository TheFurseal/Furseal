const IPC = require('node-ipc')
var crypto = require('crypto')
const debug = require('debug')('common:IPCManager')

class IPCManager{
    constructor(){
        this.clientConnected = false
        this.serverConnected = false
        this.serverHandleFuncs = []
        this.clientHandleFuncs = []
    }

    createServer({
        id:id,
        silent:silent,
        retry:retry
    }){
        if(id == null){
            console.error('Empty id for server')
            return
        }

        IPC.config.id = id

        if(silent != null){
            IPC.config.silent = silent
        }else{
            IPC.config.silent = true
        }
        if(retry != null){
            IPC.config.retry = retry
        }else{
            IPC.config.retry = 500
        }
        IPC.config.maxRetries = 100


    }

    serve(){
        var parent = this
        IPC.serve(
            function(){
                IPC.server.on("connect",function(socket){
                    parent.clientSockTmp = socket;
                    parent.clientConnected = true
        
                })
                IPC.server.on(
                    'socket.disconnected',
                    function(socket,destroyedSocketID){
                        debug('Client disconnected')
                        parent.clientConnected = false

                    }
                )
                IPC.server.on(
                    'error',
                    function(err){
                        console.log(err)
                    }
                )
                
                parent.serverHandleFuncs.forEach((element) => {
                    
                    IPC.server.on(element.event,(data,socket) => {
                       
                        //debug('server confirm message')
                        element.func(data,socket)
                    })
                })
            }
        )

        IPC.server.start()
    }

    connect(id){
        if(id == null){
            console.error('Empty id to connecting')
        }
        var parent = this
        var serverID = id
        this.serverID = id
        if(this.callbackAdded){
            IPC.connectTo(serverID)
        }else{
            IPC.connectTo(
                serverID,
                function(){
                    IPC.of[serverID].on(
                        'connect',
                        function(){
                            parent.serverConnected = true
                            debug('Connect to '+serverID)
    
                        }
                    )
                    IPC.of[serverID].on(
                        'disconnect',
                        function(){
                            if(parent.serverConnected){
                                debug('Disconnected from server '+serverID)
                            }
                            parent.serverConnected = false
                        }
                    )
                    IPC.of[serverID].on(
                        'error',
                        function(err){
                           // console.log(err)
                        }
                    )
                    
                    parent.clientHandleFuncs.forEach((element) => {
                        
                        IPC.of[serverID].on(element.event,(data,socket) => {
                            
                            //debug('client confirm message')
                            element.func(data,socket)
                        })
    
                    })
                }
            )
        }
        
        this.callbackAdded = true
    }

    createClient({
        silent:silent,
        retry:retry
    }){
        
        if(silent != null){
            IPC.config.silent = silent
        }else{
            IPC.config.silent = true
        }
        if(retry != null){
            IPC.config.retry = retry
        }else{
            IPC.config.retry = 500
        }
        IPC.config.maxRetries = 100

        this.callbackAdded = false
    }

    addServerListenner(event,callback){
        if(event == null || callback == null){
            console.error('Empty event or callback')
        }
        var tmp = {}
        tmp.event = event
        tmp.func = callback
        this.serverHandleFuncs.push(tmp)
        debug('add '+event+' handler to server')
    }

    addClientListenner(event,callback){
        if(event == null || callback == null){
            console.error('Empty event or callback')
        }
        var tmp = {}
        tmp.event = event
        tmp.func = callback
        this.clientHandleFuncs.push(tmp)
        debug('add '+event+' handler to client')
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

        if(sock != null){
            IPC.server.emit(
                sock,
                event,
                data
            )
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
        
        if(sock != null){
            IPC.of[sock].emit(
                event,
                data
            )
        }else{
            console.error('No server connection')
        }
    }

    serverDisconnect(){
        IPC.server.stop()
        this.clientSockTmp = null
    }

    clientDisconnect(){
        IPC.disconnect()
        this.serverID = null
    }

   
}

module.exports = IPCManager