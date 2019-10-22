const client = require('./src/common/httpClient.js');
const ProgressManager = require('./src/common/progressManager.js')
const DBManager = require('./src/common/db.js')
const P2PBundle = require('./src/p2p/bundle.js')
const pull = require('pull-stream')
const Pushable = require('pull-pushable')
const Configure = require('./src/common/config.js')
const cryptoOrigin = require('crypto')
const AppManager = require('./src/common/appManager.js')
const IPCManager = require('./src/common/IPCManager.js')
const DecideEngine = require('./src/common/decideEngine.js')
const base58 = require('bs58')
const GCManager = require('./src/common/GCManager.js')
const PeerID = require('peer-id')
const debug = require('debug')('Furseal:core')
const fs = require('fs')
const Tools = require('./src/common/tools.js')
const process = require('process')
const EventsManager = require('./src/common/eventsManager.js')
const DeviceState = require('./src/common/deviceState.js')

// data base handlers
var dbW     //work
var dbB     //block
var dbA     //application sets
var dbG     //gc

//device state
var devStat

//event Manager
var eventManager

//p2p node handler
var p2pNode

// application manager
var appManager

//gc manager
var gcManager

var decideEngine

//work indexs
var wIndexes = []

//block indexs
var bIndexes = []

//blocked peers
var pBlocked = ['QmUoL3udUypkWjGzap46sw3AqxnBN6496xHS3YZ8NbnsLN']

//extranal configure
var configure

var inputFileTmp
var outputFileTmp
var resultFileTmp
var appRepository

//server infomations
var urlBase = 'peer1.cotnetwork.com'
var optAuth = {}
optAuth.port = 7333
optAuth.hostname = urlBase
optAuth.path = '/dealRequest'
optAuth.method = 'POST'

const httpClinet = new client()
var ipcManager = new IPCManager()

function removeElement(array, elem) {
    if(array == null){
        console.error('Arrary is empty')
        return
    }
    if(elem == null){
        console.error('Element is empty')
        return
    }
    var index = array.indexOf(elem);
    while(index >= 0){
        array.splice(index, 1)
        index = array.indexOf(elem)
    }
}

