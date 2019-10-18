const EventEmitter = require('events')
const debug = require('debug')('common:eventsManager')

class Emitter extends EventEmitter {}

class EventsManager{
    constructor(){
        this.emitter = new Emitter()
    }

    registEvent(event,callback){
        this.emitter.on(event,callback)
    }

    emit(event,data){
        debug('Event '+event+' emited')
        this.emitter.emit(event,data)
    }
}

module.exports = EventsManager
