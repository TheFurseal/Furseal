const Http = require('../common/httpClient.js')
const Tools = require('../common/tools.js')
const fs = require('fs')
const debug = require('debug')('cli:storeCli')
const pull = require('pull-stream')

var urlBase = 'peer1.cotnetwork.com';
const httpClinet = new Http()
var optStroe = {};
optStroe.port = 7334;
optStroe.hostname = urlBase
optStroe.path = '/setAppSetInfo';
optStroe.method = 'POST';

var optFS = {}
optFS.port = 7335
optFS.hostname = urlBase
optFS.method = 'POST'


var appRepo

function validApplication(info) {
    if(info == null){
        return false
    }
    if(info.files == null || info.files.length < 1){
        return false
    }
    if(info.files.length > 1 && info.main == null){
        return false
    }
    for(var i=0;i<info.files.length;i++){
        if(info.files[i].name == null || (info.files[i].path == null && info.files[i].url == null) || info.files[i].target == null){
            return false
        }
    }
    return true
}

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
        if(process.platform == 'win32'){
            process.env.PATH = process.env.PATH+";"+appRepo
        }else{
            process.env.PATH = process.env.PATH+":"+appRepo
        }
        
    }

    upload(info,cb){
        debug(info)
        //param check
        var p2pNode = this.p2pNode
        var db = this.db
        if(cb == null){
            cb = debug
        }
        if(info == null || info.setName == null || info.version == null || info.applications == null){
            cb(new Error('Bad app set infomation'),null)
            return
        }

        var postData = JSON.parse(JSON.stringify(info))
        //check applications value and upload
        var keys = Object.keys(info.applications)
        var globalCount = keys.length
        var date = new Date()
        keys.forEach(key => {
            if(validApplication(postData.applications[key])){
                var count = postData.applications[key].files.length
                postData.applications[key].files.forEach((elem,index) => {
                    var inBuffer= fs.readFileSync(Tools.fixPath(elem.path))
                    inBuffer = Tools.compressionBuffer(inBuffer)
                    var sp1 = elem.target.split('-')
                    
                    if(Tools.matchOS(sp1[0],process.platform) && Tools.matchArch(sp1[1],process.arch)){
                        var targetPath = appRepo+'/'+elem.name+'_'+date.valueOf()
                        if(process.platform == 'win32'){
                            targetPath = targetPath+'.exe'
                        }
                        fs.copyFile(elem.path,targetPath,(err) => {
                            if(err){
                                console.error(err)
                            }
                        })
                        info.applications[key].files[index].path = targetPath
                    }else{
                        debug('Skip '+elem.path+' : '+elem.target)
                    }
                    
                    p2pNode.add(inBuffer,{ recursive: false , ignore: ['.DS_Store']},(err,res) => {
                        if(err){
                            cb(err)
                        }else{
                            // signal to file cluster
                            var postPair = {}
                            postPair.workName = info.setName
                            postPair.key = res[0].hash
                            optFS.path = '/uploadFile'
                            httpClinet.access(JSON.stringify(postPair),optFS,(rest) => {
                                if(rest.error){
                                    console.error(rest.error)
                                }
                            })
                            // uodate info
                            elem.path = null
                            elem.url = res[0].hash
                            elem.size = inBuffer.length
                            postData.applications[key].files[index] = elem
                            if(--count == 0){
                                if(--globalCount == 0){
                                    optStroe.path = '/setAppSetInfo'
                                    httpClinet.access(JSON.stringify(postData),optStroe,function(res){
                                        debug(res)
                                        if(typeof(res) == 'string'){
                                            res = JSON.parse(res)
                                        }
                                        
                                        info.key = res.key
                                        info.status = 'inactive'
                                        db.put(info.setName,info,(err) => {
                                            if(err){
                                                console.error(err)
                                            }
                                            debug('record appset info to db')
                                            debug(JSON.stringify(info,'\t'))
                                        })
                                        cb(null,info)
                                    })
                                }
                            }
                        }
                    })
                })
                
            }else{
                cb(new Error('invalid applications'))
            }
        })
    }

    getDApp(setName,cb){
        if(cb == null){
            cb = debug
        }
        var downloadManager = this.downloadManager
        var appRepo = this.appRepo 
        var p2pNode =  this.p2pNode
        var db = this.db
        if(setName == null){
            cb(new Error('Empty setName'))
            return
        }
        var postData = {}
        optStroe.path = '/getDapp'
        postData.target = Tools.getPlatformInfo()+'-'+Tools.getArchInfo()
        postData.setName = setName
        httpClinet.access(JSON.stringify(postData),optStroe,function(res){
            if(typeof(res) == 'string'){
                res = JSON.parse(res)
            }
            if(res.error != null){
                cb(res.error)
                return
            }
            //download dapp
            res.applications.dapp.files.forEach((elem,index) => {
                var totalBytesDapp = 0
                pull(
                    p2pNode.catPullStream(elem.url),
                    pull.through(dataIn => {
                        totalBytesDapp += dataIn.length
                        var status = {}
                        status.total = elem.size
                        status.recived = totalBytesDapp
                        var date = new Date()
                        status.timeStamp = date.valueOf()
                        status.fileName = elem.name
                        downloadManager.update(status)
                    }),
                    pull.collect((err,buf) => {
                        if(err){
                            cb(err) 
                        }else{
                            var date = new Date()
                            var targetPath = appRepo+'/'+elem.name+'_'+date.valueOf()
                            if(process.platform == 'win32'){
                                targetPath = targetPath+'.exe'
                            }
                            var inBuffer = Tools.decompressionBuffer(Buffer.concat(buf))
                            fs.writeFile(targetPath, inBuffer,{mode:0o766}, (err) => {
                                // throws an error, you could also catch it here
                                if(err){
                                    cb(err)
                                }else{
                                    debug('Download '+elem.url+' to '+targetPath)
                                    
                                    p2pNode.pin.add(elem.url, (err) => {
                                        if(err){
                                            console.error(err)
                                        }
                                    })
                                    //reset info
                                    res.applications.dapp.files[index].url = null
                                    res.applications.dapp.files[index].path = targetPath
                                    db.put(setName,res,(err) => {
                                        if(err){
                                            console.error(err)
                                        }
                                        cb(null,res)
                                    })
                                    
                                }
                            })
                        }
                    })
                )

            })
        })
    }

    getAppList(callback){
        optStroe.path = '/getAppSetInfo';
        var dbTmp = this.db
        httpClinet.access(null,optStroe,function(res){
            console.log(res)
            if(typeof(res) == 'string'){
                res = JSON.parse(res)
            }
            console.log(res)
            dbTmp.getAll((value) => {
                if(typeof(value) == 'string'){
                    value = JSON.parse(value)
                }
                var localKeyList = []
                for(var i = 0; i < value.length; i++){
                    if(value[i].applications.dividor != null){
                        localKeyList.push(value[i].key)
                    }
                    
                }
                for(var i=0; i< res.length; i++){
                   // debug(res[i])
                   if(localKeyList.indexOf(res[i].key) >= 0){
                       var tmp = res[i].value
                       console.log(tmp)
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

    getLocalList(callback){
        this.db.getAll((value) => {
            callback(value)
        })
    }

    getAppSet(setName,cb){
        if(cb == null){
            cb = debug
        }
        var downloadManager = this.downloadManager
        var appRepo = this.appRepo 
        var p2pNode = this.p2pNode
        var db = this.db
        if(setName == null){
            cb(new Error('Empty setName'))
        }
        var postData = {}
        optStroe.path = '/getAppSet'
        postData.target = Tools.getPlatformInfo()+'-'+Tools.getArchInfo()
        postData.setName = setName
        httpClinet.access(JSON.stringify(postData),optStroe,(res) => {
            if(typeof(res) == 'string'){
                res = JSON.parse(res)
            }
            if(res.error == null){
                var keys = Object.keys(res.applications)
                var globalCount = keys.length
                keys.forEach( key => {
                    if(validApplication(res.applications[key])){
                        var count = res.applications[key].files.length
                        res.applications[key].files.forEach((elem,index) => {
                            var totalBytesAs = 0
                            pull(
                                p2pNode.catPullStream(elem.url),
                                pull.through(dataIn => {
                                    totalBytesAs += dataIn.length
                                    var status = {}
                                    status.total = elem.size
                                    status.recived = totalBytesAs
                                    var date = new Date()
                                    status.timeStamp = date.valueOf()
                                    status.fileName = elem.name
                                    downloadManager.update(status)
                                }),
                                pull.collect((err,buf) => {
                                    if(err){
                                        console.error(err)
                                    }else{
                                        var date = new Date()
                                        var targetPath = appRepo+'/'+elem.name+'_'+date.valueOf()
                                        if(process.platform == 'win32'){
                                            targetPath = targetPath+'.exe'
                                        }
                                        var inBuffer = Tools.decompressionBuffer(Buffer.concat(buf))
                                        fs.writeFile(targetPath, inBuffer,{mode:0o766}, (err) => {
                                            // throws an error, you could also catch it here
                                            if(err){
                                                console.error(err)
                                            }else{
                                                debug('Download '+elem.url+' to '+targetPath)
                                            }
                                            p2pNode.pin.add(elem.url, (err) => {
                                                if(err){
                                                    console.error(err)
                                                }
                                            })
                                            // rest info
                                            res.applications[key].files[index].path = targetPath
                                            res.applications[key].files[index].url = null
                                            if(--count == 0){
                                                if(--globalCount == 0){
                                                    db.put(res.setName,res,(err) => {
                                                        if(err){
                                                            console.error(err)
                                                        }
                                                    })
                                                    cb(null,res)
                                                }
                                            }
                                        })
                                    }
                                })
                            )
                        })
                    }else{
                        cb(new Error('invalid applications: '+key))
                    }
                })
            }else{
                cb(res.error)
            }
        })
    }

}

module.exports = StoreCli