# Furseal
Furseal is a P2P-based computing resource sharing system.

## What's Furseal

Furseal is the core module of a cross-device compatible computing resource sharing system. Furseal constructs a fully decentralized P2P network to share data and events using IPFS and to manage all the work in the network.

## Features

* P2P connection: powerful P2P connection with libP2P include NAT traversal, websocket, and etc.

* Work management: create/monitor/resend/cancel work.

* DApp dev API

see more details at

[Development document](./docs/devDoc.md)

## Dependency

* nodeJS
* NPM
* IPFS
* libP2P

## Build & Install

### Run as a command line (test)

1. Get the source code

```shell
git clone https://github.com/TheFurseal/Furseal.git
```
2. Install dependencies

```shell
cd /path/to/TheFurseal
npm install
```
3. Launch the test

```shell
node coreTest.js
```

### Run as a sub-module of other node.js project

1. Get the source code

You can get the source code by npm 

```shell
    cd /your/porject/root
    npm i furseal
```

or clone the latest version of the source code from github.

```shell
cd /your/project/node_modules
git clone https://github.com/TheFurseal/Furseal.git
```

2. Import your code

as coreTest.js shows, just importing furseal as follows:

```js
const Furseal = requre('furseal')

```

## Donation

If you are willing to contribute to our project, you can make a donation by scanning the following QR codes or clicking the hyperlinks below: 

<img src="./docs/images/wechatpay_qr.png" width="700">	|<img src="./docs/images/alipay_qr.png" width="700">		|<img src="./docs/images/btc_qr.png" width="700">	|<img src="./docs/images/eth_qr.png" width="700">	|
---		|---		|---		|---	
微信支付(Wechat)	|支付宝(AliPay)	|BTC		|ETH

After you made a donation, please email me ([JohnSuu@cotnetwork.com]()) or leave a message below. Your name will be recorded in the Backers list. 
Thank you very much for your support!

[Your_name]](your_link) ¥amount

## Backers

[JohnSuu](www.cotnetwork.com)