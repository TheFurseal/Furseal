const fs = require('fs')
const DBManager = require('./db.js')
const Tools = require('./tools.js')
const debug = require('debug')('common:GCManager')
const EventsManager = require('./eventsManager.js')
/**
 * EVENTS
 * XXX_DONE
 * XXX_CANCEL
 * XXX_TIMEOUT
 * XXX_FIAILED
 */

var registedBuffer
var parseLock = false
var complatedEvent = []
class GCManager{
    constructor({
        GCRecordDB:dbG,
        P2PNode:node
    }){
        if(dbG != null){
            this.db = dbG
        }else{
            dbG = new DBManager('./testRepo')
            this.db = dbG
        }
        this.eventsManager = new EventsManager()
        this.eventsManager.registEvent('startGC',(subEvent) => {
           
            debug('clean '+subEvent+' record')
            dbG.getAll(value => {
                var processed = 0
                var hashCount = 0
                value.forEach(elem => {
                    if(elem.value == subEvent){
                        //clean db first
                        dbG.del(elem.key,(err) => {
                            if(err){
                                console.log(err)
                            }
                        })
                        if(elem.key.indexOf('Qm') == 0){
                            //it is a hash
                            node.pin.rm(elem.key,(err,pinset) => {
                                if(err){
                                    console.error(err)
                                }else{
                                    debug('remove pinset '+JSON.stringify(pinset))
                                }
                            })
                            hashCount++
                        }else{
                            if(fs.existsSync(Tools.fixPath(elem.key))){
                                debug('start unlink '+elem.key)
                                fs.unlink(elem.key,(err) => {
                                    if(err){
                                        console.error(err)
                                    }
                                })
                            }
                        }
                        processed++
                        if(processed == value.length && hashCount > 0){
                            node.repo.gc((err,res) => {
                                if(err){
                                    console.error(err)
                                }else{
                                    //debug(res)
                                }
                            })
                        }
                        
                    }
                })
            })
        })
    }

    dump(){
        this.db.getAll((value) => {
            // value.forEach((element) => {
            //     console.log(element.key)
            //     console.log(element.value)
            // })
            console.log(value.length)
        })
    }
    

    register(file,event){
        this.db.put(file,event,(err) => {
            if(err){
                console.error(err)
            }else{
                debug('Registed '+file+' to gc envet '+event)
            }
        })
    }

    

    clearByEvent(event){
        this.eventsManager.emit('startGC',event)
    }

}

module.exports = GCManager

