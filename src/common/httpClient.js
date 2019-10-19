const http = require('http')
const debug = require('debug')('common:httpClient')


class HttpClient{
    constructor(){
       
    };

    access(data,opt,callback){

        if(data == null || data == ''){
            data = 'null';
        }
        if(opt.port == null){
            opt.port = 7333;
        }

        const options = {
            hostname: opt.hostname,
            path: opt.path,
            port: opt.port,
            method: opt.method,
            headers: {
              'Content-Type': 'application/json',
              'Content-Length': data.length
            }
        }
        const req = http.request(options,function(res){
            var retData = '';
            res.on('data',function(d){
               retData+=d;
            });
            res.on('error',function(error){
                if(callback != null)callback(null)
                console.error(error);
            });
            res.on('end',function(){
                if(callback != null) callback(retData)
            })
            res.on('close',function(){
            })

        });
        req.write(data);
        req.end();

    }
}

module.exports = HttpClient;


  
  
  
  