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
const NodeManager = require('./src/common/nodeManager.js')
const DownloadManager = require('./src/common/downloadManager.js')
const Reporter = require('./src/common/reporter.js')
const Resender = require('./src/common/resender.js')

// data base handlers
var dbW     //work
var dbB     //block
var dbA     //application sets
var dbG     //gc
var dbR     //result data base

//reporter

//device state
var devStat

//event Manager
var eventManager

//download manager
var downloadManager

//reporter
var reporter

//resender
var resender

//p2p node handler
var p2pNode

// application manager
var appManager

//gc manager
var gcManager

var decideEngine

//work indexs
var wIndexes = {}

//block indexs
var bIndexes = {}

//extranal configure
var configure

//node manager
var nodeManager

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

var optFS = {}
optFS.port = 7335
optFS.hostname = urlBase
optFS.method = 'POST'

const httpClinet = new client()
var ipcManager = new IPCManager()

function removeElement(obj, elem) {
    if(obj == null){
        console.error('Arrary is empty')
        return
    }
    if(elem == null){
        console.error('Element is empty')
        return
    }
    if(obj[elem] != null){
        delete obj[elem]
    }
}

function addElement(obj,elem){
    if(obj == null){
        console.error('Arrary is empty')
        return
    }
    if(elem == null){
        console.error('Element is empty')
        return
    }
    obj[elem] = 1
}

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

