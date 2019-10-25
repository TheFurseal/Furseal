
const Http = require('../common/httpClient.js')
const Tools = require('../common/tools.js')
const fs = require('fs')
const debug = require('debug')('cli:storeCli')
const pull = require('pull-stream')

const httpClinet = new Http()
var optStroe = {};
optStroe.port = 7334;
optStroe.hostname = 'peer1.cotnetwork.com';
optStroe.path = '/setAppSetInfo';
optStroe.method = 'POST';


var appRepo


class StoreCli{

    constructor(
        {
            parameter:param,
            p2pNode:p2pNode,
            appDB:db,
            downloadManager:dMgr
        }
    ){
       if(p2pNode == null){
            var err = Error('Empty p2p node!')
            console.error(err)
            return
        }
        this.p2pNode = p2pNode
        this.db = db
        this.param = param
        appRepo = param.repoPath
        if(!fs.existsSync(Tools.fixPath(appRepo))){
            fs.mkdirSync(Tools.fixPath(appRepo),
                { 
                    recursive: true 
                }
            )
        }
        this.appRepo = appRepo
        this.downloadManager = dMgr
    }

    getAppList(callback){
        optStroe.path = '/getAppSetInfo';
        var dbTmp = this.db
        httpClinet.access(null,optStroe,function(res){
            if(typeof(res) == 'string'){
                res = JSON.parse(res)
            }
            dbTmp.getAll((value) => {
                if(typeof(value) == 'string'){
                    value = JSON.parse(value)
                }
                var localKeyList = []
                for(var i = 0; i < value.length; i++){
                    localKeyList.push(value[i].key)
                }

                for(var i=0; i< res.length; i++){
                   // debug(res[i])
                   if(localKeyList.indexOf(res[i].key) >= 0){
                       var tmp = res[i].value
                       if(typeof(tmp) == 'string'){
                           tmp = JSON.parse(tmp)
                       }
                       tmp.local = true
                       res[i].value = JSON.stringify(tmp)
                   }
                   
                }

                callback(res)
            })
           
            

        })
    }

    upload(info){
        if(info == null){
            info = this.info
        }
        
        var p2pNode = this.p2pNode
        var db = this.db


        var count = 0
        var total = 3+info.apps.dapp.length
        var postData = {}
        postData.setName = info.setName
        postData.description = info.description
        postData.uploader = info.uploader
        postData.envriment = info.envriment
        postData.contact = info.contact
        postData.date = postData.date
        postData.apps = {}
        postData.apps.dapp = []
        postData.apps.validator = {}
        postData.apps.assimilator = {}
        postData.apps.dividor = {}

        var inBufferVali = fs.readFileSync(Tools.fixPath(info.apps.validator.path))
        inBufferVali = Tools.compressionBuffer(inBufferVali)
        //update via p2p
        p2pNode.add(inBufferVali,{ recursive: false , ignore: ['.DS_Store']},(err,res) => {
            if(err){
                console.error(err)
                return
            }
            debug(res)
            res = res[0]
            postData.apps.validator.url = res.hash
            postData.apps.validator.size = inBufferVali.length
            count++
        })

        postData.apps.validator.name = Tools.getAppName(info.apps.validator.path)
        postData.apps.validator.path = appRepo+'/'+postData.apps.validator.name
        Tools.copyFile(info.apps.validator.path,appRepo+'/'+postData.apps.validator.name)

        var inBufferDiv = fs.readFileSync(Tools.fixPath(info.apps.dividor.path))
        inBufferDiv = Tools.compressionBuffer(inBufferDiv)
        p2pNode.add(inBufferDiv,{ recursive: false , ignore: ['.DS_Store']},(err,res) => {
            if(err){
                console.error(err)
                return
            }
            debug(res)
            res = res[0]
            
            postData.apps.dividor.url = res.hash
            postData.apps.dividor.size = inBufferDiv.length
           
            count++
        })

        postData.apps.dividor.name = Tools.getAppName(info.apps.dividor.path)
        postData.apps.dividor.path = appRepo+'/'+postData.apps.dividor.name
        Tools.copyFile(info.apps.dividor.path,appRepo+'/'+postData.apps.dividor.name)

        var inBufferAss = fs.readFileSync(Tools.fixPath(info.apps.assimilator.path))
        inBufferAss = Tools.compressionBuffer(inBufferAss)
        p2pNode.add(inBufferAss,{ recursive: false , ignore: ['.DS_Store']},(err,res) => {
            if(err){
                console.error(err)
                return
            }
            debug(res)
            res = res[0]
            
            postData.apps.assimilator.url = res.hash
            postData.apps.assimilator.size = inBufferAss.length
            
            count++
        })

        postData.apps.assimilator.name = Tools.getAppName(info.apps.assimilator.path)
        postData.apps.assimilator.path = appRepo+'/'+postData.apps.assimilator.name
        Tools.copyFile(info.apps.assimilator.path,appRepo+'/'+postData.apps.assimilator.name)

        debug('dapp number ',info.apps.dapp)
        debug('dapp number '+info.apps.dapp.length)
        var targetReg = {}



        function addMulti(pathArry,countReg,resArry){
            if(countReg < pathArry.apps.dapp.length){
                var inBufferDapp = fs.readFileSync(Tools.fixPath(pathArry.apps.dapp[countReg].path))
                inBufferDapp = Tools.compressionBuffer(inBufferDapp)
                p2pNode.add(inBufferDapp,{ recursive: false , ignore: ['.DS_Store']},(err,res) => {
                    if(err){
                        console.error(err)
                        return
                    }
                   
                    res = res[0]
                    debug(res)
                    var item = {}
                    item.name = pathArry.apps.dapp[countReg].name
                    item.url = res.hash
                    item.size = inBufferDapp.length
                    item.path =  appRepo+'/'+item.name
                    item.target = pathArry.apps.dapp[countReg].target
                    resArry.push(item)
                    Tools.copyFile(pathArry.apps.dapp[countReg].path,appRepo+'/'+item.name)
                    count++
    
                    addMulti(pathArry,countReg+1,resArry)
                })
            }else{
                return
            }

        }

        addMulti(info,0,postData.apps.dapp)


        var handle = setInterval(() => {
                if(count == total){
                    debug(postData)
                    optStroe.path = '/setAppSetInfo'
                    httpClinet.access(JSON.stringify(postData),optStroe,function(res){
                        debug(res)
                        if(typeof(res) == 'string'){
                            res = JSON.parse(res)
                        }
                        
                        postData.key = res.key
                        postData.status = 'inactive'
                        db.put(postData.setName,postData,(err) => {
                            if(err){
                                console.error(err)
                            }
                        })

                    })
                    clearInterval(handle)
                }
        }, 3000);

    }

