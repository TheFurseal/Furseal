const P2PBundle = require('../src/p2p/bundle.js')
const pull = require('pull-stream')

var hash = 'QmdNfj57WGetsFsymgNas8RpbDoFfmFZQ4QvMYxmHYcPmy'

var p2pNode 
async function create(){
    p2pNode = await P2PBundle.createP2PNode('/Users/john/Library/Application\ Support/CoTNetwork')
    var totalBytesDA = 0
    var size = 0
    pull(
        p2pNode.catPullStream(hash),
        pull.map(dataIn => {
            totalBytesDA += dataIn.length
            var status = {}
            status.Total = size
            status.recived = totalBytesDA
            console.log(status)
            return dataIn
        }),
        pull.drain((buf) => {
           
            console.log(buf.length)
            console.log(typeof(buf))
            
        }), (err) => {
            if(err){
                console.error(err)
            }
        }
    )
}

create()
