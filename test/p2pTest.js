const P2PBundle = require('../src/p2p/bundle.js')
const pull = require('pull-stream')
const Tools = require('../src/common/tools.js')
var hash = 'QmbWhXuF5LNvNi375Dz6RBpszq5vvMrHL6nsPyXAqvb9XK'

var p2pNode 
async function create(){
    p2pNode = await P2PBundle.createP2PNode('/Users/john/Library/Application\ Support/CoTNetwork')
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
            //return dataIn
        }),
        pull.concat((err,buf) => {
           
            console.log('drain ',buf.length)
            // console.log(buf)
            // var deBuf = Tools.decompressionBuffer(buf)
            // console.log(deBuf)
            console.log(Buffer.from(buf))
            var deBuf = Tools.decompressionBuffer(Buffer.from(buf))
            console.log(deBuf)
            
        })
    )
}

create()
