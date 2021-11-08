const fs = require('fs')
process.generator = require('generate-password')

process.env = JSON.parse(fs.readFileSync('config.json', 'utf8'))


//!
//! Commands
//!

if (process.argv[2] === 'command=generate-secret') {
    process.env.secret = process.generator.generate({ length: 1000, numbers: true })
    fs.writeFileSync('config.json', JSON.stringify(process.env, null, '\t'))
}




//!
//! Database Connection
//!

var MongoClient = require('mongodb').MongoClient
MongoClient.connect(`mongodb://${process.env.db.host}:${process.env.db.port}`, function (err, db) {
    if (err) throw err;
    process.db = db.db(process.env.db.database)
})

console.log(process.env)