const IPFS = require('ipfs')
const WebSockets = require('libp2p-websockets')
const WSS = require('libp2p-websocket-star')
const WebrtcStar = require('libp2p-webrtc-star')
// const wrtc = require('wrtc')
const testrtc = require('webrtc')
const TCP = require('libp2p-tcp')
const MulticastDNS = require('libp2p-mdns')
const Bootstrap = require('libp2p-bootstrap')
const KadDHT = require('libp2p-kad-dht')
const Multiplex = require('libp2p-mplex')
const Protector = require('libp2p-pnet')
const fs = require('fs')


const SECIO = require('libp2p-secio')

const bootstrapers = [
  
    '/dns4/peer1.cotnetwork.com/tcp/4001/ipfs/QmUoL3udUypkWjGzap46sw3AqxnBN6496xHS3YZ8NbnsLN',
    "/ip4/101.206.123.159/tcp/4001/ipfs/QmUs7k1kLkB3zSiWUQGEXDZD8RyRHu9JDeYJhQmBxfnyD1",
    "/dns4/peer3.cotnetwork.com/tcp/4001/ipfs/Qmeb33yPmGG2dv39gNZguA4GZEhCLfPrRpvbX9HsiXWHfm",
    "/dns4/peer4.cotnetwork.com/tcp/4004/ipfs/QmTDMZ3gfB5JSSK5QYvZbBo5xrz5J3Ay4HFXqn3Mck998C"
  ]

module.exports.createP2PNode = async (home) => {
  // const webrtcStar = new WebrtcStar({ wrtc: wrtc })
  const webrtcStar = new WebrtcStar({ wrtc: testrtc })
  const wss = new WSS()
    if(home != null){
       home=home+'/fileStorage'
    }else{
      home = './fileStorage'
    }
    var swarmKeyBuffer = fs.readFileSync(home+'/swarm.key')
    return await IPFS.create({
        repo: home,
        config: {
            Addresses: {
              Swarm: [
                "/ip4/0.0.0.0/tcp/4001",
                "/ip4/127.0.0.1/tcp/4003/ws",
                "/dns4/peer1.cotnetwork.com/tcp/9090/ws/p2p-webrtc-star"
              ]
            }
          },
        libp2p:  {
            switch: {
              blacklistTTL: 2 * 60 * 1e3, // 2 minute base
              blackListAttempts: 5, // back off 5 times
              maxParallelDials: 100,
              maxColdCalls: 100,
              dialTimeout: 10e3 // Be strict with dial time
            },
            modules: {
              transport: [
                TCP,
                WebSockets,
                webrtcStar,
                wss
                
              ],
              streamMuxer: [
                Multiplex
                //SPDY
              ],
              connEncryption: [
                SECIO
              ],
              connProtector: new Protector(swarmKeyBuffer),
              peerDiscovery: [
                MulticastDNS,
                Bootstrap,
                webrtcStar.discovery,
                wss.discovery
               
              ],
              dht: KadDHT
            },
            config: {
              peerDiscovery: {
                autoDial: true,
                mdns: {
                  enabled: true
                },
                bootstrap: {
                  enabled: true,
                  list: bootstrapers
                },
                websocketStar: {
                  enabled: true
                }
              },
              dht: {
                kBucketSize: 20,
                enabled: true,
                randomWalk: {
                  enabled: true
                }
              },
              relay: { 
                enabled: true, 
                hop: { 
                  enabled: true,
                   active: true 
                } 
              }
            },
            connectionManager: {
              minPeers: 10,
              maxPeers: 80
            }
          }
      
    })
}




