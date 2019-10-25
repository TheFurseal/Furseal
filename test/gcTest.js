const GCManager = require('../src/common/GCManager.js')
const P2PBundle = require('../src/p2p/bundle.js')




var p2pNode 
async function create(){
    p2pNode = await P2PBundle.createP2PNode('/Users/john/Library/Application\ Support/CoTNetwork')
   
    var gcManager = new GCManager({
        P2PNode:p2pNode
    })
    gcManager.clearByEvent('hello,word')

    // for(var i=0;i<30;i++){
    //     gcManager.register('/Users/John/Desktop/'+i+'a.txt','hello,world')
    // }

    // gcManager.register('QmbWhXuF5LNvNi375Dz6RBpszq5vvMrHL6nsPyXAqvb9XK','hello,word')

    // for(var i=30;i<60;i++){
    //     gcManager.register('/Users/John/Desktop/'+i+'b.txt','goodby,world')
    // }

    setInterval(() => {
        gcManager.dump()
    }, 3000);
    
}

create()


// for(var i=0;i<30;i++){
//     gcManager.register('/Users/John/Desktop/'+i+'a.txt','hello,world')
// }

// gcManager.register('QmbWhXuF5LNvNi375Dz6RBpszq5vvMrHL6nsPyXAqvb9XK','hello,word')

// for(var i=30;i<60;i++){
//     gcManager.register('/Users/John/Desktop/'+i+'b.txt','goodby,world')
// }

// gcManager.dump()





