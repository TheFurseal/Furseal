const crypto = require('crypto')
const base58 = require('bs58')
const fs = require('fs')
const Tools = require('../src/common/tools.js')
var str = 'asdfghjklaqwerty'

var buf = Buffer.from(str)

console.log(str.length)
console.log(buf.length)

var data = fs.readFileSync('/Users/John/Desktop/data_1571762057627_4_3')
data = data.toString()


crypto.generateKeyPair('rsa', {
        modulusLength: 1024,
        publicKeyEncoding: {
            type: 'pkcs1',
            format: 'pem'
        },
        privateKeyEncoding: {
            type: 'pkcs1',
            format: 'pem'
        }
    }, 
    (err, publicKey, privateKey) => {
        
        if(err != null){
            console.error(err);
        }

        // console.log('construct key\n',privateKey);
        var key2 = {};

        // key2.privateKey = base58.encode(Buffer.from(privateKey));
        // key2.privateKey =  key2.privateKey.toString();

        // key2.publicKey = base58.encode(Buffer.from(publicKey));
        // key2.publicKey = key2.publicKey.toString();
        // console.log(postData);
        console.log(privateKey)
        console.log(publicKey)
        console.log('original')
        console.log(data)
        var ret = Tools.publicEncrypt(publicKey,data)
        console.log('encode done')
        var final = Tools.privateDecrypt(privateKey,ret)
        console.log(final.toString())
      
    });