    getLocalList(callback){
        this.db.getAll((value) => {
            callback(value)
        })
    }

    getDapp(setName,callback){
        var downloadManager = this.downloadManager
        var appRepoTmp = this.appRepo 
        var p2pNode =  this.p2pNode
        var db = this.db
        if(setName == null){
            debug('Empty setName')
        }
        var postData = {}
        optStroe.path = '/getDapp'
        postData.target = Tools.getPlatformInfo()+'-'+Tools.getArchInfo()
        postData.setName = setName

        httpClinet.access(JSON.stringify(postData),optStroe,function(res){
            if(typeof(res) == 'string'){
                res = JSON.parse(res)
            }
            //download dapp
            var totalBytesDapp = 0
            pull(
                p2pNode.catPullStream(res.apps.dapp[0].url),
                pull.through(dataIn => {
                    totalBytesDapp += dataIn.length
                    var status = {}
                    status.Total = res.apps.dapp[0].size
                    status.recived = totalBytesDapp
                    downloadManager.update(status)
                }),
                pull.collect((err,buf) => {
                    if(err){
                        callback(new Error('donwnload dapp filed'),res) 
                    }else{
                        var targetPath = appRepoTmp+'/'+res.apps.dapp[0].name
                        res.apps.dapp[0].path = targetPath
                        var inBuffer = Tools.decompressionBuffer(Buffer.concat(buf))
                        fs.writeFile(targetPath, inBuffer,{mode:0o766}, (err) => {
                            // throws an error, you could also catch it here
                            if(err){
                                console.error(err)
                            }else{
                                debug('Download '+res.apps.dapp[0].url+' to '+targetPath)
                                db.put(setName,res,(err) => {
                                    if(err){
                                        console.error(err)
                                    }
                                    callback(null,res)
                                })
                            }
                        })
                    }
                })
            )
        })

    }

