const P2PBundle = require('../src/p2p/bundle.js')
const pull = require('pull-stream')
const Tools = require('../src/common/tools.js')
const fs = require('fs')
var hash = 'QmbWhXuF5LNvNi375Dz6RBpszq5vvMrHL6nsPyXAqvb9XK'

var p2pNode 
var key = fs.readFileSync('/Users/John/swarm.key')
async function create(){
    p2pNode = await P2PBundle.createP2PNode('/Users/john/Library/Application\ Support/CoTNetwork',key)
    
    setInterval(() => {
        p2pNode.swarm.peers((err,peers) => {
           console.log(peers.length)
        })
    }, 5000);
}

create()