function supplyMessage(){
    var peers = p2pNode._peerInfoBook.getAllArray()
    peers.forEach(peer => {
        p2pNode.libp2p.dialProtocol(peer,'/cot/worksupply/1.0.0',(err,conn) => {

        })
    })
    
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
        dbR = new DBManager(homePath+'/data/result')
        configure = new Configure(homePath)
        devStat = new DeviceState({
            SupplyCallback:supplyMessage,
            Configure:configure
        })
        this.devStat = devStat
        eventManager = new EventsManager()
        Tools.setEnv('COT_DATA_PATH',homePath)
        nodeManager = new NodeManager()
        reporter = new Reporter()
         //init ipc 
         ipcManager.createServer({
            id:'nodeServer'
        })
        
        resender = new Resender({
            WorkIndexs:wIndexes,
            WorkDatabase:dbW,
            BlockDatabase:dbB,
            IPCManager:ipcManager
        })

        ipcManager.addServerListenner('changeDeviceStatus',(data,socket) => {
            var obj = data
            if(typeof(obj) == 'string'){
                obj = JSON.parse(obj)
            }
            if(obj.status == 'stop'){
                devStat.disableSharing()
                appManager.killAllDapp()
            }else if(obj.status == 'start'){
                devStat.enableSharing()
            }else{

            }
        })

        ipcManager.addServerListenner('mainUpdate',(data,socket) => {
            var step = 0
            var dataWrap = {};
            dbW.getAll(function(data){
                dataWrap.workList = data;
                dataWrap.nodeNumber = '50';
                dataWrap.speed = '0';
                dataWrap.avgTime = '180';
                dataWrap.balanceCNC = '12,000';
                dataWrap.balanceRNB = '1.2';
                dataWrap.powerSharing = configure.config.powerSharing
                step++
            })
            var peersList = {}
            dbB.getAllValue((value) => {
                var count = 0
                if(value.length == 0){
                    step++
                }
                value.forEach(elem => {
                    if(elem.unprotected.status == 'processing'){
                        peersList[elem.unprotected.slave] = 1
                    }
                    if(++count == value.length){
                        dataWrap.nodeNumber = Object.keys(peersList).length.toString()
                        step++
                    }
                })
            })

            var handle = setInterval(() => {
                if(step == 2){
                    clearInterval(handle)
                    ipcManager.serverEmit('mainUpdate',dataWrap)
                }
            }, 200);
            
           
            
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
            resender.resendByBlockName(data)
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

        ipcManager.addServerListenner('updateServicingNodeNumber',(data,socket) => {
            var peersList = {}
            dbB.getAllValue((value) => {
                var count = 0
                value.forEach(elem => {
                    if(elem.unprotected.status == 'processing'){
                        peersList[elem.unprotected.slave] = 1
                    }
                    if(++count == value.length){
                        ipcManager.serverEmit('updateServicingNodeNumber',Object.keys(peersList).length)
                    }
                })
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

            function updateDividStat(dataTmp,value){
                console.log('update divid')
                if(!devStat.isModuleReady()){
                        console.log('module not ready')
                        setTimeout(() => {
                            updateDividStat(dataTmp,value)
                        }, 5000);   
                }else{
                    if(dataTmp.status == 'active'){
                        appManager.launchDividor(value.setName,(res) => {
                            eventManager.emit('blockIn',res)
                        })
                    }else{
                        appManager.killDividor(value.setName)
                    }
                }
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
                    updateDividStat(data,value)
                    //kill process or launch process
                }
            })
        })

        ipcManager.addServerListenner('updateActiveDividor',(data,socket) => {
            
            dbA.getAllValue((value) => {
                var retTmp = []
                var count = 0
                value.forEach(element => {
                    console.log(element)
                    if(element.apps == null || element.apps.dividor == null){
                        console.log('not have dividor')
                    }else{
                        
                        var ret = {}
                        ret.setName = element.setName
                        ret.dividorName = element.apps.dividor.name
                        ret.status = element.status
                        retTmp.push(ret)
                    }
                    if(++count == value.length){
                        console.log('Update ',retTmp)
                        ipcManager.serverEmit('updateActiveDividor',retTmp)
                    }
                })
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

        ipcManager.serve()

        downloadManager = new DownloadManager({
            IPCManager:ipcManager
        })
        
    }

    async init(){

        debug('Watting login ...')
        if(!devStat.isLogin()){
            setTimeout(() => {
                this.init()
            }, 1000)
            return
        }
        debug('Device login successfully!')
        if(p2pNode == null){
            p2pNode = await P2PBundle.createP2PNode(this.homePath,base58.decode(configure.config.swarm))
            debug('P2P node created')
            gcManager = new GCManager({
                GCRecordDB:dbG,
                P2PNode:p2pNode
            })
            appManager = new AppManager({
                appDB:dbA,
                blockDB:dbB,
                workDB:dbW,
                p2pNode:p2pNode,
                appRepoPath:appRepository,
                configure:configure,
                downloadManager:downloadManager,
                gcManager:gcManager
            })
    
            appManager.launchStore()
    
            decideEngine = new DecideEngine({
                DappDatabase:dbA,
                AppManager:appManager
            })
          
            devStat.stageUp('moduleReady')
        }

        //REST block status and load indexes
        dbW.getAllValue((data) => {
            for(var i=0; i<data.length; i++){
                var element = data[i]
                if(element.unprotected.status == 'init'){
                    addElement(wIndexes,element.workName)
                    element.unprotected.status = 'processing'
                    dbW.put(element.workName,element)
                }else if(element.unprotected.status == 'processing'){
                    addElement(wIndexes,element.workName)
                    if(element.unprotected.info.progress == 1){
                        eventManager.emit('startAssimilate',element)
                    }
                }else if(element.unprotected.status == 'assimilating'){
                    // TODO
                    element.unprotected.status = 'processing'
                    dbW.put(element.workName,element)
                }else{
                }
            }
            dbB.getAllValue((data2) => {
                data2.forEach(element => {
                    if(element.unprotected.status == 'init'){
                        addElement(bIndexes,element.unprotected.blockName)
                    }else if(element.unprotected.status == 'validating'){
                        element.unprotected.status = 'preDone'
                        dbB.update(element.unprotected.blockName,element,(err) => {
                            if(err){
                                console.error(err)
                            }
                        })
                    }else{

                    }
                });
            })
        })

        eventManager.registEvent('startAssimilate',(val) => {
            var data = JSON.parse(JSON.stringify(val))
            dbW.get(data.workName,(err,value) => {
                if(err){
                    console.error(err)
                }else{
                    if(value.unprotected.info.progress == 1 &&  value.unprotected.status == 'processing'){
                        value.unprotected.status = 'assimilating'
                        dbW.put(value.workName,value,(err) => {
                            if(err){
                                console.error(err)
                            }
                        })
                        debug('Start luanch assimilator')
                        appManager.launchAssimilator(value.unprotected.appSet,value,(err,res) => {
                            if(err){
                                console.error(err)
                            }else{
                                value.unprotected.status = 'finish'
                                var notif = {
                                    title: 'work complated',
                                    body: value.workName+' was complated'
                                }
                                ipcManager.serverEmit('notification',notif)
                                globalGC(value.workName)
                                var postPair = {}
                                postPair.workName = value.workName
                                postPair.key = ''
                                optFS.path = '/gc'
                                httpClinet.access(JSON.stringify(postPair),optFS,(rest) => {
                                    if(rest.error){
                                        console.error(rest.error)
                                    }
                                })
                                dbW.put(value.workName,value,(err) => {
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

        //test code
        p2pNode.libp2p.on('peer:connect',(peer) => {
            console.log(peer.id.toB58String())
        })

        eventManager.registEvent('finishCompute',(dataIn) => {
            var data = JSON.parse(JSON.stringify(dataIn))
            //devStat.update('reporting')
            debug('Report result to owner '+data.unprotected.owner)
            var pID = PeerID.createFromB58String(data.unprotected.owner)
            p2pNode.libp2p.dialProtocol(pID,'/cot/workreport/1.0.0',(err,conn) => {
                if(err){
                    console.error(err)
                    //retry
                    if(reporter.check(data.unprotected.blockName)){
                        setTimeout(() => {
                            debug('resend result ----------------------------------------------------------------')
                            eventManager.emit('finishCompute',data)
                        }, 5000)
                    }else{
                        devStat.update('standby')
                    }
                }else{
                    var p = Pushable()
                    pull(p,conn)
                    p.push(JSON.stringify(data))
                    p.end()
                    devStat.update('standby')
                }
            })
        })

        eventManager.registEvent('reportIn',(data) => {
            debug('report coming')
            dbB.get(data.unprotected.blockName,(err,value) => {
                if(err){
                    console.error(err)
                }else{
                    var date = new Date()
                    data.unprotected.info.timeCost = date.valueOf() - value.unprotected.info.startTime
                    value.unprotected.info.timeCost = data.unprotected.info.timeCost
                    value.unprotected.status = 'preDone'
                    // update block status
                    var infos = []
                    var infoTmp = {}
                    infoTmp.workName = data.workName
                    infoTmp.index = data.unprotected.block.index
                    infoTmp.startTime = data.unprotected.info.startTime
                    infoTmp.timeCost = data.unprotected.info.timeCost
                    infoTmp.status = 'preDone'
                    infos.push(infoTmp)
                    ipcManager.serverEmit('updateBlockStatus',infos)
                    dbB.put(data.unprotected.blockName,value,(err) => {
                        if(err){
                            console.error(err)
                        }
                    })
                    dbR.put(data.unprotected.blockName,data,(err) => {
                        if(err){
                            console.error(err)
                        }
                    })
                }
            })
        })

        eventManager.registEvent('startValidate',(data) => {
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
                    var keyBack = base58.decode(res.key)
                    keyBack = keyBack.toString()
                    var dataBuffer = base58.decode(data.protected);
                    var protectedTmp =  Tools.privateDecrypt(keyBack,dataBuffer)
                    protectedTmp = protectedTmp.toString()
                    debug('reported result:'+postPair.blockName);
                    //update work progress
                    data.protected = JSON.parse(protectedTmp)
                    //updage db
                    var totalBytes = 0
                    pull(
                        p2pNode.catPullStream(data.protected.outputFiles[0].hash),
                        pull.through(dataIn => {
                          totalBytes += dataIn.length
                          var status = {}
                          status.fileName = data.protected.outputFiles[0].fileName
                          status.total = data.protected.outputFiles[0].size
                          status.recived = totalBytes
                          var date = new Date()
                          status.timeStamp = date.valueOf()
                          downloadManager.update(status)
                        }),
                        pull.collect((err,buf) => {
                            if(err){
                                console.error(err)
                                resender.stepBack(data.unprotected.blockName)
                                return
                            }else{
                                var targetPath = resultFileTmp+'/'+data.protected.outputFiles[0].fileName
                                data.protected.outputFiles[0].path = targetPath
                                var inBuffer = Tools.decompressionBuffer(Buffer.concat(buf))
                                fs.writeFile(targetPath, inBuffer, (err) => {
                                    if(err){
                                        console.error(err)
                                        resender.stepBack(data.unprotected.blockName)
                                        return
                                    }else{
                                        debug('Download '+data.protected.outputFiles[0].hash+' to '+targetPath)
                                    }
                                })
                                gcManager.register(targetPath,data.workName+'_close')
                                //gcManager.register(data.protected.outputFiles[0].hash,data.workName+'_close')
                                appManager.launchValidator(data.unprotected.appSet,data,(ret) => {
                                    //appManager.killValidator(data.unprotected.appSet)
                                    if(ret.protected.inputFiles[0].path != ''){
                                        debug('block '+ret.unprotected.blockName+' is valid')
                                        debug('result is '+ret.protected.inputFiles[0].path)
                                        ret.unprotected.status = 'validated'
                                        dbB.update(ret.unprotected.blockName,ret,(err) => {
                                            if(err){
                                                console.error(err)
                                                resender.stepBack(data.unprotected.blockName)
                                                return
                                            }else{
                                                //update workInfo
                                                dbW.get(ret.workName,(err,wVal) => {
                                                    if(err){
                                                        console.error(err)
                                                    }else{
                                                        var blockDim = wVal.unprotected.block.indexs;
                                                        var indexs = blockDim.split('_');
                                                        var total = wVal.unprotected.block.number
                                                        
                                                        var blockIndex = ret.unprotected.block.index;
                                                        var index = blockIndex.split('_');
                                                        if(index.length < 2){
                                                            console.error('bad block index');
                                                        }
                                                        if(index.length < 2){
                                                            console.error('bad block index');
                                                        }
                                                        var pm = new ProgressManager(parseInt(indexs[0]),total,wVal.unprotected.progress)
                                                        pm.updateProgressWithIndex(parseInt(index[1]),parseInt(index[0]),true)
                                                        wVal.unprotected.info.progress = pm.getProgress();
                                                        if(wVal.unprotected.info.progress == 1){
                                                            eventManager.emit('startAssimilate',wVal)
                                                        }else{
                                                            debug('work '+wVal.workName+'\'s progress come to '+wVal.unprotected.info.progress)
                                                        }
                                                        wVal.unprotected.progress = pm.mProgress;
                                                        dbW.put(wVal.workName,wVal,(err) => {
                                                            if(err){
                                                                console.error('ERROR: ',err);
                                                            }
                                                        })
                                                        // update blockinfo
                                                        var blockStatus = {}
                                                        blockStatus.workName = ret.workName
                                                        blockStatus.index = ret.unprotected.block.index
                                                        blockStatus.status = 'validated'
                                                        var infos = []
                                                        infos.push(blockStatus)
                                                        ipcManager.serverEmit('updateBlockStatus',infos)
                                                        
                                                    }
                                                })
                                            }
                                        })
                                    }else{
                                        debug('result invalid, start to resend')
                                        resender.resendByBlockName(ret.unprotected.blockName)
                                    }
                                })
                            }
                        })
                    )
                }
            })  
        })

        // init event handlers
        eventManager.registEvent('startCompute',(dataIn) => {
            var data  = JSON.parse(JSON.stringify(dataIn))
            debug('Confirm block '+data.unprotected.blockName)
            var bstr =  base58.decode(configure.config.goldenKey)
            var protectBuffer = data.protected
            protectBuffer = base58.decode(protectBuffer)
            var protectedTmp = Tools.publicDecrypt(bstr,protectBuffer)
            protectedTmp = protectedTmp.toString()
            data.protected = JSON.parse(protectedTmp)
            optAuth.path = '/confirmWork'
            optAuth.method = 'POST'
            httpClinet.access(data.unprotected.blockName,optAuth,function(res){
                res = JSON.parse(res);
                if(res == null || res.key == null){
                    debug('Confirm block failed')
                    return
                }
                data.enKey = res.key
                //download input files
                var targetPath = inputFileTmp+'/'+data.unprotected.blockName+'_'+data.protected.inputFiles[0].fileName
                debug('start to download '+data.protected.inputFiles[0].fileName+' to '+targetPath)
                var totalBytes = 0
                pull(
                    p2pNode.catPullStream(data.protected.inputFiles[0].hash),
                    pull.through(dataIn => {
                        totalBytes += dataIn.length
                        var status = {}
                        status.Total = data.protected.inputFiles[0].size
                        status.recived = totalBytes
                        downloadManager.update(status)
                    }),
                    pull.collect((err,buf) => {
                        if(err){
                            console.error(err)
                        }else{
                            var outBuffer = Tools.decompressionBuffer(Buffer.concat(buf))
                            fs.writeFileSync(targetPath,outBuffer)
                            gcManager.register(targetPath,data.unprotected.blockName+'_close')
                           // gcManager.register(data.protected.inputFiles[0].hash,data.workName+'_close')
                            data.protected.inputFiles[0].path = targetPath
                            debug('download finish')
                            appManager.launchDapp(data.unprotected.appSet,null,data,(ret) => {
                                //compressing buffer
                                gcManager.clearByEvent(ret.unprotected.blockName+'_close')
                                gcManager.register(ret.protected.outputFiles[0].path,ret.unprotected.blockName+'_uploaded')
                                setTimeout(() => {
                                    if(devStat.timeFreed() > 20000){
                                        appManager.killDapp(data.unprotected.appSet)
                                    }else{
                                        debug('Not kill dapp beacourse is used')
                                        debug(devStat.timeFreed())
                                    }
                                }, 30000);
                                var retBk = ret
                                var resultBuffer = fs.readFileSync(Tools.fixPath(retBk.protected.outputFiles[0].path))
                                resultBuffer = Tools.compressionBuffer(resultBuffer)
                                //upload result file
                                p2pNode.add(resultBuffer,{ recursive: false , ignore: ['.DS_Store']},(err,res2) => {
                                    if(err){
                                        console.error(err)
                                        return
                                    }
                                    res2 = res2[0]
                                    gcManager.clearByEvent(ret.unprotected.blockName+'_uploaded')
                                    gcManager.register(res2.hash,data.workName+'_close')
                                    retBk.protected.outputFiles[0].path = ''
                                    retBk.protected.outputFiles[0].hash = res2.hash
                                    retBk.protected.outputFiles[0].size = resultBuffer.length
                                    //encrypto block protected infomation
                                    var keyBack = base58.decode(retBk.enKey);
                                    keyBack = keyBack.toString()
                                    var protecStr = JSON.stringify(retBk.protected)
                                    var enBuf = Tools.publicEncrypt(keyBack,protecStr)
                                    enBuf = base58.encode(enBuf)
                                    retBk.protected = enBuf.toString()
                                    delete retBk.enKey
                                    eventManager.emit('finishCompute',retBk)
                                    var postPair = {}
                                    postPair.workName = ret.workName
                                    postPair.key = res2.hash
                                    optFS.path = '/uploadFile'
                                    httpClinet.access(JSON.stringify(postPair),optFS,(rest) => {
                                        if(rest.error){
                                            console.error(rest.error)
                                        }
                                    })
                                })
                            })
                        }
                    })
                )
            })
        })

        //      block events
        eventManager.registEvent('blockIn',(dataIn) => {
            var data = JSON.parse(JSON.stringify(dataIn))
            data.unprotected.status = 'init'
            dbB.get(data.unprotected.blockName,(err,value) => {
                if(err){
                    dbB.put(data.unprotected.blockName,data)
                    if(wIndexes[data.workName] == null){
                        addElement(wIndexes,data.workName)
                        debug('One work detected '+data.workName)
                        dbW.put(data.workName,data,(err) => {
                            if(err){
                                console.error(err)
                            }
                        })
                    }
                    addElement(bIndexes,data.unprotected.blockName)
                }else{
                    //debug('block info already exist '+data.unprotected.blockName)
                }
            })
        })

        //controll events
        eventManager.registEvent('demand',(peerID) => {
            var pIDStr = peerID.id.toB58String()
            if(Object.keys(bIndexes).length && !nodeManager.isBlock(pIDStr)){
                nodeManager.hardBlock(pIDStr)
                var tmp = Object.keys(bIndexes)[0]
                if(tmp == null){
                    return
                }
                removeElement(bIndexes,tmp)
                dbB.get(tmp,(err,val) => {
                    if(err){
                        console.error(err)
                        nodeManager.hardUnBlock(pIDStr)
                    }else{
                        if(val.unprotected.status != 'init'){
                            return
                        }
                        p2pNode.libp2p.dialProtocol(peerID,'/cot/workrequest/1.0.0',(err,conn) => {
                            if(err){
                                //console.warn(err)
                                nodeManager.hardUnBlock(pIDStr)
                                nodeManager.check(pIDStr)
                            }else{
                                pull(
                                    conn,
                                    pull.map((data) => {
                                        return data.toString('utf8').replace('\n', '')
                                    }),
                                    pull.drain(function(data){
                                        if(data == 'idel'){
                                            // start data record
                                            val.unprotected.status = 'processing';
                                            val.unprotected.slave = peerID.id.toB58String()
                                            var date = new Date()
                                            val.unprotected.info.startTime = date.valueOf()
                                            var p = Pushable();
                                            pull(p,conn);
                                            p.push(JSON.stringify(val))
                                            p.end() 
                                            dbB.update(val.unprotected.blockName,val,(err) => {
                                                if(err){
                                                    console.error(err);
                                                }else{
                                                    //send a message to UI
                                                    var blockStatus = {}
                                                    blockStatus.workName = val.workName
                                                    blockStatus.index = val.unprotected.block.index
                                                    blockStatus.status = 'processing'
                                                    var infos = []
                                                    infos.push(blockStatus)
                                                    ipcManager.serverEmit('updateBlockStatus',infos)
                                                }
                                            })
                                        }else{
                                            // p2pNode.libp2p.hangUp(peerID,(err) => {
                                            //     debug('close connection to '+peerID.id.toB58String())
                                            //     debug(data)
                                            // })
                                            addElement(bIndexes,val.unprotected.blockName)
                                            nodeManager.hardUnBlock(pIDStr)
                                        }
                                        // one comunication complated, unblock node whatever blocked count is
                                        nodeManager.unblock(pIDStr)
                                    },function (err){
                                        if(err)console.error(err)
                                    })
                                ) 
                            }
                        })
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
                return
            }
            pull(
                conn,
                pull.map((data) => {
                    return data.toString('utf8').replace('\n', '')
                }),
                pull.drain((data) => {
                    devStat.update('busy')
                    var tmpRecive = JSON.parse(data)
                    debug('handle',tmpRecive.unprotected.blockName)
                    p.push('recived')
                    p.end()
                    decideEngine.enviromentValidation(tmpRecive,(err,infoOut) => {
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
                                        devStat.update('standby')
                                    })
                                }
                                
                            })
                        }else{
                            eventManager.emit('startCompute',infoOut)
                            var notif = {
                                title: 'New task',
                                body: 'Got one request: '+infoOut.unprotected.blockName
                            }
                            ipcManager.serverEmit('notification',notif)
                        }
                    })
                },function(err){
                    if(err){
                        console.error(err)
                    }
                })
            )
        })

        p2pNode.libp2p.handle('/cot/workreject/1.0.0',(protocol,conn) => {
            pull(
                conn,
                pull.map((data) => {
                    return data.toString('utf8').replace('\n', '')
                }),pull.drain((data) => {
                    if(typeof(data) == 'string'){
                        data = JSON.parse(data)
                    }
                    resender.resendByBlockName(data.unprotected.blockName)
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
                    nodeManager.unblock(data.unprotected.slave)
                    nodeManager.hardUnBlock(data.unprotected.slave)
                    debug('Unblock '+data.unprotected.slave+' soft & hard')
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

        p2pNode.libp2p.handle('/cot/worksupply/1.0.0',(proto,conn) => {
            conn.getPeerInfo((err,info) => {
                if(err){

                }else{
                    debug('Peer '+info.id.toB58String()+' supply message coming')
                    nodeManager.hardUnBlock(info.id.toB58String())
                    //resend processing blocks who's slave is this node
                    resender.resendBySlaveID(info.id.toB58String())
                }
            })
        })
    }

    process(){
        if(Object.keys(bIndexes).length){

        }else{
            devStat.update('standby')
        }
        setInterval(() => {
            if(Object.keys(bIndexes).length){
                var peers = p2pNode._peerInfoBook.getAllArray()
                peers.forEach((element) => {
                    var id = element.id.toB58String()
                    if(nodeManager.isBlock(id) || id == p2pNode._peerInfo.id.toB58String()){
                        // already have job or it's node self
                    }else{
                        eventManager.emit('demand',element)
                    }
                })
            }else{
            }
            dbW.getAllValue((val) => {
                val.forEach(elem => {
                    if(elem.unprotected.status == 'init'){
                        addElement(wIndexes,elem.workName)
                        elem.unprotected.status = 'processing'
                        dbW.put(elem.workName,elem,(err) => {
                            if(err){
                                console.error(err)
                            }
                        })
                    }else if(elem.unprotected.status == 'processing'){
                        if(elem.unprotected.info.progress == 1){
                            eventManager.emit('startAssimilate',elem)
                        }
                    }else{

                    }
                })
            })
            dbB.getAllValue((val) => {
                val.forEach(elem => {
                    if(wIndexes[elem.workName]  == 1 && elem.unprotected.status == 'init'){
                        addElement(bIndexes,elem.unprotected.blockName)
                        dbB.put(elem.unprotected.blockName,elem,(err) => {
                            if(err){
                                console.log(err)
                            }
                        })
                    }else if(elem.unprotected.status == 'preDone'){
                        debug('Found preDone block')
                        if(wIndexes[elem.workName]  == 1  ){
                            dbR.get(elem.unprotected.blockName,(err,value) => {
                                if(err){
                                    console.error(err)
                                }else{
                                    elem.unprotected.status = 'validating'
                                    dbB.put(elem.unprotected.blockName,elem,(err) => {
                                        if(err){
                                            console.error(err)
                                        }
                                    })
                                    debug('Start validate')
                                    eventManager.emit('startValidate',value)
                                }
                            })
                        }
                    }else{

                    }
                })
            })
        }, 3000);
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
            debug('start login')
            optAuth.path = '/userLogin'
            optAuth.method = 'POST'
            data.device = configure.config.id
            httpClinet.access(JSON.stringify(data),optAuth,function(res){ 
                res = JSON.parse(res)
                if(res.status == 'YES'){
                    configure.update('ownner',res.ownner)
                    configure.update('goldenKey',res.goldenKey)
                    configure.update('swarm',res.swarm)
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