    getAppSet(setName,callback){
        var downloadManager = this.downloadManager
        var appRepoTmp = this.appRepo 
        var p2pNode = this.p2pNode
        var db = this.db
        if(setName == null){
            debug('Empty setName')
        }
        var postData = {}
        optStroe.path = '/getAppSet'
        postData.target = Tools.getPlatformInfo()+'-'+Tools.getArchInfo()
        postData.setName = setName
        var steps = 0

        httpClinet.access(JSON.stringify(postData),optStroe,function(res){
            
            if(typeof(res) == 'string'){
                res = JSON.parse(res)
            }
            debug(res)
            if(res.error == null){

                db.put(res.setName,JSON.stringify(res),(err) => {
                    if(err){
                        console.error(err)
                    }
                })
                
                debug('start to get '+res.apps.assimilator.url)

                var totalBytesAs = 0
                pull(
                    p2pNode.catPullStream(res.apps.assimilator.url),
                    pull.through(dataIn => {
                        totalBytesAs += dataIn.length
                        var status = {}
                        status.Total = res.apps.assimilator.size
                        status.recived = totalBytesAs
                        downloadManager.update(status)
                    }),
                    pull.collect((err,buf) => {
                        if(err){
                            console.error(err)
                        }else{
                            files.forEach((file) => {
                                var targetPath = appRepoTmp+'/'+res.apps.assimilator.name
                                var inBuffer = Tools.decompressionBuffer(Buffer.concat(buf))
                                fs.writeFile(targetPath, inBuffer,{mode:0o766}, (err) => {
                                    // throws an error, you could also catch it here
                                    if(err){
                                        console.error(err)
                                    }else{
                                        debug('Download '+res.apps.assimilator.url+' to '+targetPath)
                                        steps++
                                    }
                                })
                            })  
                        }
                    })
                )
                
                var totalBytesVa = 0
                pull(
                    p2pNode.catPullStream(res.apps.validator.url),
                    pull.through(dataIn => {
                        totalBytesVa += dataIn.length
                        var status = {}
                        status.Total = res.apps.validator.size
                        status.recived = totalBytesVa
                        downloadManager.update(status)
                    }),
                    pull.collect((err, buf) => {
                        if(err){
                            console.error(err)
                        }else{
                            var targetPath = appRepoTmp+'/'+res.apps.validator.name
                            var inBuffer = Tools.decompressionBuffer(Buffer.concat(buf))
                            fs.writeFile(targetPath, inBuffer,{mode:0o766}, (err) => {
                                // throws an error, you could also catch it here
                                if(err){
                                    console.error(err)
                                }else{
                                    debug('Download '+res.apps.validator.url+' to '+targetPath)
                                    steps++
                                }
                            })
                        }
                    })
                )
                
                var totalBytesDi = 0
                pull(
                    p2pNode.catPullStream(res.apps.dividor.url),
                    pull.through(dataIn => {
                        totalBytesDi += dataIn.length
                        var status = {}
                        status.Total = res.apps.dividor.size
                        status.recived = totalBytesDi
                        downloadManager.update(status)
                    }),
                    pull.collect((err,buf) => {
                        if(err){
                            console.error(err)
                        }else{
                            var targetPath = appRepoTmp+'/'+res.apps.dividor.name
                            var inBuffer = Tools.decompressionBuffer(Buffer.concat(buf))

                            fs.writeFile(targetPath, inBuffer,{mode:0o766}, (err) => {
                                // throws an error, you could also catch it here
                                if(err){
                                    console.error(err)
                                }else{
                                    debug('Download '+res.apps.dividor.url+' to '+targetPath)
                                    steps++
                                }
                            })
                        }
                    })
                )

                var arch = Tools.getArchInfo()
                var platform = Tools.getPlatformInfo()
                var url = ''
                var name = ''
                var size = 0
                debug(res.apps.dapp)
                for(var i=0;i<res.apps.dapp.length;i++){
                    var target = res.apps.dapp[i].target
                    debug(target)
                    var sp = target.split('-')
                    if(Tools.matchOS(sp[0],platform) && Tools.matchArch(sp[1],arch)){
                        url = res.apps.dapp[i].url
                        name = res.apps.dapp[i].name
                        size = res.apps.dapp[i].size
                        break
                    }
                }

                if(url != ''){

                    var totalBytesDA = 0
                    pull(
                        p2pNode.catPullStream(url),
                        pull.through(dataIn => {
                            totalBytesDA += dataIn.length
                            var status = {}
                            status.Total = size
                            status.recived = totalBytesDA
                            downloadManager.update(status)
                        }),
                        pull.collect((err,buf) => {
                            if(err){
                                console.error(err)
                            }else{
                                var targetPath = appRepoTmp+'/'+name
                                var inBuffer = Tools.decompressionBuffer(Buffer.concat(buf))
                                fs.writeFile(targetPath, inBuffer,{mode:0o766}, (err) => {
                                    // throws an error, you could also catch it here
                                    if(err){
                                        console.error(err)
                                    }else{
                                        debug('Download '+url+' to '+targetPath)
                                    }
                                })
                            }
                        })
                    )
                   
                }else{
                    console.error('can not find dapp for '+platform+'-'+arch+' from app set '+res.setName)
                }

                var handle = setInterval(() => {
                    if(steps >= 3){
                        clearInterval(handle)
                        callback(res)
                    }
                    debug('Waiting getAppset download process, current finished '+steps)
                }, 3000);
                

            }else{
                callback() 
            }
        })
    }
}

module.exports = StoreCli