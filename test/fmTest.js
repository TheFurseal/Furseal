// const { base58 } = require('bstring');

const fs = require('fs')
fs.writeFile('./12345.txt', 'test', (err) => {
    // throws an error, you could also catch it here
    if(err){
        console.error(err)
       
    }else{

    }
})
