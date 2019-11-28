const P2PBundle = require('../src/p2p/bundle.js')
const pull = require('pull-stream')
const fs = require('fs')
const process = require('process')
const debug = require('debug')('commonDebug:p2pTest')
var hashes = [
    'QmPCdoQkTSKNsuBUpYYWQ9KPutyJVNZ69o9xyKWGgPaQGz',
    'QmP9GqDK3B4YaeJwZx2bBdiq5mvNvVJjqVHikfvDdZrHxi',
    'QmX6N2XzjmBvP25mQmv6DTjcZBym3aVJpX7txAV5fxS571',
    'QmPMTuCCfwtGJn7zGt4QwbYabigyK1YDUS2EmQaFy4FMmS',
    'QmUHCY9V9X1NErrCzJBMCvXjNEY2zAgBWkCC7jzCUVek4u',
    'QmSFZ7LAAiBtCqqCmfYEHqaS9AmwQqvdai1KrZ6FgeKeCk',
    'QmXdURKZPMNDjobo1LK1y26YRYXPmpxAjvt8eMhPmhYPkS',
    'QmQZgsMwAt62QWzZ8r34ACAGkNYFnwGwTDRN16AiF58TXk'
]


var p2pNode 
var key = fs.readFileSync(process.env.HOME+'/swarm.key')
async function create(){
    p2pNode = await P2PBundle.createP2PNode('/Users/john/Library/Application\ Support/CoTNetwork',key)
    debug('Test start')
    var total = hashes.length
    hashes.forEach(hash => {
        var date = new Date()
        var totalBytes = 0
        pull(
            p2pNode.catPullStream(hash),
            pull.through(dataIn => {
                totalBytes += dataIn.length
            }),
            pull.collect((err,buf) => {
                var dateSub = new Date()
                debug(Buffer.concat(buf).length+' bytes data have been recived!!!!!')
                var cost = (dateSub.valueOf() -  date.valueOf())/1000.0
                debug(hash+' cost '+cost+' s.')
                if(--total == 0){
                    debug('Test end.')
                    process.exit(0)
                }else{
                    debug('Left '+total+' file')
                }
            })
        )
    })
}

create()
