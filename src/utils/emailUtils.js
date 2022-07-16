const crypto = require('crypto')
const pool = require('../../config/index')
const bcrypt = require('bcryptjs')
const sgMail = require('@sendgrid/mail')
const { userRegistrationConfig, userEndpoints, frontEndDomain } = require('./utils')
const { v4: uuidv4 } = require('uuid')

if(process.env.NODE_ENV === 'production') {
    sgMail.setApiKey(process.env.SEND_GRID)
}
const emailMessageAccountActivation = (emailToken, req) => {
    return {
        subject: req.t('accountActivationSubject'),
        text: req.t('accountActivationText'),
        html: `
        ${req.t('accountActivationHTMLmessage')}
        </br>
        <a href="${frontEndDomain}/users/account/${emailToken}">${req.t('accountActivationClick')}</a>
        `
    }
}

const emailMessagePasswordReset = (emailToken, req) => {
    return {
        subject: req.t('passwordResetSubject'),
        text: req.t('passwordResetText'),
        html: `
        ${req.t('passwordResetHTMLmessage')}
        </br>
        <a href="${frontEndDomain}/users/account/password-reset/${emailToken}">${req.t('passwordResetClick')}</a>
        `
    }
}

exports.sendEmail = async (endpoint, res, user_name, user_email, password, req) => {
        
    crypto.randomBytes(32, async (err, buffer) => {
        if (err) {
            throw err
        }

        const emailToken = buffer.toString('hex')
        let date = new Date(Date.now() + userRegistrationConfig.emailTokenExpiration)

        if (endpoint === userEndpoints.register) {
            const hashedPass = await bcrypt.hash(password, 12)
            const user_id = uuidv4();
            await pool.query('INSERT INTO users (user_id, user_name, user_email, password, activation_tk, activation_tk_date) VALUES ($1, $2, $3, $4, $5, $6)', [user_id, user_name, user_email, hashedPass, emailToken, date.toISOString()])
            await pool.query('COMMIT')
            res.status(201).send({ message: 'User Created Successfully' })

        } else if (endpoint === userEndpoints.resendAccountActivation) {
            await pool.query('UPDATE users SET activation_tk = ($1), activation_tk_date = ($2) WHERE user_email = ($3)', [emailToken, date.toISOString(), user_email])
            await pool.query('COMMIT')
            res.status(200).send({ message: 'OK' })
        } else if (endpoint === userEndpoints.passwordResetEmail) {
            await pool.query('UPDATE users SET pass_token = ($1), pass_tk_date = ($2) WHERE user_email = ($3)', [emailToken, date.toISOString(), user_email])
            await pool.query('COMMIT')
            res.status(200).send({ message: 'Email Sent' })
        }

        let mailMsg;
        if(endpoint === userEndpoints.register || endpoint === userEndpoints.resendAccountActivation){
            
            mailMsg =  emailMessageAccountActivation(emailToken, req)
       
        } else if(endpoint === userEndpoints.passwordResetEmail) {
            
            mailMsg = emailMessagePasswordReset(emailToken, req)
        }      

        const msg = {
            to: user_email,
            from: process.env.EMAIL_SENDER,
            subject: mailMsg.subject,
            text: mailMsg.text,
            html: mailMsg.html
        }
        
        if (process.env.NODE_ENV === 'test') {
            console.log('DO NOT SEND EMAIL')
        } else {
            sgMail
                .send(msg)
                .then(() => {
                    console.log('Email sent')
                })
                .catch((error) => {
                    //console.error('email error', error)
                })
        }
    })// crypto
}

