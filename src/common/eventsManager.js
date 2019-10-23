const EventEmitter = require('events')
const debug = require('debug')('common:eventsManager')

class Emitter extends EventEmitter {}

class EventsManager{
    constructor(){
        this.emitter = new Emitter()
    }

    registEvent(event,callback){
        if(typeof(event) != 'string'){
            console.error('event must be string ',event)
        }
        this.emitter.on(event,callback)
    }

    emit(event,data){
        //debug('Event '+event+' emited')
        if(typeof(event) != 'string'){
            console.error('event must be string ',event)
        }
        this.emitter.emit(event,data)
    }
}

module.exports = EventsManager
