const pull = require('pull-stream')
var Pushable = require('pull-pushable')

var p = Pushable()
pull(p, pull.drain((data) => {
    console.log(data.length)
    p.push(data)
}))

var tmp = {'hello':'john'}
tmp.buffer = Buffer.from('hello,john')
p.push(Buffer.from(tmp))
// p.end()