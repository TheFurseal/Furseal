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
const debug = require('debug')('core:index')
const fs = require('fs')
const Tools = require('./src/common/tools.js')
const process = require('process')

process.on('uncaughtException', function (exception) {
    console.log(exception); // to see your exception details in the console
    // if you are on production, maybe you can send the exception details to your
    // email as well ?
  });

  process.on('unhandledRejection', function (exception) {
    console.log(exception); // to see your exception details in the console
    // if you are on production, maybe you can send the exception details to your
    // email as well ?
  });

var appManager
var dbW = {}
var dbB = {}
var conf = {}
var dbA = {}
var dbG = {}
var decideEngine

var urlBase = 'peer1.cotnetwork.com';
var dealer1 = 'peer1.cotnetwork.com';

var dappDownloading = {}
var blockBuffer = [] //local buffer to send to nodes
var workBuffer = [] // local recived request buffer
var workBufferToProcess = null
var workBufferLimit = 5
var slaveModel = true
var isProcessing = false
var relayByOhterNode = {}
var inRealy = []
var p2pNode
var gcManager

var optDealer = {};
optDealer.port = 7334;
optDealer.hostname = dealer1;
optDealer.path = '/dealRequest';
optDealer.method = 'POST';

var optAuth = {};
optAuth.port = 7333;
optAuth.hostname = urlBase;
optAuth.path = '/dealRequest';
optAuth.method = 'POST';

var resultTmpPath
var inputTmpPath
var appRepository

var initedWork = []

const httpClinet = new client();
// var dealerHttp = new client();

var ipcManager = new IPCManager()

function removeElement(array, elem) {
    var index = array.indexOf(elem);
    while(index >= 0){
        array.splice(index, 1)
        index = array.indexOf(elem)
    }
}

function exchangeResult(inBuffer){
    
   
    debug('Exchange result to '+inBuffer.unprotected.ownner)
    var node = p2pNode.libp2p

    //test
    var pID = PeerID.createFromB58String(inBuffer.unprotected.ownner)
    node.dialProtocol(pID,'/cot/workreport/1.0.0',(err,conn) => {
        var p = Pushable();
        pull(p,conn)
        p.push(JSON.stringify(inBuffer))
        debug(inBuffer.unprotected.blockName,' OK');
       
    })

    setTimeout(() => {
        switchOn()
    }, 5000)  
}

