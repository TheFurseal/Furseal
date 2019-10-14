
class ProgressManager{
    constructor(width,total,code){

        if(width == null || total == null){
            console.error('Empty param');
        }

        if(total > 1024){
            console.error('Too many blocks');
        }
        if(code == null){
           this.mProgress = '0';
           while(this.mProgress.length < total/4){
               this.mProgress+='0';
           }
        }else{
            if(typeof(code) != 'string'){
                code = ''+code
            }
            this.mProgress = code;
        }
        
        this.n = width;
        this.total = total;
        
    }

    decode(){
        var tmp = '';
        for(var i=0; i<this.total/4; i++){
           
            var pCurrent = this.mProgress.substr(i,1);
            var current = parseInt(pCurrent,16);
            // current = parseInt(pCurrent,10);
            
            current = current.toString(2);
            while(current.length < 4){
                current = '0'+current;
            }
           
           
            tmp=tmp+current;
           
        }
        
        return tmp;
    }

    encode(tmp){
        var retValue = '';
        for(var i=0;i<this.total/4;i++){
           
            var subTmp = tmp.substr(i*4,4);
          
            var current = parseInt(subTmp,2);
            current =current.toString(16);
   
            retValue+=current;
            
        }
       

       this.mProgress = retValue;
    }


    updateProgressWithIndex(y,x,flag){
    
       // get location
        var num = y*this.n+x;
        var tmp = this.decode();
        if(flag == null || flag == true){
            tmp = tmp.substr(0,num) +'1'+ tmp.substr(num+1);
        }else if(flag == false){
            tmp = tmp.substr(0,num) +'0'+ tmp.substr(num+1);
        }
        
        this.encode(tmp);
      
    }

    getProgress(){
        var tmp = this.decode();
        var cont = 0;
        for(var i = 0; i < tmp.length; i++){
            if(tmp.charAt(i) == '1'){
                cont++;
            }
        }
       
        return cont / this.total;
    }
}

module.exports = ProgressManager;