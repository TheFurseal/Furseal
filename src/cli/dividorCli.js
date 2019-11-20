const client = require('../common/httpClient.js')
const ProgressManager = require('../common/progressManager.js')
const AppCommon = require('../common/appCommon.js')
const IPCManager = require('../common/IPCManager.js')
const debug = require('debug')('cli:dividorCli')
const fs = require('fs')
const Tools = require('../common/tools.js')

var blockDB;
var workDB;
var configure
var blockCounts = {}
var owner

var urlBase = 'peer1.cotnetwork.com';
const httpClinet = new client()
var urlBase = urlBase
var optAuth = {};
optAuth.port = 7333;
optAuth.hostname = urlBase;
optAuth.path = '/registerBlock';
optAuth.method = 'POST';

var optFS = {}
optFS.port = 7335
optFS.hostname = urlBase
optFS.method = 'POST'


class DividorCli{
    constructor(
        {
            paramater:param,
            blockDB:dbB,
            workDB:dbW,
            appDB:appDB,
            p2pNode:node,
            configure:conf,
            gcManager:gcMrg
        }
    ){
        debug('Create dividor cli')
        configure = conf
        this.ipcManager = new IPCManager()
        if(dbB == null){
           var err = new Error('No block database');
           console.error(err);
        }else{
            blockDB = dbB;
        }

        if(gcMrg == null){
            console.error('GCManager is empty')
        }

        if(dbW == null){
            var err = new Error('No work database');
            console.error(err);
        }else{
            workDB = dbW;
        }

        if(node == null){
            var err = new Error('No p2p node');
            console.error(err);
        }else{
            this.p2pNode = node;
        }

        if(param == null){
            var err = new Error('No file app param for dividor');
            console.error(err);
        }else{
        }

        var pa = this
        param.id = param.setName+'_dividor'
        param.type = 'dividor'
        this.param = param
        this.appCommon = new AppCommon(param,appDB)
        this.ipcManager.createClient({})
        this.ipcManager.addClientListenner('request',(data,socket) => {
           
            if(typeof(data) == 'string'){
                data = JSON.parse(data)
            }
            pa.ipcManager.clientEmit('feedback',data.unprotected.blockName)
            if(blockCounts[data.workName] == null){
                blockCounts[data.workName] = {}
                blockCounts[data.workName].total = data.unprotected.block.number
            }
            uploadInputFiles(data)
        })

      

        function uploadInputFiles(workInfo){
            var globalCount = workInfo.protected.inputFiles.length
            workInfo.protected.inputFiles.forEach((element,index) => {
                if(element.type == 'public'){
                    if(blockCounts[workInfo.workName].publicFiles == null){
                        blockCounts[workInfo.workName].publicFiles = {}
                        
                        var filePath = element.path ? element.path : element.url
                        var buf = fs.readFileSync(Tools.fixPath(filePath))
                        debug('start to compression buffer '+filePath)
                        buf = Tools.compressionBuffer(buf)
                        debug('compression buffer done')
                        pa.p2pNode.add(buf,{ recursive: false , ignore: ['.DS_Store']},(err,resInfo) => {
                            if(err){
                            console.error(err)
                            }else{
                                resInfo = resInfo[0]
                                blockCounts[workInfo.workName].publicFiles[element.name] = {}
                                blockCounts[workInfo.workName].publicFiles[element.name].url = resInfo.hash
                                blockCounts[workInfo.workName].publicFiles[element.name].size = buf.length
                                
                                gcMrg.register(resInfo.hash,workInfo.workName+'_close')
                                var postPair = {}
                                postPair.workName = workInfo.workName
                                postPair.key = resInfo.hash
                                optFS.path = '/uploadFile'
                                httpClinet.access(JSON.stringify(postPair),optFS,(rest) => {
                                    if(rest.error){
                                        console.error(rest.error)
                                    }
                                })
                                if(--globalCount == 0){
                                    registerBlock(workInfo,true)
                                    if(--blockCounts[workInfo.workName].total == 0){
                                        blockCounts[workInfo.workName] = null
                                    }
                                }
                            }
                        })
                    }else{
                        var handle = setInterval(() => {
                            if(blockCounts[workInfo.workName].publicFiles != null && blockCounts[workInfo.workName].publicFiles[element.name] != null){
                                clearInterval(handle)
                                workInfo.protected.inputFiles[index].url = blockCounts[workInfo.workName].publicFiles[element.name].url
                                workInfo.protected.inputFiles[index].hash = blockCounts[workInfo.workName].publicFiles[element.name].url
                                workInfo.protected.inputFiles[index].path = null
                                workInfo.protected.inputFiles[index].size = blockCounts[workInfo.workName].publicFiles[element.name].size
                                if(--globalCount == 0){
                                    registerBlock(workInfo)
                                    if(--blockCounts[workInfo.workName].total == 0){
                                        blockCounts[workInfo.workName] = null
                                    }
                                }
                            }
                        }, 500);
                    }
                    

                }else{
                    var filePath = element.path ? element.path : element.url
                    var buf = fs.readFileSync(Tools.fixPath(filePath))
                    debug('start to compression buffer '+filePath)
                    buf = Tools.compressionBuffer(buf)
                    debug('compression buffer done')
                    pa.p2pNode.add(buf,{ recursive: false , ignore: ['.DS_Store']},(err,resInfo) => {
                        if(err){
                        console.error(err)
                        }else{
                            resInfo = resInfo[0]
                            var urlTmp = element.url
                            workInfo.protected.inputFiles[index].hash =  resInfo.hash
                            workInfo.protected.inputFiles[index].url =  resInfo.hash
                            workInfo.protected.inputFiles[index].path =  resInfo.hash
                            workInfo.protected.inputFiles[index].size = buf.length
                            
                            gcMrg.register(resInfo.hash,workInfo.workName+'_close')
                            var postPair = {}
                            postPair.workName = workInfo.workName
                            postPair.key = resInfo.hash
                            optFS.path = '/uploadFile'
                            httpClinet.access(JSON.stringify(postPair),optFS,(rest) => {
                                if(rest.error){
                                    console.error(rest.error)
                                }
                            })
                            if(--globalCount == 0){
                                registerBlock(workInfo)
                                if(--blockCounts[workInfo.workName].total == 0){
                                    blockCounts[workInfo.workName] = null
                                }
                            }
                        }
                    })
                }
            })
        }
 
 
         function registerBlock(workInfo,isFirst){
            if(owner == null){
                owner = pa.p2pNode._peerInfo.id.toB58String()
            }
            workInfo.unprotected.owner = owner
            workInfo.userID = configure.config.id
 
            httpClinet.access(JSON.stringify(workInfo),optAuth,function(res){
                if(res == null){
                    return ;
                }
                var resObj = JSON.parse(res);
                if(resObj.status == 'unregisted'){
                    console.error('Unregisted account!!!!')
                    return;
                }else{
                    
                    if(resObj.unprotected.owner == null){
                        debug('UN_REGISTED_ACCOUNT!');
                        return;
                    }
                    resObj.unprotected.status = 'init';
        
                    //calculate total number
                    var indexTmp = resObj.unprotected.block.indexs
                    var sp = indexTmp.split('_');
                    var total = 1;
                    for(var i=0;i<sp.length;i++){
                        total*= parseInt(sp[i])
                    }

                    resObj.resolveKey = configure.encrypto(resObj.resolveKey)

                    if(isFirst){
                        var pm = new ProgressManager(parseInt(sp[0]),total);
                        resObj.unprotected.progress = pm.mProgress;
                        workDB.put(resObj.workName,resObj,function(err){
                            if(err){
                                console.error('ERROR: ',err);
                            }
                        })
                    }

                    blockDB.put(resObj.unprotected.blockName,resObj,function(err){
                        if(err){
                            console.error('ERROR: ',err);
                        }else{
                            pa.callback(resObj)
                        }
                    })
                    debug('register work done');
                }
            });
         }
    }

    start(callback){
        debug('Dividor cli start')
        this.callback = callback
        var pa = this
        this.appCommon.start((pid) => {
            pa.pid = pid
    
        })
        this.ipcManager.connect(this.param.id)
    }

    stop(){
       this.appCommon.stop()
       this.ipcManager.clientDisconnect()
    } 
}

module.exports = DividorCli;