const DBManager = require('../src/common/db.js')



var dbB = new DBManager('/Users/john/Library/Application\ Support/CoTNetwork/data/work')

dbB.get('1571841491126',(err,value) => {
   
    console.log(value)
   
})

// var recursive = require("recursive-readdir");
 
// recursive("/Users/john/Library/Application\ Support/CoTNetwork/data", function (err, files) {
//   // `files` is an array of file paths
//   console.log(files);
// });


