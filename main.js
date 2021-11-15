const fs = require('fs')
const crypto = require('crypto')

process.env = JSON.parse(fs.readFileSync('config.json', 'utf8'))



//!
//! Utilities
//!

const security = require('./util/security')

process.security = security



//!
//! Commands
//!

if (process.argv[2] === 'reset-token') {
    process.env.security.token = security.GenerateToken(128)
    fs.writeFileSync('config.json', JSON.stringify(process.env, null, '\t'))
    process.exit(0)
}
if (process.argv[2] === 'reset-seed') {
    process.env.security.seed = security.GenerateToken(8)
    fs.writeFileSync('config.json', JSON.stringify(process.env, null, '\t'))
    process.exit(0)
}
if (process.argv[2] === 'generate-keypair') {
    security.GenerateKeyPair()
}


//!
//! MongoDB
//!

const MongoClient = require('mongodb').MongoClient
MongoClient.connect(`mongodb://${process.env.db.host}:${process.env.db.port}`, function (err, db) {
    if (err) throw err;
    console.log('Connected to the database.')
    process.db = db.db(process.env.db.database)
})



//!
//! Express Server
//!

const express = require('express')
const app = express()
app.listen(process.env.port, () => console.log(`Listening on port ${process.env.port}`))
app.use(require('cookie-parser')())
app.use(require('body-parser').json({ extended: true }))

process.app = app



//!
//! Routes
//!

app.get('/', (req, res) => {

})

app.get('/user', (req, res) => {
    require('./client/user').GetData(req, res)
})

app.post('/user/create', (req, res) => {
    require('./client/user').Create(req, res)
})

app.get('/user/login', (req, res) => {
    require('./client/user').Login(req, res)
})

app.get('/user/password-reset', (req, res) => {
    require('./client/user').InitiatePasswordReset(req, res)
})

app.put('/user/password-reset', (req, res) => {
    require('./client/user').ResetPassword(req, res)
})



//? Encryption Tests

app.get('/security/encrypt', (req, res) => {
    console.log(req.ip)
    res.status(200).send(security.Encrypt(req.query.string))
})

app.get('/security/decrypt', (req, res) => {
    res.status(200).send(security.Decrypt(req.query.string))
})