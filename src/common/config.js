const PeerId = require('peer-id')
const fs = require('fs')
const debug = require('debug')('common:config')
const crypto = require('crypto')
const base58 = require('bs58')

const keyLeng = 4096
const msgPDLength = 512
const msgLength = 500

class Config{
     constructor(appPath){
        this.config = {};
        if(appPath == null){
            appPath = __dirname;
        }
        if (!fs.existsSync(appPath)){
            fs.mkdirSync(appPath,{ recursive: true });
        }
        if(!fs.existsSync(appPath+'/config.json')){
            crypto.generateKeyPair('rsa', {
                modulusLength: 4096,
                publicKeyEncoding: {
                    type: 'spki',
                    format: 'pem'
                },
                privateKeyEncoding: {
                    type: 'pkcs8',
                    format: 'pem',
                    cipher: 'aes-256-cbc',
                    passphrase: 'top secret'
                }}, 
                (err, publicKey, privateKey) => {
                    // Handle errors and use the generated key pair.
                var keys = {};
                if(err != null){
                    console.error(err);
                }
                keys.publicKey = publicKey;
                keys.privateKey = privateKey;
                var hash = crypto.createHash('sha256').update(keys.privateKey).digest("base64");
                //cot network hash
                var id = 'CH'+hash.substr(0,40);
                keys.privateKey = base58.encode(Buffer.from(keys.privateKey));
                keys.publicKey = base58.encode(Buffer.from(keys.publicKey));
                this.config.keys = keys;
                this.config.id = id;
                this.config.powerSharing = true
                var jStr = JSON.stringify(this.config,null,'\t');
                fs.writeFile(appPath+'/config.json', jStr, 'utf8', function (err) {
                    if (err) {
                        debug("An error occured while writing JSON Object to File.");
                        return
                    }
                    debug("JSON file has been saved.");
                })
            })
        }else{
            var pa = this
            pa.config = JSON.parse(fs.readFileSync(appPath+'/config.json','utf8'));
        }
        this.appPath = appPath
    }

    encrypto(protecStr){
        var enStr = null
        var key = base58.decode(this.config.keys.privateKey)
        for(var i = 0; i< protecStr.length; i+=msgLength){
            var len = msgLength
            if(i+len > protecStr.length){
                len = protecStr.length - i
            }
            var subStr = protecStr.substr(i,len)
            var tmp = crypto.privateEncrypt(
                {
                    key:key,
                    passphrase:'top secret',
                    padding: crypto.constants.RSA_PKCS1_PADDING
                },
                Buffer.from(subStr),
            )
            if(enStr == null){
                enStr = tmp
            }else{
                enStr = Buffer.concat([enStr,tmp])
            }
        }
        enStr = base58.encode(enStr);
        enStr = enStr.toString()
        return enStr
    }

    decrypto(encodeStr){
        var dataBuffer = base58.decode(encodeStr);
        var key = base58.decode(this.config.keys.publicKey)
        var protectedTmp =  null
        for(var i=0;i<dataBuffer.length;i+=msgPDLength){
            var len = msgPDLength
            var subBuffer = Buffer.alloc(len)
            dataBuffer.copy(subBuffer,0,i,i+len)
            var tmp = crypto.publicDecrypt(
                {
                key:key,
                passphrase:'top secret',
                padding: crypto.constants.RSA_PKCS1_PADDING
                },
                subBuffer,
            )
            if(protectedTmp == null){
                protectedTmp = tmp
            }else{
                protectedTmp = Buffer.concat([protectedTmp,tmp])
            }
        }
        protectedTmp = protectedTmp.toString()
        return protectedTmp
    }

     load(){
        this.config = fs.readFileSync(appPath+'/config.json','utf8')
    }

    update(key,value){
        this.config[key] = value;
        var jsonStr = JSON.stringify( this.config,null,'\t')
        fs.writeFileSync(this.appPath+'/config.json', jsonStr, 'utf8')
    }

    save(data){
        var jsonStr = JSON.parse(data)
        fs.writeFile(this.appPath+'/config.json', jsonStr, 'utf8', function (err) {
            if (err) {
                debug("An error occured while writing JSON Object to File.")
                return debug(err);
            }
            debug("JSON file has been saved.")
        })
    }
}

module.exports = Config;