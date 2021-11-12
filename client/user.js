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

var UserCreateCache = {}
async function Create(req, res) {
    if (req.query.token !== process.env.security.token) {
        var required = ['name', 'password', 'email']
        if (required.some(x => !req.body[x])) return res.status(400).send('Missing parameter(s)')
    }

    var Users = await process.db.collection('users')
    if (await Users.findOne({ email: req.body.email })) return res.status(400).send('Email is taken!')
    //if (req.body.username.match(/[^a-zA-Z0-9_]/)) return res.status(400).send('Username can only contain letters, numbers and underscores')
    if (req.body.password.length < 8) return res.status(400).send('Password must be at least 8 characters long!')

    if (!req.body.code) {
        if (UserCreateCache[req.body.email]) delete UserCreateCache[req.body.email]
        UserCreateCache[req.body.email] = {
            code: crypto.randomBytes(10).toString('base64url'),
            password: req.body.password
        }
        setTimeout(() => { delete UserCreateCache[req.body.email] }, 1000 * 60 * 10)

        require('../util/email').send(req.body.email, 'Account Activation', `Hey ${req.body.name}, thankyou for creating an account with us, please use the following code to activate your account.\n\nActivation Code: ${UserCreateCache[req.body.email].code}`)
        return res.status(200).send('Account Code Sent!')
    } else {
        if (!UserCreateCache[req.body.email]) return res.status(400).send('This activation code has expired!')
        if (UserCreateCache[req.body.email].password !== req.body.password) return res.status(400).send('Passwords do not match!')
        if (UserCreateCache[req.body.email].code !== req.body.code) return res.status(400).send('Invalid activation code!')
        delete UserCreateCache[req.body.email]
    }

    var UUID = null
    while (!UUID) {
        tempUUID = crypto.randomUUID()
        if (!await Users.findOne({ _id: tempUUID })) UUID = tempUUID
    }

    var user = {
        _id: UUID,
        email: req.body.email,
        created: new Date(),
        display: {
            name: req.body.name,
            avatar: req.body.avatar || 'none'
        },
        security: {
            password: process.security.Hash(req.body.password),
            token: process.security.GenerateToken(),
            lastLoginAddress: req.ip
        },
        permissions: {
            administrator: false
        },
        details: {
            firstName: "",
            lastName: "",
            dob: "",
            gender: "None",
            personality: "None",
            business: "",
            bio: "",
            location: {
                address: "",
                apartment: "",
                city: "",
                state: "",
                country: "",
                zip: ""
            }
        },
        connections: {
            discord: {},
            steam: {},
            google: {},
            microsoft: {},
            github: {},
            patreon: {}
        }
    }

    if (req.query.token === process.env.security.token && req.query.service) {
        user.connections[req.query.service] = req.body.data
    }

    return await Users.insertOne(user).then(() => res.status(201).send(user))
}

async function Login(req, res) {
    if (!req.query.email || !req.query.password) return res.status(400).send('Missing parameter(s)')
    req.query.email = req.query.email.toLowerCase()
    var Users = await process.db.collection('users')
    var user = await Users.findOne({ email: req.query.email })
    if (!user) return res.status(400).send('Invalid email or password!')
    if (!process.security.Verify(req.query.password, user.security.password)) return res.status(400).send('Invalid email or password!')

    user.security.lastLoginAddress = req.ip
    await Users.updateOne({ email: req.query.email }, { $set: { security: user.security } })
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