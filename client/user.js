const fs = require('fs')
const crypto = require('crypto')

async function GetData(req, res) {
    if (!req.query.token) return res.status(400).send('Missing parameter(s)')
    var Users = await process.db.collection('users')
    var user = await Users.findOne({ "security.token": req.query.token })
    if (!user) return res.status(400).send('Invalid token!')

    user.security.lastLoginAddress = req.ip
    await Users.updateOne({ username: req.query.username }, { $set: { security: user.security } })
    return res.status(200).send(user)
}

async function Create(req, res) {
    var required = ['username', 'password', 'email']
    if (required.some(x => !req.query[x])) return res.status(400).send('Missing parameter(s)')

    var Users = await process.db.collection('users')
    if (await Users.findOne({ username: req.query.username })) return res.status(400).send('Username is taken!')
    if (req.query.username.match(/[^a-zA-Z0-9_]/)) return res.status(400).send('Username can only contain letters, numbers and underscores')
    if (await Users.findOne({ email: req.query.email })) return res.status(400).send('Email is taken!')
    if (req.query.password.length < 8) return res.status(400).send('Password must be at least 8 characters long!')

    var UUID = null
    while (!UUID) {
        tempUUID = crypto.randomUUID()
        if (!await Users.findOne({ _id: tempUUID })) UUID = tempUUID
    }

    var user = {
        _id: UUID,
        email: req.query.email,
        username: req.query.username.toLowerCase(),
        displayName: req.query.username,
        created: new Date(),
        security: {
            password: process.security.Hash(req.query.password),
            token: process.security.GenerateToken(),
            lastLoginAddress: req.ip
        },
        permissions: {
            administrator: false
        }
    }

    return await Users.insertOne(user).then(() => res.status(200).send(user))
}

async function Login(req, res) {
    if (!req.query.username || !req.query.password) return res.status(400).send('Missing parameter(s)')
    req.query.username = req.query.username.toLowerCase()
    var Users = await process.db.collection('users')
    var user = await Users.findOne({ username: req.query.username }) || await Users.findOne({ email: req.query.username })
    if (!user) return res.status(400).send('Invalid username or password!')
    if (!process.security.Verify(req.query.password, user.security.password)) return res.status(400).send('Invalid username or password!')

    user.security.lastLoginAddress = req.ip
    await Users.updateOne({ username: req.query.username }, { $set: { security: user.security } })
    return res.status(200).send({ token: user.security.token })
}



var PWResetCache = {}
async function InitiatePasswordReset(req, res) {
    if (!req.query.email) return res.status(400).send('Missing parameter(s)')
    var Users = await process.db.collection('users')
    var user = await Users.findOne({ email: req.query.email })
    if (!user) return res.status(400).send('This Email is not linked to any accounts on our database!')

    if (PWResetCache[req.query.email]) delete PWResetCache[req.query.email]
    PWResetCache[req.query.email] = crypto.randomBytes(10).toString('base64url')
    setTimeout(() => { delete PWResetCache[req.query.email] }, 1000 * 60 * 10)

    require('../util/email').send(req.query.email, 'Confirmation Code', `Hey ${user.username}, we have received your password reset request, please use the following code to reset your password.\n\nConfirmation Code: ${PWResetCache[req.query.email]}`)
    return res.status(200).send('Password reset request sent!')
}

async function ResetPassword(req, res) {
    if (!req.query.email || !req.query.code || !req.query.password) return res.status(400).send('Missing parameter(s)')
    if (PWResetCache[req.query.email] !== req.query.code) return res.status(400).send('Invalid confirmation code!')
    if (req.query.password.length < 8) return res.status(400).send('Password must be at least 8 characters long!')
    var Users = await process.db.collection('users')
    var user = await Users.findOne({ email: req.query.email })

    user.security.password = process.security.Hash(req.query.password)
    delete PWResetCache[req.query.email]
    return await Users.updateOne({ email: req.query.email }, { $set: { security: user.security } }).then(() => res.status(200).send('Password reset successful!'))
}



module.exports = {
    GetData: GetData,
    Create: Create,
    Login: Login,
    InitiatePasswordReset: InitiatePasswordReset,
    ResetPassword: ResetPassword
}