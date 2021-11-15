const fs = require('fs')
const crypto = require('crypto')

async function GenerateToken(length) {
    var Users = await process.db.collection('users')
    var token
    while (!token) {
        var temp = crypto.randomBytes(length || 48).toString('base64url')
        if (!await Users.findOne({ "security.token": temp })) token = temp
    }
    return token
}

function Hash(string) {
    return crypto.createHash('sha256').update(process.env.security.seed + string).digest('hex')
}

function Verify(string, hash) {
    var ReceivedPassword = Hash(string)
    if (ReceivedPassword == hash) return true
    else return false
}

function Encrypt(string) {
    var encrypted = crypto.publicEncrypt(process.env.security.publicKey, Buffer.from(string))
    return encodeURI(encrypted.toString("base64url"))
}

function Decrypt(string) {
    var key = process.env.security.privateKey
    var passphrase = process.env.security.token
    try {
        var decrypted = crypto.privateDecrypt({ key, passphrase }, Buffer.from(string, "base64url"))
        return decrypted.toString("utf8")
    } catch {
        return "Failed to Decrypt"
    }
}

async function GenerateKeyPair() {
    crypto.generateKeyPair('rsa', {
        modulusLength: 4096,
        publicKeyEncoding: {
            type: 'spki',
            format: 'pem'
        },
        privateKeyEncoding: {
            type: 'pkcs8',
            format: 'pem',
            passphrase: process.env.security.token,
            cipher: "aes-256-cbc"
        }
    }, (err, publicKey, privateKey) => {
        if (err) throw err
        process.env.security.publicKey = publicKey
        process.env.security.privateKey = privateKey
        fs.writeFileSync('config.json', JSON.stringify(process.env, null, '\t'))
        process.exit(0)
    })
}



module.exports = {
    GenerateToken: GenerateToken,
    Hash: Hash,
    Verify: Verify,
    Encrypt: Encrypt,
    Decrypt: Decrypt,
    GenerateKeyPair: GenerateKeyPair
}