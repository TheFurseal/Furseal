var maxDim = 3

const client = require('../common/httpClient.js')
var base58 = require('bs58')
const ProgressManager = require('../common/progressManager.js')
const AppCommon = require('../common/appCommon.js')
const IPCManager = require('../common/IPCManager.js')
const debug = require('debug')('cli:dividorCli')
const fs = require('fs')
const Tools = require('../common/tools.js')

var blockDB;
var workDB;
var workInRegister = {}
var configure

const httpClinet = new client()
var urlBase = 'peer1.cotnetwork.com';
var optAuth = {};
optAuth.port = 7333;
optAuth.hostname = urlBase;
optAuth.path = '/registerBlock';
optAuth.method = 'POST';


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
        var p2pNodeTmp = this.p2pNode
        this.ipcManager.createClient({})
        this.ipcManager.addClientListenner('request',(data,socket) => {
            debug('revice request',data)
            doDivide(data,p2pNodeTmp)
        })

        function doDivide(workInfo,node){
            dealWithInputs(workInfo,node)
        }

        function dealWithInputs(workInfo,node){
            if(typeof(workInfo) == 'string'){
                workInfo = JSON.parse(workInfo)
            }

            var owner = node._peerInfo.id.toB58String()

            if(workInRegister[workInfo.workName] == null){
                var wrapper = {}
                wrapper.total = workInfo.unprotected.block.number
                wrapper.current = 0
                wrapper.publicFiles = {}
                workInRegister[workInfo.workName] = wrapper
            }

            var totalFileNumber = workInfo.protected.inputFiles.length
            var currentFileNumber = 0
           
            workInfo.protected.inputFiles.forEach((element,index) => {
                if(element.url != null){
                    var pubValue = findPublic(workInfo.workName,element.url)
                    if(element.type == 'public' && pubValue != null){

                        if(pubValue.value == 'x'){
                            setTimeout(() => {
                                debug('add not ready for '+element.url+', retry!!!!!')
                                dealWithInputs(workInfo,node)
                            }, 5000);
                            return
                        }
                        
                        //
                        currentFileNumber++
                        workInfo.protected.inputFiles[index].url = pubValue.value
                        workInfo.protected.inputFiles[index].key = pubValue.value
                        workInfo.protected.inputFiles[index].hash = pubValue.value
                        workInfo.protected.inputFiles[index].size = pubValue.size

                    }else{
                        var buf = fs.readFileSync(Tools.fixPath(element.url))
                        debug('start to compression buffer '+element.url)
                        buf = Tools.compressionBuffer(buf)
                        debug('compression buffer done')

                        //make a templary value
                        workInRegister[workInfo.workName].publicFiles[element.url] = {}
                        workInRegister[workInfo.workName].publicFiles[element.url].value = 'x'
                        
                        node.add(buf,{ recursive: false , ignore: ['.DS_Store']},(err,resInfo) => {
                            if(err){
                               console.error(err)
                            }else{
                                resInfo = resInfo[0]
                                var urlTmp = element.url
                                workInfo.protected.inputFiles[index].url =  resInfo.hash
                                workInfo.protected.inputFiles[index].hash = resInfo.hash
                                workInfo.protected.inputFiles[index].key =  resInfo.hash
                                workInfo.protected.inputFiles[index].size = buf.length
                                currentFileNumber++
                                if(element.type == 'public'){
                                    //update key-value
                                    var tmpKV = {}
                                    tmpKV.value = resInfo.hash
                                    tmpKV.size = buf.length
                                    workInRegister[workInfo.workName].publicFiles[urlTmp] = tmpKV
                                    debug('reset value for '+urlTmp)
                                }
                                gcMrg.register(resInfo.hash,workInfo.workName+'_close')
                            }
                        })
                    }
                    //waitting
                    var handler = setInterval(() => {
                        if(totalFileNumber == currentFileNumber){
                            clearInterval(handler)
                            if(workInRegister[workInfo.workName].current == 0){
                                debug('register work')
                                workInfo.unprotected.owner = owner
                                registerBlock(workInfo,true)
                            }else{
                                workInfo.unprotected.owner = owner
                                debug('register block')
                                registerBlock(workInfo)
                            }
                            workInRegister[workInfo.workName].current++
                            //register work(block)
                        }
                    }, 100);
                }
            })
        }

        function findPublic(workName,key){
            if(workInRegister[workName].publicFiles[key] != null){
                return workInRegister[workName].publicFiles[key]
            }else{
                return null
            }
 
         }
 
 
         function registerBlock(workInfo,isFirst){
             if(isFirst == null){
                 isFirst = false
             }
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
            debug('set pid '+pid)
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