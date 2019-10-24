const P2PBundle = require('../src/p2p/bundle.js')
const pull = require('pull-stream')

var p2pNode 
async function create(){
    p2pNode = await P2PBundle.createP2PNode('/Users/john/Library/Application\ Support/CoTNetwork')
}

create()


var hash = 'QmbPuHTUZJJcoERkueHnUXB1N6N2e7DscPSQNxfQBZ7UyU'
setTimeout(() => {


    var totalBytesDA = 0
    var size = 0
    pull(
        p2pNode.catPullStream(hash),
        pull.through(dataIn => {
            totalBytesDA += dataIn.length
            var status = {}
            status.Total = size
            status.recived = totalBytesDA
            console.log(status)
        }),
        pull.collect((err, buf) => {
            if(err){
                console.error(err)
            }else{
                console.log(buf.length)
                console.log(buf.byteLength)
                console.log(typeof(buf))
            }
        })
    )
}, 5000);