class Furseal{
    constructor(homePath){
        this.homePath = homePath
        // init data directories
        inputFileTmp = homePath+'/inputs'
        outputFileTmp = homePath+'/outputs'
        resultFileTmp = homePath+'/results'
        appRepository = homePath+'/applicationRepository'
        fs.exists(Tools.fixPath(inputFileTmp),(exists) => {
            if(!exists){
                fs.mkdirSync(Tools.fixPath(inputFileTmp),'0755')
            }
        })
        fs.exists(Tools.fixPath(outputFileTmp),(exists) => {
            if(!exists){
                fs.mkdirSync(Tools.fixPath(outputFileTmp),'0755')
            }
        })
        fs.exists(Tools.fixPath(resultFileTmp),(exists) => {
            if(!exists){
                fs.mkdirSync(Tools.fixPath(resultFileTmp),'0755')
            }
        })
        fs.exists(Tools.fixPath(appRepository),(exists) => {
            if(!exists){
                fs.mkdirSync(Tools.fixPath(appRepository),'0755')
            }
        })
        // init data bases
        dbW = new DBManager(homePath+'/data/work')
        dbB = new DBManager(homePath+'/data/block')
        dbA = new DBManager(homePath+'/data/appData')
        dbG = new DBManager(homePath+'/data/gc')
        configure = new Configure(homePath)
        devStat = new DeviceState()
        eventManager = new EventsManager()
        Tools.setEnv('COT_DATA_PATH',homePath)


        // tool function 
        function globalGC(workName){
            gcManager.clearByEvent(workName+'_close')
            dbB.getAllValue((value) => {
                var slaves = []
                for(var i=0;i<value.length;i++){
                    var tmp = value[i]
                    if(tmp.workName == workName && tmp.unprotected.slave != null){
                        if(slaves.indexOf(tmp.unprotected.slave) < 0){
                            slaves.push(tmp.unprotected.slave)
                        }
                    }else{
                        
                    }
                }
                slaves.forEach((element) => {
                    var pID = PeerID.createFromB58String(element)
                    p2pNode.libp2p.dialProtocol(pID,'/cot/workoption/1.0.0',(protocol,conn) =>{
                        var p = Pushable()
                        pull(p,conn)
                        var message = {}
                        message.workName = workName
                        message.type = ['gc','stop']
                        message.event = 'close'
                        p.push(JSON.stringify(message))
                        p.end()
                        debug('send on gc command')
                    })
                })
            })
        }

        //init ipc 
        ipcManager.createServer({
            id:'nodeServer'
        })
    
        ipcManager.addServerListenner('login',(data,socket) => {
            var obj = data
            if(typeof(obj) == 'string'){
                obj = JSON.parse(obj)
            }
            if(obj.status == 'OK'){
                mainPage();
            }
        })

        ipcManager.addServerListenner('mainUpdate',(data,socket) => {
            dbW.getAll(function(data){
                var dataWrap = {};
                dataWrap.workList = data;
                
                dataWrap.nodeNumber = '50';
                dataWrap.taskNumber = '50000';
                dataWrap.avgTime = '180';
                dataWrap.balanceCNC = '12,000';
                dataWrap.balanceRNB = '1.2';
                ipcManager.serverEmit('mainUpdate',dataWrap)
            })
        })

        ipcManager.addServerListenner('releaseSet',(data,socket) => {
            var obj = data
            if(typeof(obj) == 'string'){
                obj = JSON.parse(obj)
            }
            obj.repoPath = appRepository
            appManager.setsRegister.storeCli.upload(obj)
        })

        ipcManager.addServerListenner('getAllSet',(data,socket) => {
            
            appManager.setsRegister.storeCli.getAppList((data2) => {
            
                ipcManager.serverEmit('retAllSet',data2)
            })
        })

        ipcManager.addServerListenner('updateBlockStatusReq',(data,socket) => {
            
            dbB.getAll((data2) => {
                var infos = []
                for(var i=0;i<data2.length;i++){
                
                    var tmp;
                    if(typeof(data2[i].value) == 'string'){
                        tmp = JSON.parse(data2[i].value)   
                    }else{
                        tmp = data2[i].value
                    }
                
                    if(tmp.workName == data){

                        var blockStatus = {}
                        blockStatus.workName = tmp.workName
                        blockStatus.index = tmp.unprotected.block.index
                        blockStatus.status = tmp.unprotected.status
                        blockStatus.startTime = tmp.unprotected.info.startTime
                        blockStatus.timeCost = tmp.unprotected.info.timeCost
                        infos.push(blockStatus)
                    
                    }
                }

                if(infos.length){
                
                    ipcManager.serverEmit('updateBlockStatus',infos)

                }
                
            })
        
        })

        ipcManager.addServerListenner('resendBlock',(data,socket) => {
        
            dbB.get(data,(err,value) => {
                if(err){
                    console.error(err)
                }else{
                    if(typeof(value) == 'string'){
                        value = JSON.parse(value)
                    }
                    

                    var blockDim = value.unprotected.block.indexs;
                    var indexs = blockDim.split('_');
                    var total = value.unprotected.block.number
                    
                    var blockIndex = value.unprotected.block.index;
                    var index = blockIndex.split('_');
                    if(index.length < 2){
                        console.error('bad block index');
                    }
                    
                    if(value.unprotected.status == 'processing'){
                        dbW.get(value.workName,(err,value2) => {
                            if(err){
                                console.error('ERROR: ',err);
                            }
                            var valueObj;
                            if(typeof(value2) == 'string'){
                                valueObj = JSON.parse(value2);
                            }else{
                                valueObj = value2;
                            }
                        
                            var pm = new ProgressManager(parseInt(indexs[0]),total,valueObj.unprotected.progress);
                        
                            pm.updateProgressWithIndex(parseInt(index[1]),parseInt(index[0]),false);
                        
                            valueObj.unprotected.info.progress = pm.getProgress();
                            valueObj.unprotected.progress = pm.mProgress;
                            dbW.put(valueObj.workName,valueObj,(err) => {
                                if(err){
                                    console.error('ERROR: ',err);
                                }
                            })
                        })

                        value.unprotected.status = 'init'
                        var date = new Date()
                        value.unprotected.info.startTime = date.valueOf()
                        dbB.put(data,value,(err) => {
                            if(err){
                                console.error(err)
                            }
                        })

                    }else{
                        debug('Can not resend block '+value.unprotected.blockName+' with '+value.unprotected.status)
                    }

                }
            })

        
        })

        ipcManager.addServerListenner('getBlockInfo',(data,socket) => {
            dbB.get(data,(err,value) => {
                if(err){
                    //console.error(err)
                }else{
                    ipcManager.serverEmit('gotBlockInfo',value)
                }
            })
        })

        ipcManager.addServerListenner('deleteTask',(data,socket) => {
            debug('deleteTask envet emited......')
            globalGC(data)
            dbW.del(data,(err) => {
                if(err){
                    console.error(err);
                }
            })

            dbB.getAllValue((data2) => {
                for(var i=0;i<data2.length;i++){
                    var tmp = data2[i];
                    if(tmp.workName == data){
                    
                        dbB.del(tmp.unprotected.blockName,(err) => {
                            if(err){
                                console.error(err);
                            }
                        })
                    }
                }
            })
        })

        ipcManager.addServerListenner('resetDividorStatus',(data,socket) => {
            if(typeof(data) == 'string'){
                data = JSON.parse(data)
            }
            dbA.get(data.setName,(err,value) => {
                if(err){
                    console.error(err)
                    return
                }else{
                    if(typeof(value) == 'string'){
                        value = JSON.parse(value)
                    }
                    //reset db
                    value.status = data.status
                    dbA.put(value.setName,value,(err) => {
                        if(err){
                            console.error(err)
                        }
                    })
                    //kill process or launch process
                    if(data.status == 'active'){
                        appManager.launchDividor(value.setName)
                    }else{
                        appManager.killDividor(value.setName)
                    }

                }
            })
        })

        ipcManager.addServerListenner('updateActiveDividor',(data,socket) => {
            debug('Do update active dividors')
            dbA.getAllValue((value) => {
                var retTmp = []
                for(var i=0;i<value.length;i++){
                    debug(value[i])
                    var ret = {}
                    var element = value[i]
                    if(element == null || element.apps == null || element.apps.dividor == null){
                        return
                    }
                    ret.setName = element.setName
                    ret.dividorName = element.apps.dividor.name
                    ret.status = element.status
                    retTmp.push(ret)
                }
                debug(retTmp)
                ipcManager.serverEmit('updateActiveDividor',retTmp)
            
            })
        })

        ipcManager.addServerListenner('getAppSet',(data,socket) => {
            appManager.getAppSet(data,(value) => {
                        
                dbA.getAll((value2) => {
                    
                    var retTmp = []
                    value2.forEach(element => {
                        var obj
                        if(typeof(element) == 'string'){
                            obj = JSON.parse(element)
                        }else{
                            obj = element
                        }
                        
                        var ret = {}
                        var vObj = JSON.parse(obj.value)
                    
                        if(vObj.apps.dividor == null){
                            return
                        }
                        ret.setName = vObj.setName
                        ret.dividorName = vObj.apps.dividor.name
                        ret.status = 'active'
                        retTmp.push(ret)
                    })
                    ipcManager.serverEmit('updateActiveDividor',retTmp)
                })

            })
        })

        ipcManager.addServerListenner('resetDividorStatus',(data,socket) => {
            
        })

        ipcManager.serve()
    }

