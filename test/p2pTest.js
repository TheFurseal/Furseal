const P2PBundle = require('../src/p2p/bundle.js')
const pull = require('pull-stream')
const Tools = require('../src/common/tools.js')
const fs = require('fs')
var hash = 'QmbWhXuF5LNvNi375Dz6RBpszq5vvMrHL6nsPyXAqvb9XK'

var p2pNode 
async function create(){
    p2pNode = await P2PBundle.createP2PNode('/Users/john/Library/Application\ Support/CoTNetwork')
    var totalBytesDA = 0
    var size = 0
    // p2pNode.ls(hash,(err,data) => {
    //     console.log(err)
    //     console.log(data)
    // })
    // p2pNode.get(hash,(err,files) => {
    //     console.log(files)
    // })
    var stream = p2pNode.catPullStream(hash)
    pull(
        stream,
        pull.through(dataIn => {
            totalBytesDA += dataIn.length
            var status = {}
            status.Total = size
            status.recived = totalBytesDA
            console.log(status)
            
        }),
        pull.collect((err,buf) => {
          
           
            //     console.log(typeof(buf))
            //    console.log(buf)
                //console.log('drain ',buf.length)
                // buf = JSON.parse(buf)
                // console.log(buf)
                // console.log(buf)
                // var deBuf = Tools.decompressionBuffer(buf)
                // console.log(deBuf)
                //console.log(Buffer.from(buf).length)
                // fs.writeFileSync('./1.zip',Buffer.from(buf))
                var deBuf = Tools.decompressionBuffer(Buffer.concat(buf))
                console.log(deBuf.length)
                fs.writeFileSync('./2.zip',deBuf)
                // fs.writeFileSync('./3.zip',deBuf.toString())
            
            
        })
    )
}

create()
