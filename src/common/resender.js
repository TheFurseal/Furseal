/*
    keep watching wich block should be rensend
*/
const debug = require('debug')('common:resender')
const ProgressManager = require('./progressManager.js')

function getNeighbor(blockName,db,callback){
    if(blockName == null){
        return
    }
    var indexStr = blockName.split('_')
    if(indexStr.length != 3){
        console.error('Bad index string '+indexStr)
        return
    }
    var index1 = parseInt(indexStr[1])
    var index2 = parseInt(indexStr[2])
    //construct neighbor array\
    var inserted = 0
    var neighborArry = []
    for(var i= index1-1;i<index1+2;i++){
        for(var j=index2-1;j<index2+2;j++){
            if(i == index1 && j == index2){
                inserted++
                if(inserted == 9){
                    callback(neighborArry)
                }
            }else{
                var name = indexStr[0]+'_'+i+'_'+j
                db.get(name,(err,value) => {
                    if(err){
    
                    }else{
                        if(value.unprotected.status == 'validated' || value.unprotected.status == 'preDone'){
                            var tmp = {}
                            tmp.name = value.unprotected.blockName
                            tmp.cost = value.unprotected.info.timeCost
                            neighborArry.push(tmp)
                        }
                    }
                    inserted++
                    if(inserted == 9){
                        callback(neighborArry)
                    }
                })
            }
        }
    }
}

var dbB
var dbW
var workIndexs

function checkNeighbor(blockName,array,startTime,callback){
    if(array.length == 0){
        return
    }
    var sum = 0
    for(var i=0;i<array.length;i++){
        sum+=array[i].cost
    }
    sum = sum / array.length
    var date = new Date()
    var currentCost = date.valueOf() - startTime
    if(currentCost > sum*2 && currentCost > 900000){
        var hDate = new Date(startTime)
        debug('Block started at: '+hDate.toLocaleString())
        debug('Block time cost for now: '+((date.valueOf() - startTime)/1000/60)+' Min')
        debug('Block cost arg: '+(sum/1000/60)+' Min ,deadline is [ '+(sum*2/1000/60)+' Min ]')
        callback(blockName)
    }
}

class Resender{
    constructor({
        WorkIndexs:wIndexs,
        BlockDatabase:dbBlock,
        WorkDatabase:dbWwork
    }){
        debug('Create a new resender')
        dbB = dbBlock
        dbW = dbWwork
        workIndexs = wIndexs
        var pa = this
        //resent check loop
        setInterval(() => {
            dbB.getAllValue(value => {
                value.forEach(elem => {
                    if(workIndexs[elem.workName] != null && elem.unprotected.status == 'processing'){ // processing work
                        getNeighbor(elem.unprotected.blockName,dbB,(arry) => {
                            //debug(arry)
                            checkNeighbor(elem.unprotected.blockName,arry,elem.unprotected.info.startTime,pa.resendByBlockName)
                        })
                     }else{
     
                     }
                })
            })
        }, 20000);
    }

    resendByBlockName(blockName){
        dbB.get(blockName,(err,value) => {
            if(err){
                console.error(err)
            }else{
                if(workIndexs[value.workName] != null && value.unprotected.status != 'validated'){ // processing work
                    value.unprotected.status = 'init'
                    dbB.put(blockName,value,(err) => {
                        if(err){
                            console.error(err)
                        }
                        debug('resend block '+blockName)
                    })
                    var blockDim = value.unprotected.block.indexs;
                    var indexs = blockDim.split('_');
                    var total = value.unprotected.block.number
                    var blockIndex = value.unprotected.block.index;
                    var index = blockIndex.split('_');
                    if(index.length < 2){
                        console.error('bad block index');
                    }
                    dbW.get(value.workName,(err,value2) => {
                        if(err){
                            console.error('ERROR: ',err);
                        }else{
                            var pm = new ProgressManager(parseInt(indexs[0]),total,value2.unprotected.progress);
                            pm.updateProgressWithIndex(parseInt(index[1]),parseInt(index[0]),false);
                            value2.unprotected.info.progress = pm.getProgress();
                            value2.unprotected.progress = pm.mProgress;
                            dbW.put(value2.workName,value2,(err) => {
                                if(err){
                                    console.error('ERROR: ',err);
                                }
                            })
                        }
                    })
                }else{

                }
            }
        })
    }

    resendBySlaveID(sID){
        dbB.getAllValue(value => {
            value.forEach(element => {
                if(workIndexs[element.workName] != null && element.unprotected.status != 'validated' && element.unprotected.slave == sID){
                    element.unprotected.status = 'init'
                    dbB.put(element.unprotected.blockName,element,(err) => {
                        if(err){
                            console.error(err)
                        }
                        debug('resend block '+element.unprotected.blockName)
                    })
                    var blockDim = element.unprotected.block.indexs;
                    var indexs = blockDim.split('_');
                    var total = element.unprotected.block.number
                    var blockIndex = element.unprotected.block.index;
                    var index = blockIndex.split('_');
                    if(index.length < 2){
                        console.error('bad block index');
                    }
                    dbW.get(element.workName,(err,value2) => {
                        if(err){
                            console.error('ERROR: ',err);
                        }else{
                            var pm = new ProgressManager(parseInt(indexs[0]),total,value2.unprotected.progress);
                            pm.updateProgressWithIndex(parseInt(index[1]),parseInt(index[0]),false);
                            value2.unprotected.info.progress = pm.getProgress();
                            value2.unprotected.progress = pm.mProgress;
                            dbW.put(value2.workName,value2,(err) => {
                                if(err){
                                    console.error('ERROR: ',err);
                                }
                            })
                        }
                    })
                }
            });
        })
    }
}

module.exports = Resender