    async init(){
        if(p2pNode == null){
            p2pNode = await P2PBundle.createP2PNode(this.homePath)
            debug('P2P node created')
            appManager = new AppManager({
                appDB:dbA,
                blockDB:dbB,
                workDB:dbW,
                p2pNode:p2pNode,
                appRepoPath:appRepository,
                configure:configure
            })
    
            appManager.launchStore()
    
            decideEngine = new DecideEngine({
                DappDatabase:dbA,
                AppManager:appManager
            })
    
            gcManager = new GCManager({
                GCRecordDB:dbG
            })
          
            devStat.stageUp('moduleReady')
        }
        debug('Watting login ...')
        if(!devStat.isLogin()){
            setTimeout(() => {
                this.init()
            }, 1000)
            return
        }
        debug('Device login successfully!')
        //REST block status and load indexes
        dbW.getAllValue((data) => {
            for(var i=0; i<data.length; i++){
                var element = data[i]
                if(element.unprotected.status == 'init'){
                    wIndexes.push(element.workName)
                    element.unprotected.status = 'processing'
                    dbW.put(element.workName,element)
                }else if(element.unprotected.status == 'processing'){
                    wIndexes.push(element.workName)
                }else{

                }
            }
            dbB.getAllValue((data2) => {
                data2.forEach(element => {
                    debug(element)
                    if(element.unprotected.status == 'init'){
                        bIndexes.push(element)
                        element.unprotected.status = 'processing'
                    }else if(element.unprotected.status == 'preDone'){
                        eventManager.emit('validateRequest',element)
                    }else if(element.unprotected.status == 'validating'){
                        eventManager.emit('validateRequest',element)
                    }else{

                    }
                });
            })
        })

        eventManager.registEvent('startAssimilate',(data) => {
            dbW.get(data.workName,(err,value) => {
                if(err){
                    console.error(err)
                }else{
                    if(value.unprotected.info.progress == 1){
                        appManager.launchAssimilator(value.unprotected.appSet,value,(err,res) => {
                            if(err){
                                console.error(err)
                            }else{
                                value.unprotected.status = 'finish'
                                var notif = {
                                    title: 'work complated',
                                    body: element.workName+' was complated'
                                }
                                ipcManager.serverEmit('notification',notif)
                                globalGC(value.workName)
                                dbW.put(value.workName,element,(err) => {
                                    if(err){
                                        console.error(err)
                                    }
                                })
                            }
                        })
                    }
                }
            })
        })

        eventManager.registEvent('finishCompute',(data) => {
            devStat.update('reporting')
            debug('Report result to owner '+data.unprotected.owner)
            var pID = PeerID.createFromB58String(data.unprotected.owner)
            p2pNode.libp2p.dialProtocol(pID,'/cot/workreport/1.0.0',(err,conn) => {
                if(err){
                    console.error(err)
                }else{
                    var p = Pushable()
                    pull(p,conn)
                    p.push(JSON.stringify(data))
                    devStat.update('standby')
                    p.end()
                }
            })
        })

        eventManager.registEvent('reportIn',(data) => {
            
            dbB.get(data.unprotected.blockName,(err,value) => {
                if(err){

                }else{
                    var date = new Date()
                    data.unprotected.info.timeCost = date.valueOf() - value.unprotected.info.startTime
                    value.unprotected.info.timeCost = data.unprotected.info.timeCost
                    value.unprotected.status = 'preDone'
                    dbB.put(data.unprotected.blockName,value,(err) => {
                        if(err){
                            console.error(err)
                        }
                    })
                    eventManager.emit('startValidate',data)
                }
            })
        })

        eventManager.registEvent('startValidate',(data) => {
            //resolve result first
            optAuth.path = '/resolveResult'
            optAuth.method = 'POST'
            var postPair = {};
            postPair.blockName = data.unprotected.blockName;
            postPair.workName = data.workName;
            postPair.resolveKey = configure.decrypto(data.resolveKey)
            httpClinet.access(JSON.stringify(postPair),optAuth,function(res){
                if(typeof(res) == 'string'){
                    res = JSON.parse(res);
                }
                if(res.error){
                    console.error('resolveResult',res);
                }else{
                    var keyBack = base58.decode(res.key);
                        keyBack = keyBack.toString();
                    var dataBuffer = base58.decode(data.protected);
                    var protectedTmp =  Tools.publicDecrypt(keyBack,dataBuffer)
                    protectedTmp = protectedTmp.toString()
                    debug('reported result:\n',postPair.blockName);
                    //update work progress
                    data.protected = JSON.parse(protectedTmp)
                    var infos = []
                    var infoTmp = {}
                    infoTmp.workName = data.workName
                    infoTmp.index = data.unprotected.block.index
                    infoTmp.startTime = data.unprotected.info.startTime
                    infoTmp.timeCost = data.unprotected.info.timeCost
                    infoTmp.status = 'preDone'
                    infos.push(infoTmp)
                    ipcManager.serverEmit('updateBlockStatus',infos)
                    //updage db
                    dbB.get(data.unprotected.blockName,(err,val) => {
                        if(err){
                            console.error(err)
                        }else{
                            val.unprotected.status = 'validating'
                            dbB.put(val.unprotected.blockName,val,(err) => {
                                if(err){
                                    console.error(err)
                                }
                            })
                        }
                    })
                    data.unprotected.status = 'validating'
                    //download result files
                    p2pNode.get(data.protected.outputFiles[0].hash,(err,files) => {
                        if(err){
                            console.error(err)
                        }else{
                            var targetPath = resultFileTmp+'/'+data.protected.outputFiles[0].fileName
                            data.protected.outputFiles[0].path = targetPath
                            var inBuffer = Tools.decompressionBuffer(files[0].content)
                            fs.writeFile(targetPath, inBuffer, (err) => {
                                if(err){
                                    console.error(err)
                                }else{
                                    debug('Download '+files[0].path+' to '+targetPath)
                                }
                            })
                            gcManager.register(targetPath,data.workName+'_close')
                            appManager.launchValidator(data.unprotected.appSet,data,(ret) => {
                                if(ret.protected.inputFiles[0].path != ''){
                                    debug('block '+ret.unprotected.blockName+' is valid')
                                    dbB.update(ret.unprotected.blockName,ret,(err) => {
                                        if(err){
                                            console.error(err)
                                        }else{
                                            debug(ret.unprotected.blockName+'  upate to '+ret.unprotected.status+'!!!!!!!!!')
                                        }
                                    })
                                }else{
                                    debug('result invalid, start to resend')
                                    dbB.get(ret.unprotected.blockName,(err,value) => {
                                        if(err){
                                            console.error(err)
                                        }else{
                                            value.unprotected.status = 'init'
                                            dbB.put(value.unprotected.blockName,value,(err) => {
                                                if(err){
                                                    console.error(err)
                                                }
                                            })
                                        }
                                    })
                                }
                                
                                
                            })
                        }
                    })
                }
            })  
        })

        // init event handlers
        eventManager.registEvent('startCompute',(data) => {
            devStat.update('busy')
            debug('Confirm block '+data.unprotected.blockName)
            var bstr =  base58.decode(configure.config.goldenKey)
            var protectBuffer = data.protected
            protectBuffer = base58.decode(protectBuffer)
            var protectedTmp = Tools.publicDecrypt(bstr,protectBuffer)
            protectedTmp = protectedTmp.toString()
            data.protected = JSON.parse(protectedTmp)
            console.log(data)
            optAuth.path = '/confirmWork'
            optAuth.method = 'POST'
            var protectKey
            httpClinet.access(data.unprotected.blockName,optAuth,function(res){
                res = JSON.parse(res);
                if(res == null || res.key == null){
                    debug('Confirm block failed')
                    return
                }
                protectKey = res.key
                //download input files
                var targetPath = inputFileTmp+'/'+data.unprotected.blockName+'_'+data.protected.inputFiles[0].fileName
                debug('start to download '+data.protected.inputFiles[0].fileName+' to '+targetPath)
                p2pNode.get(data.protected.inputFiles[0].key,(err,files) => {
                    if(err){

                    }else{
                        var outBuffer = Tools.decompressionBuffer(files[0].content)
                        fs.writeFileSync(targetPath,outBuffer)
                        gcManager.register(targetPath,data.workName+'_close')
                        data.protected.inputFiles[0].path = targetPath
                        debug('download finish')
                        appManager.launchDapp(data.unprotected.appSet,null,data,(ret) => {
                            //compressing buffer
                            appManager.killDapp(data.unprotected.appSet)
                            var retBk = ret
                            var resultBuffer = fs.readFileSync(Tools.fixPath(retBk.protected.outputFiles[0].path))
                            resultBuffer = Tools.compressionBuffer(resultBuffer)
                            //upload result file
                            p2pNode.add(resultBuffer,{ recursive: false , ignore: ['.DS_Store']},(err,res) => {
                                if(err){
                                    console.error(err)
                                    return
                                }
                                res = res[0]
                                fs.unlink(retBk.protected.outputFiles[0].path,(err) => {
                                    if(err){
                                        console.error(err)
                                    }
                                })
                                retBk.protected.outputFiles[0].path = ''
                                retBk.protected.outputFiles[0].hash = res.hash
                                //encrypto block protected infomation
                                var keyBack = base58.decode(protectKey);
                                keyBack = keyBack.toString()
                                var protecStr = JSON.stringify(retBk.protected)
                                var gcArray = []
                                for(var p=0;p<retBk.protected.outputFiles.length;p++){
                                    gcArray.push(retBk.protected.outputFiles[p].path)
                                }
                                gcManager.register(gcArray,retBk.workName+'_close')
                                var enBuf = Tools.privateEncrypt(keyBack,protecStr)
                                enBuf = base58.encode(enBuf)
                                enBuf = enBuf.toString()
                                retBk.protected = enBuf
                                eventManager.emit('finishCompute',retBk)
                            })
                        })
                    }
                })
            })
        })

        //      block events
        eventManager.registEvent('blockIn',(data) => {
            data.unprotected.status = 'init'
            dbB.put(data.unprotected.blockName,data)
            bIndexes.push(data.unprotected.blockName)
        })

        //controll events
        eventManager.registEvent('demand',(peerID) => {
            if(bIndexes.length){
                var tmp = bIndexes[0]
                bIndexes.splice(0,1)
                p2pNode.libp2p.dialProtocol(peerID,'/cot/workrequest/1.0.0',(err,conn) => {
                    if(err){
                        console.warn(err)
                    }else{
                        pull(
                            conn,
                            pull.map((data) => {
                                return data.toString('utf8').replace('\n', '')
                            }),
                            pull.drain(function(data){
                                if(data == 'idel'){
                                    // start data record
                                    tmp.unprotected.status = 'processing';
                                    tmp.unprotected.slave = peerID.id.toB58String()
                                    var date = new Date()
                                    tmp.unprotected.info.startTime = date.valueOf()
                                    var p = Pushable();
                                    pull(p,conn);
                                    p.push(JSON.stringify(tmp))
                                    p.end() 
                                    dbB.update(tmp.unprotected.blockName,tmp,(err) => {
                                        if(err){
                                            console.error(err);
                                        }else{
                                            //send a message to UI
                                            var blockStatus = {}
                                            blockStatus.workName = tmp.workName
                                            blockStatus.index = tmp.unprotected.block.index
                                            blockStatus.status = 'processing'
                                            var infos = []
                                            infos.push(blockStatus)
                                            ipcManager.serverEmit('updateBlockStatus',infos)
                                        }
                                    });
                                }else{
                                    p2pNode.libp2p.hangUp(peerID,(err) => {
                                        debug('close connection to '+peerID.id.toB58String())
                                        debug(data)
                                    })
                                }
                                
                            },function (err){
                                if(err)console.error(err)
                            })
                        ) 
                    }
                })
            }
        })

        p2pNode.libp2p.handle('/cot/workrequest/1.0.0',(protocal,conn) => {
            var p = Pushable()
            pull(p,conn)
            if(devStat.avaliable()){
                p.push('idel')
            }else{
                p.push('busy')
                p.end()
            }
            pull(
                conn,
                pull.map((data) => {
                    return data.toString('utf8').replace('\n', '')
                }),
                pull.drain((data) => {
                    var tmpRecive = JSON.parse(data)
                    debug('handle',tmpRecive.unprotected.blockName)
                    p.push('recived')
                    p.end()
                    decideEngine.enviromentValidation(tmpRecive,(err) => {
                        if(err){
                            console.error(err)
                            conn.getPeerInfo((err,info) => {
                                if(err){
                                    console.error(err)
                                }else{
                                    node.dialProtocol(info, '/cot/workreject/1.0.0', (err, conn) => {//save our's peers to peer-book
                                        if(err == null){
                                            var p2 = Pushable()
                                            pull(p2,conn)
                                            p.push(JSON.parse(data))
                                            p.end()
                                        }else{
                                          
                                        }
                                    })
                                }
                            })
                        }else{
                            eventManager.emit('startCompute',tmpRecive)
                            var notif = {
                                title: 'New task',
                                body: 'Got one request: '+tmpRecive.unprotected.blockName
                            }
                            ipcManager.serverEmit('notification',notif)
                        }
                    })
                },function(err){
                    if(err)console.error(err)
                })
            )
        })

        p2pNode.libp2p.handle('/cot/workreject/1.0.0',(protocol,conn) => {
            pull(
                conn,
                pull.map((data) => {
                    return data.toString('utf8').replace('\n', '')
                }),pull.drain((data) => {
                    // record to db 
                    if(typeof(data) == 'string'){
                        data = JSON.parse(data)
                    }
                    eventManager.emit('blockIn',data)
                },function(err){
                    if(err)console.error(err)
                })
            )
        })

        p2pNode.libp2p.handle('/cot/workreport/1.0.0',(protocol,conn) => {
            pull(
                conn,
                pull.map((data) => {
                    return data.toString('utf8').replace('\n', '')
                }),pull.drain((data) => {
                    // record to db 
                    if(typeof(data) == 'string'){
                        data = JSON.parse(data)
                    }
                    eventManager.emit('reportIn',data)
                    removeElement(pBlocked,data.unprotected.slave)
                },function(err){
                    if(err)console.error(err)
                })
            )
        })

        p2pNode.libp2p.handle('/cot/workoption/1.0.0',(protocol,conn) => {
            pull(
                conn,
                pull.map((data) => {
                    return data.toString('utf8').replace('\n', '')
                }),pull.drain((data) => {
                    // record to db 
                    if(typeof(data) == 'string'){
                        data = JSON.parse(data)
                    }
                    if(data.type.indexOf('gc') >= 0){
                        debug('get one gc command')
                        gcManager.clearByEvent(data.workName+'_'+data.event)
                    }
                    if(data.type.indexOf('stop') >= 0){
                        debug('get one stop command')
                        // TODO: stop runing work
                    }
                },function(err){
                    if(err)console.error(err)
                })
            )
        })
    }

