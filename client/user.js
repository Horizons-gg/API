const crypto = require('crypto')

module.exports = {

    Create: async function (req, res) {
        var required = ['username', 'password', 'email']
        if (required.some(x => !req.query[x])) return res.status(400).send('Missing parameter(s)')

        var Users = await process.db.collection('users')
        if (await Users.findOne({ username: req.query.username })) return res.status(400).send('Username is taken!')
        if (await Users.findOne({ email: req.query.email })) return res.status(400).send('Email is taken!')
        if (req.query.password.length < 8) return res.status(400).send('Password must be at least 8 characters long!')

        var user = {
            _id: crypto.randomUUID(),
            email: req.query.email,
            username: req.query.username,
            security: {
                password: process.security.Hash(req.query.password),
                token: process.security.GenerateToken(),
                lastLoginAddress: req.ip
            },
            created: new Date(),
        }

        return await Users.insertOne(user).then(() => res.status(200).send(user))
    }

}