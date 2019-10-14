const fs = require('fs')
const DBManager = require('./db.js')
const Tools = require('./tools.js')
const debug = require('debug')('common:GCManager')
/**
 * EVENTS
 * XXX_DONE
 * XXX_CANCEL
 * XXX_TIMEOUT
 * XXX_FIAILED
 */

var registedBuffer
var optionLock = false
var parseLock = false
var complatedEvent = []
class GCManager{
    constructor({
        GCRecordDB:dbG
    }){
        if(dbG != null){
            this.db = dbG
        }else{
            
            dbG = new DBManager('./testRepo')
            this.db = dbG
        }

       
        
        setInterval(() => {
            if(registedBuffer != null){
               
                if(parseLock){

                }else{
                    parseLock = true
                    var copy = registedBuffer
                    registedBuffer = null
                    parseLock = false
                    
                    Object.keys(copy).forEach(function(key) {
                      
                        var files = copy[key];
                        var tmpArray
                        dbG.get(key,(err,value) => {
                        
                            if(value == null){
                                tmpArray  = files
                            }else{
                                if(typeof(value) == 'string'){
                                    value = JSON.parse(value)
                                }
                              
                                tmpArray = [...new Set([...value ,...files])]
                            }
                           
                            dbG.put(key,JSON.stringify(tmpArray),(err) => {
                                if(err){
                                    debug(err)
                                }
                                
                            })
                                
                        })
                    })
                }
                  
            }else if(complatedEvent.length){
                complatedEvent.forEach((element) => {
                    debug('clean '+element+' record')
                    dbG.get(element,(err,value) => {
                        if(err){
                          
                        }else{
                            //debug(value)
                            if(typeof(value) == 'string'){
                                value = JSON.parse(value)
                            }

                            value.forEach((file) => {
                                if(fs.existsSync(Tools.fixPath(file))){
                                    debug('start unlink '+file)
                                    fs.unlink(file,(err) => {
                                        if(err){
                                            console.error(err)
                                        }
                                    })
                                }
                            })
                            

                            debug('handle gc complated: '+value.length)
                            dbG.del(element,(err) => {
                                if(err){
                                    console.error(err)
                                }
                            })
                           
                        }
                        
                    }) 
                   
                })
                complatedEvent = []
            }else{

            }
        }, 3000);
        
    }

    dump(){
        this.db.getAll((value) => {
            value.forEach((element) => {
                debug(element.key)
                debug(JSON.parse(element.value))
            })
        })
    }
    

    register(file,event){

        debug('handle register')
        if(typeof(file) == 'string'){
            file = [].concat(file)
        }
        var handler = setInterval(() => {
            if(parseLock){
                
            }else{
                parseLock = true
                if(registedBuffer == null){
                    registedBuffer = {}
                    registedBuffer[event] = []
                }else if(registedBuffer[event] == null){
                    registedBuffer[event] = []
                }
                
                registedBuffer[event] = [...new Set([...registedBuffer[event] ,...file])]
                parseLock = false
                clearInterval(handler)
            }
        }, 500);
        
    }

    

    clearByEvent(event){
        var dbTmp = this.db
        complatedEvent.push(event)
    }

}

module.exports = GCManager