    process(){
        if(bIndexes.length){

        }else{
            devStat.update('standby')
        }
        setInterval(() => {
            if(bIndexes.length){
                var peers = p2pNode._peerInfoBook.getAllArray()
                peers.forEach((element) => {
                    var id = element.id.toB58String()
                    if(pBlocked.indexOf(id) >= 0 || id == p2pNode._peerInfo.id.toB58String()){
                        // already have job or it's node self
                    }else{
                        pBlocked.push(id)
                        debug('demand to '+id)
                        eventManager.emit('demand',element)
                    }
                })
            }
        }, 500);
    }

    register(data){
        if(data == null){
            return {"status":"NO","info":"bad param"};
        }
        optAuth.path = '/userRegister'
        optAuth.method = 'POST';
        httpClinet.access(JSON.stringify(data),optAuth,function(res){ 
            res = JSON.parse(res);
            ipcManager.serverEmit('register',res)
        });
    }

    login(dataTmp){
        function doLogin(data){
            if(!devStat.isModuleReady()){
                setTimeout(() => {
                    doLogin(data)
                }, 1000)
                return
            }
            debug('start login')
            optAuth.path = '/userLogin'
            optAuth.method = 'POST'
            data.device = p2pNode._peerInfo.id.toB58String()
            debug(data)
            httpClinet.access(JSON.stringify(data),optAuth,function(res){ 
                res = JSON.parse(res)
                debug(res)
                if(res.status == 'YES'){
                    configure.update('ownner',res.ownner)
                    configure.update('goldenKey',res.goldenKey)
                    ipcManager.serverEmit('login',res)
                    devStat.stageUp('login')
                }else{
                    console.error(res)
                }
            })
        }
        doLogin(dataTmp)
    }
}


module.exports = Furseal