function globalGC(workName){
    gcManager.clearByEvent(workName+'_close')
    dbB.getAll((value) => {
        var slaves = []
        for(var i=0;i<value.length;i++){
            var tmp = value[i].value
            if(typeof(tmp) == 'string'){
                tmp = JSON.parse(tmp)
            }
            
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



function doResolveResult(blockInfo,callback){
                   

    dbW.get(blockInfo.workName,(err,value) => {
        if(err){
            //console.error(err);
            return;
        }
        if(typeof(value) == 'string'){
            value = JSON.parse(value);
        }
        optAuth.path = '/resolveResult'
        optAuth.method = 'POST'
        //add resolve key to blockInfo
        var postPair = {};
        postPair.blockName = blockInfo.unprotected.blockName;
        postPair.workName = blockInfo.workName;
        postPair.resolveKey = conf.decrypto(value.resolveKey);
        if(blockInfo.unprotected.status == 'preDone1'){
            callback(blockInfo)
        }else{
            httpClinet.access(JSON.stringify(postPair),optAuth,function(res){
                if(typeof(res) == 'string'){
                    res = JSON.parse(res);
                }
                if(res.error){
                    console.error('resolveResult',res);
                }else{
    
                    var keyBack = base58.decode(res.key);
                        keyBack = keyBack.toString();
                      
                    var dataBuffer = base58.decode(blockInfo.protected);
                    
                    var protectedTmp =  null
                    for(var i=0;i<dataBuffer.length;i+=512){
                        var len = 512
                        if(i+len > dataBuffer.length){
                            len = dataBuffer.length - i
                        }
                        var subBuffer = Buffer.alloc(len)
                        dataBuffer.copy(subBuffer,0,i,i+len)
                       
                        var tmp = cryptoOrigin.publicDecrypt(
                            {
                            key:keyBack,
                            passphrase:'top secret',
                            padding: cryptoOrigin.constants.RSA_PKCS1_PADDING
                            },
                            subBuffer,
                        )
                        if(protectedTmp == null){
                            protectedTmp = tmp
                        }else{
                            protectedTmp = Buffer.concat([protectedTmp,tmp])
                        }
                    }
                    protectedTmp = protectedTmp.toString()
                    debug('Finnal result:\n',postPair.blockName);
                    //update work progress
                    blockInfo.protected = JSON.parse(protectedTmp)
                    callback(blockInfo)
                }
            })  
        }

        
    })
}

function updateWorkInfo(){
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
}


var appPathReg;


var protocalSwitchReg = 'off' // make sure not handle duplicate (memory leak)

function switchOff(){

    if(protocalSwitchReg == 'off'){
        return
    }
    var node = p2pNode.libp2p
    debug('Switch off!!!!')
    node.unhandle('/cot/workrequest/1.0.0')
    protocalSwitchReg = 'off'
}

function switchOn(){


    if(protocalSwitchReg == 'on'){
        return
    }

    var node = p2pNode.libp2p
    if(node == null){
      
        setTimeout(() => {
            switchOn()
        }, 2000)

        //have to return
        return
    }
    debug('Switch on!!!!')
    protocalSwitchReg = 'on'
    node.handle('/cot/workrequest/1.0.0',(protocal,conn) => {
        if(workBuffer.length+blockBuffer.length + inRealy.length > workBufferLimit){
           
            switchOff()
        }
        
        var p = Pushable()
        pull(p,conn)
        p.push('idel')
        
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
                decideEngine.checkBlockAcceptable(tmpRecive,(flag,value,needDownload) => {
                    if(flag){
                        if(needDownload && dappDownloading[tmpRecive.unprotected.appSet] == null){
                            dappDownloading[tmpRecive.unprotected.appSet] = 'downloading'
                            if(typeof(value) == 'string'){
                                value = JSON.parse(value)
                            }
                            debug('Do not have dapp, download it',value)
                            
                            p2pNode.get(value.apps.dapp[0].url,(err,files) => {
                                if(err){
                                    console.error(err)
                                }else{
                                    files.forEach((file) => {
                                        
                                        var targetPath = appRepository+'/'+value.apps.dapp[0].name
                                        value.apps.dapp[0].path = targetPath
                                        var inBuffer = Tools.decompressionBuffer(file.content)
                                        fs.writeFile(targetPath, inBuffer, (err) => {
                                            // throws an error, you could also catch it here
                                            if(err){
                                                console.error(err)
                                            }else{
                                                debug('Download '+file.path+' to '+targetPath)
                                            }
                                        })
                                        workBuffer.push(tmpRecive)
                                        // if(inRealy.indexOf(tmpRecive.unprotected.blockName) >= 0){
                                        //     removeElement(inRealy,tmpRecive.unprotected.blockName)
                                        // }
                                        delete dappDownloading[tmpRecive.unprotected.appSet]
                                        dbA.put(tmpRecive.unprotected.appSet,JSON.stringify(value),(err) => {
                                            if(err){
                                                console.error(err)
                                            }
                                           
                                        })
                                    })

                                    
                                    var notif = {
                                        title: 'New task',
                                        body: 'Got one request: '+tmpRecive.unprotected.blockName
                                    }
                                   
                                    ipcManager.serverEmit('notification',notif)
                                   
                                    
                                }
                            })
                        }else if(dappDownloading[tmpRecive.unprotected.appSet] != null){
                            debug('dapp downloading, add to relay')
                            blockBuffer.push(tmpRecive)
                            inRealy.push(tmpRecive.unprotected.blockName)
                            var notif = {
                                title: 'New task',
                                body: 'Got one request: '+tmpRecive.unprotected.blockName
                            }

                            ipcManager.serverEmit('notification',notif)

                        }else{
                            debug('dapp readly, add to workBuffer')
                            workBuffer.push(tmpRecive)
                        }

                    }else{
                        console.error('Invalid target !!!!!')
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
                    }
                })
            },function(err){
                if(err)console.error(err);
            })
        )
    })
}


class NodeCore{
    constructor(appPath){
        
        appPathReg = appPath
        Tools.setEnv('COT_DATA_PATH',appPath)
        dbW = new DBManager(appPath+'/data/work')
        dbB = new DBManager(appPath+'/data/block')
        dbA = new DBManager(appPath+'/data/appRepo')
        dbG = new DBManager(appPath+'/data/gc')
        conf = new Configure(appPath)
        //parse conf to dbB to encrypto resolve key at registerBlock
        dbB.conf = conf

        debug('start to create bundle')
        p2pNode = P2PBundle.createP2PNode(appPath)
        debug('bundle created')
        resultTmpPath = appPath+'/resultTmp'
        fs.exists(Tools.fixPath(resultTmpPath),(exists) => {
            if(!exists){
                fs.mkdirSync(Tools.fixPath(resultTmpPath),'0755')
            }
        })
        inputTmpPath = appPath+'/inputTmp'
        fs.exists(Tools.fixPath(inputTmpPath),(exists) => {
            if(!exists){
                fs.mkdirSync(Tools.fixPath(inputTmpPath),'0755')
            }
        })

        // temp floder to storage tmp files
        if(!fs.existsSync(Tools.fixPath(appPath+"/tmp"))){
            fs.mkdirSync(Tools.fixPath(appPath+"/tmp"),'0755')
        }

        appRepository = appPath+'/applicationRepository'
       
        appManager = new AppManager({
            appDB:dbA,
            blockDB:dbB,
            workDB:dbW,
            p2pNode:p2pNode,
            appRepoPath:appRepository
        })

        appManager.launchStore()

        decideEngine = new DecideEngine({
            DappDatabase:dbA,
            AppManager:appManager
        })

        gcManager = new GCManager({
            GCRecordDB:dbG
        })

       
    }
    


    init(){

        // rewrite libp2p 

        var p2pHandle = setInterval(() => {

            if(p2pNode.libp2p != null){

                var node = p2pNode.libp2p
                //do settings


                // workoption

                /**
                 * data = {
                 *  type:[ 'gc','stop' ],
                 *  event:'close',
                 *  workName: 'work name'
                 * }
                 */

                node.handle('/cot/workoption/1.0.0',(protocol,conn) => {
                    pull(
                        conn,
                        pull.map((data) => {
                            return data.toString('utf8').replace('\n', '')
                        }),pull.drain((data) => {
                            // record to db 
                            if(typeof(data) == 'string'){
                                data = JSON.parse(data)
                            }
                            debug(data)
                            if(data.type.indexOf('gc') >= 0){
                                debug('get one gc command')
                                gcManager.clearByEvent(data.workName+'_'+data.event)
                            }

                            if(data.type.indexOf('stop') >= 0){
                                debug('get one stop command')
                                // stop runing work
                            }
                            
                        },function(err){
    
                            if(err)console.error(err);
                        })
                    )
                })

                // workreject
                node.handle('/cot/workreject/1.0.0',(protocal,conn) => {
                    pull(
                        conn,
                        pull.map((data) => {
                            return data.toString('utf8').replace('\n', '')
                        }),pull.drain((data) => {
                            // record to db 
                            if(typeof(data) == 'string'){
                                data = JSON.parse(data)
                            }
                            dbB.get(data.unprotected.blockName,(err,value) => {
                                if(err){
                                    console.error(err)
                                }else{
                                    if(typeof(value) == 'string'){
                                        value = JSON.parse(value)
                                    }
                                    value.unprotected.status = 'init'
                                    dbB.put(value.unprotected.blockName,JSON.stringify(value),(err) => {
                                        if(err){
                                            console.error(err)
                                        }
                                    })
                                }
                            })
                        },function(err){
    
                            if(err)console.error(err);
                        })
                    )
                })

                //relayreport
                node.handle('/cot/relayreport/1.0.0',(protocal,conn) => {
                    pull(
                        conn,
                        pull.map((data) => {
                            return data.toString('utf8').replace('\n', '')
                        }),pull.drain((data) => {
                            // record to db 
                            if(typeof(data) == 'string'){
                                data = JSON.parse(data)
                            }

                            if(data.type == 'relayBeat'){
                                var updateObj = {}
                                updateObj.blockName = data.blockName
                                var date = new Date()
                                updateObj.timeStamp = date.valueOf()
                                relayByOhterNode[data.blockName] = updateObj
                                dbB.get(data.blockName,(err,value) => {
                                    if(err){
                                        console.error(err)
                                    }else{
                                        if(typeof(value) == 'string'){
                                            value = JSON.parse(value)
                                        }
                                        var date = new Date()
                                        value.unprotected.info.startTime = date.valueOf()
                                        dbB.put(value.unprotected.blockName,JSON.stringify(value),(err) => {
                                            if(err){
                                                console.error(err,value)
                                            }
                                            
                                        })
                                    }
                                })

                            }else if(data.type == 'selfLoop'){
                                var updateObj = {}
                                updateObj.blockName = data.blockName
                                var date = new Date()
                                updateObj.timeStamp = date.valueOf()
                                dbB.get(data.blockName,(err,value) => {
                                    if(err){
                                        console.error(err)
                                    }else{
                                        if(typeof(value) == 'string'){
                                            value = JSON.parse(value)
                                        }
                                        var date = new Date()
                                        value.unprotected.info.startTime = date.valueOf()
                                        dbB.put(value.unprotected.blockName,JSON.stringify(value),(err) => {
                                            if(err){
                                                console.error(err,value)
                                            }

                                            delete relayByOhterNode[data.blockName]
                                            
                                        })
                                    }
                                })

                            }else{
                                console.error('Unknown relay message type')
                            }
                            
                          

                        },function(err){
    
                            if(err)console.error(err);
                        })
                    )
                })

                // workreport
                node.handle('/cot/workreport/1.0.0',(protocal,conn) => {
                    debug('workreport comming');
                    pull(
                        conn,
                        pull.map((data) => {
                            return data.toString('utf8').replace('\n', '')
                        }),
                        pull.drain((data) => {
                           conn.getPeerInfo((err,info) => {
                               if(err){
                                   console.error(err)
                                   return
                               }
                                var tmp = JSON.parse(data);

                               if(initedWork.indexOf(tmp.workName) < 0){
                                   return
                               }


                                tmp.unprotected.status = 'preDone';
        
                                dbB.get(tmp.unprotected.blockName,(err,value) => {
                                    if(err){
        
                                    }
                                    if(typeof(value) == 'string'){
                                        value = JSON.parse(value)
                                    }
        
                                    var date = new Date()
                                    tmp.unprotected.info.timeCost = date.valueOf() - value.unprotected.info.startTime
                                    tmp.unprotected.slave = info.id.toB58String()
                                    dbB.put(tmp.unprotected.blockName,JSON.stringify(tmp),(err) => {
                                        if(err){
                                            console.error(err);
                                        }
                                     
                                    })
        
                                })
                            })
                            
                        },function(err){
    
                            if(err)console.error(err);
                        })
                        
                    )
            
                })


                //quit loop
                clearInterval(p2pHandle)
            }
            
        }, 1000);
       
        //launch clis


        //dividor

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
            updateWorkInfo();
        })

        ipcManager.addServerListenner('releaseSet',(data,socket) => {
            var obj = data
            if(typeof(obj) == 'string'){
                obj = JSON.parse(obj)
            }
            obj.repoPath = appPathReg
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
                    
                    if(value.unprotected.status == 'working'){
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
                            dbW.put(valueObj.workName,JSON.stringify(valueObj),(err) => {
                                if(err){
                                    console.error('ERROR: ',err);
                                }
                            })
                        })

                        value.unprotected.status = 'init'
                        var date = new Date()
                        value.unprotected.info.startTime = date.valueOf()
                        dbB.put(data,JSON.stringify(value),(err) => {
                            if(err){
                                console.error(err)
                            }
                        })

                    }else{
                        debug('Can not resend block '+tmp.unprotected.blockName+' with '+tmp.unprotected.status)
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

            removeElement(initedWork,data)
            globalGC(data)
            dbW.del(data,(err) => {
                if(err){
                    console.error(err);
                }
            })

            dbB.getAll((data2) => {
                for(var i=0;i<data2.length;i++){
                   
                    var tmp = data2[i].value;
                   
                    if(typeof(tmp) == 'string'){
                        tmp = JSON.parse(tmp);
                    }
                   
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
                    dbA.put(value.setName,JSON.stringify(value),(err) => {
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
            dbA.getAll((value) => {
                var retTmp = []
                value.forEach(element => {
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
                    ret.status = vObj.status
                    retTmp.push(ret)

                })
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

        ipcManager.addServerListenner('resetDividorStatus',(data,socket) => {
            
        })

        ipcManager.serve()
        

        dbW.getAll(function(data){

            data.forEach((element) => {
                var tmp = element.value
                if(typeof(tmp) == 'string'){
                    tmp = JSON.parse(tmp);
                }

                if(tmp.unprotected.status == 'working'){
                    tmp.unprotected.status = 'init';
                    debug('restart work '+tmp.workName)
                    dbW.put(tmp.workName,JSON.stringify(tmp),(err) => {
                        if(err){
                            console.error(err);
                        }
                    });
                }else if(tmp.unprotected.status == 'assiming'){
                    tmp.unprotected.status = 'waitAssimilate';
                    debug('restart work '+tmp.workName)
                    dbW.put(tmp.workName,JSON.stringify(tmp),(err) => {
                        if(err){
                            console.error(err);
                        }
                    });
                }else if(tmp.unprotected.status == 'validating'){
                    tmp.unprotected.status = 'preDone';
                    debug('restart work '+tmp.workName)
                    dbW.put(tmp.workName,JSON.stringify(tmp),(err) => {
                        if(err){
                            console.error(err);
                        }
                    });
                }else{

                }
               

            })

        })

        dbB.getAll(function(data){
            for(var i=0;i<data.length;i++){
                var tmp = data[i].value;
                if(typeof(tmp) == 'string'){
                    tmp = JSON.parse(tmp);
                }
                if(tmp.unprotected.status == 'sending'){
                    tmp.unprotected.status = 'init'
                    
                }else if(tmp.unprotected.status == 'validating'){
                    tmp.unprotected.status = 'preDone1'
                }

                var date = new Date()
                tmp.unprotected.info.startTime = date.valueOf()
                dbB.put(tmp.unprotected.blockName,JSON.stringify(tmp),(err) => {
                    if(err){
                        console.error(err);
                    }
                });
            }
        })

    }



    

    login(dataTmp){

        function doLogin(data){
            optAuth.path = '/userLogin'
            optAuth.method = 'POST';
            if(p2pNode == null || p2pNode._peerInfo == null){
                setTimeout(() =>{
                    doLogin(data)
                },500)
                return
            }
            data.device = p2pNode._peerInfo.id.toB58String();
            httpClinet.access(JSON.stringify(data),optAuth,function(res){ 
            
                res = JSON.parse(res);


                if(res.status == 'YES'){
                    conf.update('ownner',res.ownner)
                    conf.update('goldenKey',res.goldenKey)
                    switchOn()
                    ipcManager.serverEmit('login',res)
                    
                }else{
                    console.error(res)
                }
            });
        }

        doLogin(dataTmp)
       
        
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


    process(){

        

        function doRelayReport(message,nodeID){
            
            if(message == null || nodeID == null){
                console.error('Bad Paramater for doRelayReport')
                return
            }
            var node = p2pNode.libp2p
            if(typeof(nodeID) == 'string'){
                nodeID = PeerID.createFromB58String(nodeID)
            }
           
            node.dialProtocol(nodeID,'/cot/relayreport/1.0.0',(err,conn) => {
                if(typeof(message) == 'string'){

                }else{
                    message = JSON.stringify(message)
                }
                var p = Pushable();
                pull(p,conn)
                p.push(message)
                p.end()
                console.log('doRelayReport finish')
            })
           
        }

        function doRealy(){
            //workBuffer to workBufferToProcess or blockBuffer(realy)
            setInterval(() => {
                
                if(workBuffer.length > 0){
                    console.log('doRelay')
                    var bufTmp = workBuffer[0]
                    if(bufTmp != null){
                        workBuffer.splice(0,1)
                    }else{
                        return
                    }
                    
                    if(slaveModel == true){
                        if(isProcessing != true  && workBufferToProcess == null){
                            debug('not relay')
                            workBufferToProcess = bufTmp
                            if(typeof workBufferToProcess === 'string'){
                                throw new Error('catch a bad buffer')
                            }
                            
                           
                        }else{
                            //do relay
                            debug('do relay 1')
                            var tmp = bufTmp
                           
                            blockBuffer.push(tmp)
                            var tmpObj
                            if(typeof(tmp) == 'string'){
                                tmpObj = JSON.parse(tmp)
                            }else{
                                tmpObj = tmp
                            }
                            inRealy.push(tmpObj.unprotected.blockName)
                            debug('relay '+tmpObj.unprotected.blockName)
                        }
                    }else{
                        //do relay
                        debug('do relay 2')
                        var tmp = bufTmp
                        blockBuffer.push(tmp)
                        var tmpObj
                        if(typeof(tmp) == 'string'){
                            tmpObj = JSON.parse(tmp)
                        }else{
                            tmpObj = tmp
                        }
                        inRealy.push(tmpObj.unprotected.blockName)
                        debug('relay '+tmpObj.unprotected.blockName)
                    }
                }
                
            }, 1000);

            //no connected node, put blockBffer back
            setInterval(() => {
               
                if(blockBuffer.length > 0){
                    
                    var tmpObj = blockBuffer[0]
                    if(tmpObj != null){
                        blockBuffer.splice(0,1)
                    }else{
                        return
                    }
                    
                    
                    if(typeof(tmpObj) == 'string'){
                        tmpObj = JSON.parse(tmpObj)
                    }
                    if(inRealy.indexOf(tmpObj.unprotected.blockName) >= 0 && dappDownloading[tmpObj.unprotected.appSet] == null){ // it is a relay block and dapp not downloading now
                        var message = {}
                        message.blockName = tmpObj.unprotected.blockName
                        if(isProcessing != true && slaveModel == true && workBufferToProcess == null){ // if node is free and is on slave mode,  process block
                            debug('relay selfLoop ',tmpObj.unprotected.blockName)
                            workBufferToProcess = tmpObj
                            if(typeof workBufferToProcess === 'string'){
                                throw new Error('catch a bad buffer 2')
                            }
                            debug('remove relay register '+tmpObj.unprotected.blockName)
                            removeElement(inRealy,tmpObj.unprotected.blockName)
                            // send a message to ownner
                            message.type = 'selfLoop'
                            switchOn()
                        }else{//busy or not slave mode, keep it relaying and tell ownner i'm relaying so not resend blocks
                            message.type = 'relayBeat'
                            debug('put relay back 2')
                        
                            blockBuffer.push(tmpObj)
                            if(inRealy.indexOf(tmpObj.unprotected.blockName) < 0){
                                inRealy.push(tmpObj.unprotected.blockName)
                            }
                            doRelayReport(message,tmpObj.unprotected.ownner)
                        }

                    }else{ // blocks created by node self
                        debug('self created block!!!!!!!')
                        blockBuffer.push(tmpObj)
                    }

                   
                    
                }else{
                   
                    switchOn()
                    
                }

            }, 10000);

           

        }

        function mainProcess(){
            setInterval(() => {

                function acceptResult(blockArray,round){
                    if(round < blockArray.length){
    
                        var inBuffer = blockArray[round]
                        if(typeof(inBuffer) == 'string'){
                            inBuffer = JSON.parse(inBuffer)
                        }
                        if(inBuffer.unprotected.status != 'validated'){
                            console.error('NOT VALIDATED')
                            return acceptResult(blockArray,round+1)
                        }
                        var blockDim = inBuffer.unprotected.block.indexs;
                        var indexs = blockDim.split('_');
                        var total = inBuffer.unprotected.block.number
                       
                      
                        var blockIndex = inBuffer.unprotected.block.index;
                        var index = blockIndex.split('_');
                        if(index.length < 2){
                            console.err('bad block index');
                        }
    
                        dbW.get(inBuffer.workName,(err,value) => {
                            if(err){
                                console.error('ERROR: ',err);
                                return
                            }
                            var valueObj;
                            if(typeof(value) == 'string'){
                                valueObj = JSON.parse(value);
                            }else{
                                valueObj = value;
                            }
                            //debug(valueObj.unprotected.progress);
                            var pm = new ProgressManager(parseInt(indexs[0]),total,valueObj.unprotected.progress);
                           
                            pm.updateProgressWithIndex(parseInt(index[1]),parseInt(index[0]));
                           
                            valueObj.unprotected.info.progress = pm.getProgress();
                            valueObj.unprotected.progress = pm.mProgress;
                            var date = new Date()
                            valueObj.unprotected.info.timeCost = date.valueOf() - valueObj.unprotected.info.startTime

                            if(valueObj.unprotected.info.progress == 1){

                                valueObj.unprotected.status = 'waitAssimilate'
                                removeElement(initedWork,valueObj.workName)
                                
                            }


                            dbW.put(valueObj.workName,JSON.stringify(valueObj),(err) => {
                                if(err){
                                    console.error('ERROR: ',err);
                                }
                                
                                acceptResult(blockArray,round+1)
                                
                            })
                    
                           
                        })
    
    
                        inBuffer.unprotected.status = 'finish'
                        dbB.put(inBuffer.unprotected.blockName,JSON.stringify(inBuffer),(err) => {
                            if(err){
                                console.error('ERROR: ',err);
                            }
    
                            var infos = []
                            var infoTmp = {}
                            infoTmp.workName = inBuffer.workName
                            infoTmp.index = inBuffer.unprotected.block.index
                            infoTmp.startTime = inBuffer.unprotected.info.startTime
                            infoTmp.timeCost = inBuffer.unprotected.info.timeCost
                            infoTmp.status = 'finish'
                            infos.push(infoTmp)
                            ipcManager.serverEmit('updateBlockStatus',infos)
                           
                            
                        })
                    
                        
                    
                    
                        updateWorkInfo();
                        debug('close',inBuffer.unprotected.blockName);
    
    
                    }else{
                        return
                    }
                }
                dbW.getAll((valueW) => {
                    var workingTask = []
                    for(var i=0;i<valueW.length;i++){
                        var tmp = valueW[i].value
                        if(typeof(tmp) == 'string'){
                            tmp = JSON.parse(tmp)
                        }
                        if(tmp.unprotected.status == 'working'){
                            workingTask.push(tmp.workName)
                            
                        }
                    }
    
                    dbB.getAll((value) => {
                        var workBlocks = []
                        for(var i=0;i<value.length;i++){
                            var tmp = value[i].value
                            if(typeof(tmp) == 'string'){
                                tmp = JSON.parse(tmp)
                            }
                            if(workingTask.indexOf(tmp.workName) >= 0 && tmp.unprotected.status == 'validated'){
                                workBlocks.push(tmp)
                            }
                        }
                        if(workBlocks.length > 0){
                            debug('accept result !!!!!!')
                            acceptResult(workBlocks,0)
                        }
                        
                    })
    
                })
               
                
                
            }, 10000);
          
            //load block to buffer
            var queryLock = false
    
            setInterval(() => {
                
              
                if(queryLock){
                   
                    return
                }
                
                queryLock = true;
    
                dbW.getAll(function(data){
                   
                    for(var i=0;i<data.length;i++){
                        
                        var value = JSON.parse(data[i].value)
    
                        if(value.unprotected.status == 'init' || value.unprotected.status == 'working'){
    
                            value.unprotected.status = 'working'
                           
                            dbW.put(data[i].key,JSON.stringify(value),(err) => {
                                if(err != null){
                                    console.error(err);
                                }
                            })
                            if(initedWork.indexOf(value.workName) < 0){
                                initedWork.push(value.workName)
                            }
                               
                        }else{
                            
                        }
                    }
    
                   function min(a,b){
                       return a < b ? a : b
                   }
    
                   function max(a,b){
                       return a > b ? a : b
                   }
    
                    function constructIndexMap(idxX,idxY,tX,tY,total){
                       
                        var keyTmp = []
                        var startX = max(idxX -1,0)
                        var endX = min(idxX+1,tX-1)
                        var startY = max(idxY -1,0)
                        var endY = min(idxY+1,tY-1)
                        
                        for(var i=startX;i<=endX;i++){
                            for(var j=startY;j<=endY;j++){
                              
                                if(i==idxX && j==idxY){
    
                                }else{
                                    if(i*j < total){
                                        keyTmp.push('_'+i+'_'+j)
                                    }
                                }
                                
                            }
                        }
    
                        return keyTmp
                        
                    }
    
                    function checkNeighbourStatus(workName,keyTmp,round,value,data){
    
                        if(typeof(data) == 'string'){
                            data = JSON.parse(data)
                        }
                        if(round >= keyTmp.length){
                          
                            var relayFlag = false
                            if(relayByOhterNode[data.unprotected.blockName] == null){
                                relayFlag = false
                            }else{
                                var date = new Date()
                                if(date.valueOf() - relayByOhterNode[data.unprotected.blockName].timeStamp > 30000){
                                    relayFlag = false
                                }else{
                                    relayFlag = true
                                }
                            }
                            if(value / keyTmp.length >= 0.5 && !relayFlag &&  data.unprotected.status == 'working' && initedWork.indexOf(data.workName) > 0){
                                debug('Catch a bad block !!!!!!!!!!!!',data.unprotected.blockName,value/keyTmp.length)
                                data.unprotected.status = 'init'
                                var date = new Date()
                                data.unprotected.info.startTime = date.valueOf()

                                dbB.get(data.unprotected.blockName,(err,val2) => {
                                    if(err){

                                    }else{
                                        if(typeof(val2) == 'string'){
                                            val2 = JSON.parse(val2)
                                        }
                                        if(val2.unprotected.status == 'working'){
                                            dbB.put(data.unprotected.blockName,JSON.stringify(data),(err) => {
                                                if(err){
                                                    console.error(err);
                                                }
                                            })

                                            var blockStatus = {}
                                            blockStatus.workName = data.workName
                                            blockStatus.index = data.unprotected.block.index
                                            blockStatus.status = 'init'
                                            var infos = []
                                            infos.push(blockStatus)
                                            ipcManager.serverEmit('updateBlockStatus',infos)
                                   
                                        }
                                    }
                                })                              
                            }
        
                        }else{
                            var wName = workName+keyTmp[round]
                            
                            dbB.get(wName,(err,val) => {
                                if(err){
                                    console.error(err)
                                }else{
                                    if(typeof(val) == 'string'){
                                        val = JSON.parse(val)
                                    }
                                    var date = new Date()
                                    var currentCost = date.valueOf() - data.unprotected.info.startTime
    
                                    if((val.unprotected.status != 'init' && val.unprotected.status != 'working' && val.unprotected.status != 'sending') && currentCost - val.unprotected.info.timeCost > 5*60*1000 ){
                                        // debug('cost currentCost '+currentCost)
                                        // debug('cost neib timeCost '+val.unprotected.info.timeCost)
                                        value+=1
                                    }
                                }
    
                                checkNeighbourStatus(workName,keyTmp,round+1,value,data)
                            })
                        }
    
                    }
    
                    function getInitedBlocks(blockArrary,initedWork,count){
                       
                        if(count < blockArrary.length){
                            var value = JSON.parse(blockArrary[count].value);
                           
                            if(value.unprotected.status == 'init' && initedWork.indexOf(value.workName) >= 0){
                                value.unprotected.status = 'sending';
                                var date = new Date()
                                value.unprotected.info.startTime = date.valueOf()
                                dbB.put(value.unprotected.blockName,JSON.stringify(value),(err) => {
                                    if(err){
                                        console.error(err);
                                    }
                                })
                                debug('change status to sending')
                                
                                
                                if(initedWork.indexOf(value.workName) >= 0){
                                    debug('push '+value.unprotected.blockName);
                                    
                                    blockBuffer.push(value);
                                }
                               
                            
                            }else if(value.unprotected.status == 'working' && initedWork.indexOf(value.workName) >= 0 && relayByOhterNode[value.unprotected.blockName] == null){
                                // check bad block
                                var indexs = value.unprotected.block.index
                                var sp = indexs.split('_')
                                var fullIndex = value.unprotected.block.indexs
                                var sp2 = fullIndex.split('_')
                                var keyT = constructIndexMap(parseInt(sp[0]),parseInt(sp[1]),parseInt(sp2[0]),parseInt(sp2[1],value.unprotected.block.number))
                            
                                checkNeighbourStatus(value.workName,keyT,0,0,value)
                            }
                            getInitedBlocks(blockArrary,initedWork,count+1)
                        }else{
                            queryLock = false
                         
                            return
                        }
                        
                       
                       
                    }
                   
                    if(initedWork.length > 0){
                       
                        dbB.getAll(function(data2){
                         
                            getInitedBlocks(data2,initedWork,0)
                            
                        });
                    }else{
                       
                        queryLock = false
                    }
                    
        
                });
                
            }, 3000);
        
            var requestingLock = {}
           
        
            setInterval(() => {
               
                if(blockBuffer.length){
                    
                    var book = p2pNode._peerInfoBook
                    var node = p2pNode.libp2p
                    var peers = book.getAllArray();
                    if(peers.length == 0){
                        debug('No peers at now');
                    }else{
                        //debug('peer number '+peers.length)
                    }

                    peers.forEach((element) => {
                       
                        var peerIdStr = element.id.toB58String()
                        
                        var tmpP = blockBuffer[0]
                        if(typeof(tmpP) == 'string'){
                            tmpP = JSON.parse(tmpP)
                        }

                        if(peerIdStr == tmpP.unprotected.ownner){
                            
                            return
                        }
                        var date = new Date()
                        if(requestingLock[peerIdStr] != null && date.valueOf() - requestingLock[peerIdStr].timeStamp < 60000){ //60s
                           
                            return
                        }else{
                            var lockObj = {}
                            lockObj.timeStamp = date.valueOf()
                            requestingLock[peerIdStr] = lockObj
                            
                        }
                        //debug('dial '+peerIdStr)
                        node.dialProtocol(element,'/cot/workrequest/1.0.0',(err,conn) => {

                            if(err){
                               
                                delete requestingLock[element.id.toB58String()]
                                
                               
                                
                            }else{

                                delete requestingLock[element.id.toB58String()]
                                
                                pull(
                                    conn,
                                    pull.map((data) => {
                                        return data.toString('utf8').replace('\n', '')
                                    }),
                                    pull.drain(function(data){

                                        if(data == 'idel'){
                                            var p = Pushable();
                                            pull(p,conn);
                                            // clean work canceled or finished
                                            function selectActiveBuffer(){
                                                var tmpBuff = blockBuffer[0];
                                                if(tmpBuff != null){
                                                    blockBuffer.splice(0,1)
                                                }else{
                                                    return tmpBuff
                                                }
                                                
                                                if(tmpBuff != null && initedWork.indexOf(tmpBuff.workName) >= 0){
                        
                                                    return tmpBuff
                                                }else{
                                                    console.log(tmpBuff.workName+' was canceled or finished')
                                                    return selectActiveBuffer()
                                                }
                                            }     
                                            var tmp = selectActiveBuffer()
                                            if(tmp == null){
                                                debug('Empty blockBuffer')
                                                return
                                            }

                                          
                                            removeElement(inRealy,tmp.unprotected.blockName)
                                            p.push(JSON.stringify(tmp));
                                            
                                        // start data record
                                            tmp.unprotected.status = 'working';
                                            tmp.unprotected.slave = element.id.toB58String()
                                            var date = new Date()
                                            tmp.unprotected.info.startTime = date.valueOf()
                                            dbB.update(tmp.unprotected.blockName,JSON.stringify(tmp),(err) => {
                                                if(err){
                                                    console.error(err);
                                                }else{
                                                    //send a message to UI
                                                    var blockStatus = {}
                                                    blockStatus.workName = tmp.workName
                                                    blockStatus.index = tmp.unprotected.block.index
                                                    blockStatus.status = 'working'
                                                    var infos = []
                                                    infos.push(blockStatus)
                                                    ipcManager.serverEmit('updateBlockStatus',infos)
                                                    
                                                }
                                            });
    
                                            p.end()
                                        
                                        }else if(data == 'recived'){
                                            debug('peer recived buffer')
                                        }else if(data == 'busy'){
                                            debug('peer is busy now')
                                        }else{ 
                                            debug('unknown  peer status')
                                        }
            
                                    },function (err){
                                    
                                    })
                                )
                                
                            }

                        })

                    })
    
                }
        
                
                
            }, 5000)
        
            setInterval(() => {
                
                if(workBufferToProcess != null ){
                    isProcessing = true
                    //progess work
                    debug('task comming ');
                    var inBuffer = workBufferToProcess
                    var protectBuffer = inBuffer.protected
                    workBufferToProcess = null
                  
                    console.log('confirm 1')
                    var dataBuffer
                    var bstr =  base58.decode(conf.config.goldenKey);
                    if(typeof protectBuffer !== 'string'){
                        console.error(protectBuffer)
                        console.error(JSON.stringify(protectBuffer,null,'\t'))
                        dataBuffer = protectBuffer;
                    }else{
                        dataBuffer = base58.decode(protectBuffer);
                    }
                   
                    var protectedTmp = null

                    for(var i=0;i<dataBuffer.length;i+=512){
                        var len = 512
                        if(i+len > dataBuffer.length){
                            len = dataBuffer.length - i
                        }
                        var subBuffer = Buffer.alloc(len)
                        dataBuffer.copy(subBuffer,0,i,i+len)
                       
                         var tmp = cryptoOrigin.publicDecrypt(
                            {
                            key:bstr,
                            passphrase:'top secret',
                            padding: cryptoOrigin.constants.RSA_PKCS1_PADDING
                            },
                            subBuffer
                        )

                        if(protectedTmp == null){
                            protectedTmp = tmp
                        }else{
                            protectedTmp = Buffer.concat([protectedTmp,tmp])
                        }

                    }
                    console.log('confirm 3')
                    protectedTmp = protectedTmp.toString()
                    inBuffer.protected = JSON.parse(protectedTmp);
                    optAuth.path = '/confirmWork';
                    optAuth.method = 'POST';

                    debug('start to confirm task')
              
                    httpClinet.access(inBuffer.unprotected.blockName,optAuth,function(res){
                        if(res == null){
                            debug('access get error')
                            isProcessing = false
                            return
                        }
                        res = JSON.parse(res);
                        if(res.key != null){
     
                           
                            debug(JSON.stringify(inBuffer.protected ,null,'\t'))
                            //callback err,value
                            function computeWork(key,workBufr,callback){

                                //launch dapp cli & dapp
                                appManager.launchDapp(workBufr.unprotected.appSet,null,workBufr,(ret) => {

                                    console.log('DApp returned value',ret)
                                    //upload result to network
                                    if(typeof(ret) == 'string'){
                                        ret = JSON.parse(ret)
                                    }

                                    var fixedOutput = []
                                    var output = ret.protected.outputFiles
                                    output.forEach((element) => {
                                        if(element.path != null && element.path != ''){
                                            
                                            var inputBuffer = fs.readFileSync(Tools.fixPath(element.path))
                                            inputBuffer = Tools.compressionBuffer(inputBuffer)
                                            console.log('compression result done')
                                            p2pNode.add(inputBuffer,{ recursive: false , ignore: ['.DS_Store']},(err,res) => {
                                                if(err){
                                                    console.error(err)
                                                }
                                                console.log(res)
                                                res = res[0]
                                                fs.unlink(element.path,(err) => {
                                                    if(err){
                                                        console.error(err)
                                                    }
                                                })

                                                element.path = ''
                                                element.hash = res.hash
                                                fixedOutput.push(element)
                                                //gcManager.register(element.path,ret.workName+'_close')
                                                
                                            })
                                        }
                                    })


                                    var handleWait = setInterval(() => {
                                        if(fixedOutput.length == output.length){
                                            clearInterval(handleWait)
                                            console.log('ready to encrypto result')
                                            var keyBack = base58.decode(key);
                                            keyBack = keyBack.toString()
        
                                            var protecStr = JSON.stringify(ret.protected)
                                            var gcArray = []
                                            for(var p=0;p<ret.protected.outputFiles.length;p++){
                                                gcArray.push(ret.protected.outputFiles[p].path)
                                            }
                                            gcManager.register(gcArray,workBufr.workName+'_close')
                                            
                                            var enStr = null
                                            for(var i = 0; i< protecStr.length; i+=500){
                                                var len = 500
                                                if(i+len > protecStr.length){
                                                    len = protecStr.length - i
                                                }
                                                var subStr = protecStr.substr(i,len)
                                                var tmp = cryptoOrigin.privateEncrypt(
                                                    {
                                                        key:keyBack,
                                                        padding: cryptoOrigin.constants.RSA_PKCS1_PADDING
                                                    },
                                                    Buffer.from(subStr),
                                                )
                                                if(enStr == null){
                                                    enStr = tmp
                                                }else{
                                                    enStr = Buffer.concat([enStr,tmp])
                                                }
                                            }

                                            console.log('ready to encrypto result 2')
                                        
                                            enStr = base58.encode(enStr);
                                            enStr = enStr.toString();
                                            console.log('ready to encrypto result 3')
                                            workBufr.protected = enStr
                                            try{
                                                callback(null,workBufr)
                                            }catch(e){
                                                console.error(e)
                                            }
                                            
                                        }
                                        
                                    }, 1000);

                                   
                                })
                                console.log('launchDapp excuted')
                            }

                            function dealWithInputFile(protectInfo,inputBuffer,enKey){
                                var len = protectInfo.inputFiles.length
                                var currentCount = 0
                                protectInfo.inputFiles.forEach((element,index) => {
                                    
                                    var targetPath = inputTmpPath+'/'+inputBuffer.unprotected.blockName+'_'+ element.fileName
                                    debug('download input files '+element)
                                    p2pNode.get(element.key,(err,files) => {
                                        if(err){
                                            console.error(err)
                                            isProcessing = false
                                        }else{
                                            files.forEach((file) => {
                                                debug(file.path)
                                                var outBuffer = Tools.decompressionBuffer(file.content)
                                                fs.writeFileSync(targetPath,outBuffer)
                                                debug('Download file to '+targetPath)
                                                gcManager.register(targetPath,inputBuffer.workName+'_close')
                                                protectInfo.inputFiles[index].path = targetPath
                                                currentCount++
                                                console.log('download finish')
                                            })
                                        }
                                    })
                                    console.log('download finish 2')
                                })

                               var handle = setInterval(() => {
                                    if(len == currentCount){
                                        console.log('cancel handler')
                                        clearInterval(handle)
                                        inputBuffer.protected = protectInfo
                                        // compute work
                                        //do work!!!!!! need a executor and a call back function to do report work
                                        console.log('start compute')
                                        try{

                                            computeWork(enKey,inputBuffer,(err,value) => {
                                                if(err != null){
        
                                                }else{
                                                    exchangeResult(value)
                                                    console.log('end exchangeResult')
                                                }
        
                                                isProcessing = false
                                            })
                                            console.log('end of dealWithInputFile')

                                        }catch(e){
                                            console.error(e)
                                        }
                                        
                                             
                                    }
                                   
                               }, 1000);
                            }
                            try{
                                dealWithInputFile(inBuffer.protected,inBuffer,res.key)
                            }catch(e){
                                console.error(e)
                            }
                            
                            
                        }else{
                            debug('confirm get empty key')
                            isProcessing = false
                        }
                       
  
                    })
                    
                }else{
                   
                }

               
                
            }, 1000);
        }

        function assimResult(){

            setInterval(() => {

                dbW.getAll((value) => {
                    value.forEach((element) => {
                        element = element.value
                        if(typeof(element) == 'string'){
                            element = JSON.parse(element)
                        }
                       
                        if(element.unprotected.status == 'waitAssimilate'){
                            element.unprotected.status = 'assiming'
                            var date = new Date()
                            element.unprotected.info.startTime = date.valueOf()
                            dbW.put(element.workName, JSON.stringify(element),(err) => {
                                if(err){
                                    console.error(err)
                                }
                            })
                           
                            debug(' assimilate setName ',element)
                            appManager.launchAssimilator(element.unprotected.appSet,element,(err,res) => {

                                // copy final result to target path
                
                                // send one notification for file saved
                                if(err){
                                    
                                    console.error(err)
                                }else{
                                    element.unprotected.status = 'finish'
                                    var notif = {
                                        title: 'work complated',
                                        body: element.workName+' was complated'
                                    }
                                    ipcManager.serverEmit('notification',notif)
                                    
                                    globalGC(element.workName)
                                    dbW.put(element.workName,JSON.stringify(element),(err) => {
                                        if(err){
                                            console.error(err)
                                        }
                                    })
                                }

                               
                            })
                        }
                    })
                })
                
            }, 5000);
 
        }



        function resolveResult(){
            setInterval(() => {

                dbB.getAll((value) => {
                    for(var i=0;i<value.length;i++){
                        var tmp = value[i].value
                        if(typeof(tmp) == 'string'){
                            tmp = JSON.parse(tmp)
                        }
                        if(tmp.unprotected.status == 'preDone' || tmp.unprotected.status == 'preDone1'){
                            doResolveResult(tmp,(ret) => {
                                var infos = []
                                var infoTmp = {}
                                infoTmp.workName = ret.workName
                                infoTmp.index = ret.unprotected.block.index
                                infoTmp.startTime = ret.unprotected.info.startTime
                                infoTmp.timeCost = ret.unprotected.info.timeCost
                                infoTmp.status = 'preDone'
                                infos.push(infoTmp)
                                ipcManager.serverEmit('updateBlockStatus',infos)
                                //updage db
                                ret.unprotected.status = 'validating'
                                dbB.put(ret.unprotected.blockName,JSON.stringify(ret),(err) => {
                                    if(err){
                                        console.error(err)
                                    }
                                })
                                
                                function downloadResultToTmp(ret,callback){
                                   
                                    var outFiles = ret.protected.outputFiles
                                    var fixedOutFile = []
                                    outFiles.forEach((element) => {
                                        
                                        if(element.hash != null && element.hash != ''){
                                            p2pNode.get(element.hash,(err,files) => {
                                                if(err){
                                                    console.error(err)
                                                }else{
                                                    files.forEach((file) => {
                                                       
                                                        var targetPath = resultTmpPath+'/'+element.fileName
                                                        var inBuffer = Tools.decompressionBuffer(file.content)
                                                        fs.writeFile(targetPath, inBuffer, (err) => {
                                                            // throws an error, you could also catch it here
                                                            if(err){
                                                                console.error(err)
                                                            }else{
                                                                debug('Download '+file.path+' to '+targetPath)
                                                            }
                                                        })
                                                        
                                                        element.hash = ''
                                                        element.path = targetPath
                                                        fixedOutFile.push(element)
                                                        gcManager.register(targetPath,ret.workName+'_close')
                                                    })
                                                }
                                            })
                                        }
                                    })

                                    var loopCheckTime = 5000 // 5s
                                    var timeOutTry =  60 * 10 // 50 min will be timeout ( loopCheckTime * 60 * 10 )

                                   var handle = setInterval(() => {
                                        if(fixedOutFile.length == outFiles.length){
                                            clearInterval(handle)
                                            ret.protected.outputFiles = fixedOutFile
                                            callback(ret)
                                        }

                                        if(timeOutTry < 0){
                                            clearInterval(handle)
                                            delete ret.protected.outputFiles
                                            callback(ret)
                                        }

                                        timeOutTry--
                                        
                                    }, loopCheckTime);
                                }

                                downloadResultToTmp(ret,(fixedRet) => {
                                    appManager.launchValidator(fixedRet.unprotected.appSet,fixedRet)
                                })
                                // validate work
                                
                            })
                        }
                    }
                })

                
                
            }, 5000);
       }

        mainProcess()
        doRealy()
        resolveResult()
        assimResult()
       
        
        
    
    
    }
}



module.exports = NodeCore;























