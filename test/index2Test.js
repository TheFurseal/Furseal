const Furseal = require('../index.js/index.js')

var furseal = new Furseal('./test2')
var run = async () => {
    await furseal.init()
    var data = {}
    data.password = '123456'
    data.phoneNumber = '13258299368'
    furseal.login(data)
} 

run()