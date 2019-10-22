const DBManager = require('../src/common/db.js')



var dbB = new DBManager('/Users/john/Library/Application\ Support/CoTNetwork/data/result')

dbB.getAll((value) => {
   
    value.forEach((element) => {
        console.log(element)
    })
   
})


