const DBManager = require('../src/common/db.js')



var dbB = new DBManager('/Users/john/Library/Application\ Support/CoTNetwork/data/gc')

dbB.getAllValue((value) => {
   
    console.log(JSON.stringify(value))
   
})

// var recursive = require("recursive-readdir");
 
// recursive("/Users/john/Library/Application\ Support/CoTNetwork/data", function (err, files) {
//   // `files` is an array of file paths
//   console.log(files);
// });


