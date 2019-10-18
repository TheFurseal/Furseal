var level = require('level');
const fs = require('fs')
const debug = require('debug')('common:db')

class DBManager{

    constructor(repo){
        if (!fs.existsSync(repo)){
            fs.mkdirSync(repo,{ recursive: true });
        }
        //debug('create db '+repo);
        this.db = level(repo,{valueEncoding:'json'},(err) => {
            if(err){
                console.error(err);
                process.exit();
            }
            
        });
    }

    //update a exist value with key
    //if key value is not exist, nothing changed
    update(key,value,callback){
        var db = this.db
        if (key) {
            db.get(key, function (error, value2) {
                //callback(error, value);
                if(error){
                    //callback(error);
                }else{
                    db.put(key, value, function(error){
                        callback(error);
                    });
                }
            })
        } else {
            callback('no key', key);
        }
    }

    //add a new value with key
    put(key, value, callback) {
        if (key && value) {
            this.db.put(key, value, function(error){
                if(callback != null)callback(error);
            });
        } else {
            if(callback != null) callback('no key or value');
        }
    }
    
    
    get(key, callback) {
        if (key) {
            this.db.get(key, function (error, value) {
                callback(error, value);
            })
        } else {
            callback('no key', key);
        }
    }

    del(key, callback) {
        if (key) {
            this.db.del(key, function (error) {
                callback(error);
            })
        } else {
            callback('no key');
        }
    }

    batch(arr, callback) {
        if (Array.isArray(arr)) {
            var batchList = [];
            arr.forEach(item)
            {
                var listMember = {};
                if (item.hasOwnProperty('type')) {
                    listMember.type = item.type;
                }
                if (item.hasOwnProperty('key')) {
                    listMember.key = item.key;
                }
                if (item.hasOwnProperty('value')) {
                    listMember.value = item.value;
                }
                if (listMember.hasOwnProperty('type') && listMember.hasOwnProperty('key') && listMember.hasOwnProperty('value')) {
                    batchList.push(listMember);
                }
            }
            if (batchList && batchList.length > 0) {
                this.db.batch(batchList, function (error) {
                    callback(error, batchList);
                })
            } else {
                callback('array Membre format error');
            }
        } else {
            callback('not array');
        }
    }


    find(find, callback) {
        var option = {keys: true, values: true, revers: false, limit: 20, fillCache: true};
        if (!find)
            return callback('', null);
        else {
            if (find.prefix) {
                option.start = find.prefix;
                option.end = find.prefix.substring(0, find.prefix.length - 1)
                    + String.fromCharCode(find.prefix[find.prefix.length - 1].charCodeAt() + 1);
            }
    
            if (find.limit)
                option.limit = find.limit;
    
            this.db.createReadStream(option).on('data',function (data) {
                data&&callback(data.key, data.value);
            }).on('error',function (err) {
                }).on('close',function () {
                }).on('end', function () {
                    //return callback('', Date.now());
                });
        }
    }

    getAll(callback){
        var tmp =[];
        this.db.createReadStream().on('data',function(data){
                tmp.push(data);
        }).on('error',function(){
            callback(tmp);
        }).on('end',function(){
            callback(tmp);
        })
    }

    getAllValue(callback){
        var tmp =[];
        this.db.createValueStream().on('data',function(data){
                tmp.push(data);
        }).on('error',function(){
            callback(tmp);
        }).on('end',function(){
            callback(tmp);
        })
    }



    makeDefaultData(flag){
        var conf = new config();
        var confObj;
        
        conf.load( function(value){
            confObj = value;
        });
       setTimeout(() => {

            if(flag == 'list'){
                var data = {};
        
                data.id = '1234567890';
                data.fileName = 'test_moxing_345_01_7.zip';
                data.camera = 'Camera_4';
                data.progress = 100;
                data.fileSize = '124M';
                data.status = 'finished';
                data.uploadDate = '24/07/2019 10:23:34';
                data.timeCost = '00:23:45';
                data.ETATime = '00:15:34';
                data.previewURL = ['https"//www.cotnetwork.com/test.png','https"//www.cotnetwork.com/test2.png'];
                data.heatMap = [[10,10,30],[12,14,40]];
                data.resultPath = '';
                //json.push(data);
                var jStr = JSON.stringify(data);
                this.put(data.id,jStr,function(error){
                    if(error)debug(error);
                });
            
                for(var i=0;i<20;i++){
                    
                    data.id = (1234567890+i).toString();
                    if(i%5 == 0){
                        data.progress = 80+i;
                        data.status = 'working';
                    }else if(i%3 == 0){
                        data.progress = 100;
                        data.status = 'finish';
                    }else if(i%7 == 0){
                        data.progress = 100;
                        if(confObj != null){
                            data.resultPath = confObj.savePath+'/'+data.id+'_result.zip';
                        }
                        
                        data.status = 'closed';
                    }else{
                        data.progress = 30+i;
                        data.status = 'failed';
                    }
                
                    jStr = JSON.stringify(data);
                    this.put(data.id,jStr,function(error){
                        if(error)debug(error);
                    });
                
                }
            }else if(flag == 'mail'){
                var mail = {};
                mail.id = '00001';
                mail.status = 'read';
                mail.title = 'System message';
                mail.date = '06/24/2019';
                mail.type = 'info';
                mail.body = 'Please update your app to newest release version 1.1.0';
                jStr = JSON.stringify(mail);
                this.put(mail.id,jStr,function(error){
                    if(error)debug(error);
                });

                mail.id = '00002';
                mail.status = 'read';
                mail.date = '06/25/2019';
                mail.title = 'Sale';
                mail.type = 'sale';
                mail.body = 'Change now! you will get 50% OFF!!!!';
                jStr = JSON.stringify(mail);
                this.put(mail.id,jStr,function(error){
                    if(error)debug(error);
                });

                mail.id = '00003';
                mail.status = 'unread';
                mail.date = '06/26/2019';
                mail.title = 'News';
                mail.type = 'news';
                mail.body = 'CoT Network IPC!';
                jStr = JSON.stringify(mail);
                this.put(mail.id,jStr,function(error){
                    if(error)debug(error);
                });
            }
            
            
           
    
       
       }, 1000);
        
    };


}

module.exports =  DBManager;
