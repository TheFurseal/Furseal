const P2PBundle = require('../src/p2p/bundle.js')

var p2pNode 
async function create(){
    p2pNode = await P2PBundle.createP2PNode('/Users/john/Library/Application\ Support/CoTNetwork')
}

create()


var hash = 'QmbPuHTUZJJcoERkueHnUXB1N6N2e7DscPSQNxfQBZ7UyU'
setTimeout(() => {
    //console.log(p2pNode)
    p2pNode.get(hash,(err,files) => {
        if(err){
            console.error(err)
        }else{
            files.forEach(element => {
                console.log(element.hash)
            });
        }
    })
}, 5000);
