# Furseal
Furseal is a p2p based computing power sharing system.

## What's Furseal

Furseal is the core module of a cross devices computing power sharing system. Furseal make a decentralized p2p network to sharing data and envents using ipfs and manage works in the network.

## Features

* P2P connection
Powerful p2p connection with libp2p include NAT traversal, websocket ...

* Work management
create/resend/cancel work

* DApp dev API

see detail at

[Development document](./docs/devDoc.md)

## Dependency

* nodejs
* npm
* ipfs
* libp2p

## Build & Install

### Run as a command line (test)

1. Get source code

```shell
git clone https://github.com/TheFurseal/Furseal.git
```
2. Install dependencies

```shell
cd /path/to/TheFurseal
npm install
```
3. Luanch test

```shell
node coreTest.js
```

### Run as a sub module of other node.js project

1. Get source code

You can get source code by npm 

```shell
    cd /your/porject/root
    npm i furseal
```

or clone latest version of source code from github.

```shell
cd /your/project/node_modules
git clone https://github.com/TheFurseal/Furseal.git
```

2. import your code

as coreTest.js do, just import furseal like:

```js
const Furseal = requre('furseal')

```

## Donation

If you want to contribute to our project, you can donate to us in the following ways

<img src="./docs/images/wechatpay_qr.png" width="700">	|<img src="./docs/images/alipay_qr.png" width="700">		|<img src="./docs/images/btc_qr.png" width="700">	|<img src="./docs/images/eth_qr.png" width="700">	|
---		|---		|---		|---	
微信支付	|支付宝	|BTC		|ETH

When you donate, please email me (JohnSuu@cotnetwork.com) or leave a message below. Your name will be kept on the Backers list. Thank you very much for your support!

[Your_name]](your_link) ¥amount

## Backers

[JohnSuu](www.cotnetwork.com)