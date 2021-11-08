var nodemailer = require('nodemailer')

function send(recipient, subject, body) {
    var transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.email.user,
            pass: process.env.email.password
        }
    })

    var mailOptions = {
        from: 'Horizons',
        to: recipient,
        subject: subject,
        text: body
    }

    transporter.sendMail(mailOptions, function (error, info) {
        if (error) {
            console.log(error)
        } else {
            console.log('Email sent: ' + info.response)
        }
    })
}

module.exports = {
    send: send
}