const bcrypt = require('bcryptjs')
const pool = require('../../config/index')
const { userEndpoints } = require('../utils/utils')
const { sendEmail } = require('../utils/emailUtils')
const { validationResult } = require('express-validator')
const jwt = require('jsonwebtoken')
require('dotenv').config()

// @desc		Creates a new user
// @route		POST /api/1.0/users/register
exports.postUserRegistration = async (req, res) => {

    const errors = validationResult(req)

    if (!errors.isEmpty()) {
        const validationErrors = {}
        errors.array().forEach(e => {
            validationErrors[e.param] = e.msg
        })
        return res.status(400).json({ validationErrors: validationErrors })
    }

    try {
        const { user_name, user_email, password } = req.body

        await sendEmail(userEndpoints.register, res, user_name, user_email, password, req)

    } catch (error) {

        return res.status(500).send()
    }
}

// @desc		Logs User in
// @route		POST /api/1.0/users/login
exports.postLogin = async (req, res) => {

    const errors = validationResult(req)

    if (!errors.isEmpty()) {
        const validationErrors = {}
        errors.array().forEach(e => {
            validationErrors[e.param] = e.msg
        })

        return res.status(400).json({ validationErrors: validationErrors })
    }

    const { user_email, password } = req.body

    try {
        await pool.query('BEGIN')
        const user = await pool.query('SELECT * FROM users WHERE user_email = ($1)', [user_email])
        if (user.rowCount === 0) {

            throw new Error('no user found')
        }

        const isPassValid = await bcrypt.compare(password, user.rows[0].password)

        if (!isPassValid) {

            throw new Error('invalid pass')
        }

        if (!user.rows[0].activated) {

            throw new Error('activation')
        }

        let token;
        if (process.env.NODE_ENV === 'test') {
            token = jwt.sign({ id: user.rows[0].user_id }, process.env.TOKEN_SECRET, { expiresIn: "3000" })
        } else {//2000   "1 day"
            token = jwt.sign({ id: user.rows[0].user_id, token: token }, process.env.TOKEN_SECRET, { expiresIn: "1 day" })
        }

        await pool.query(`UPDATE users SET tokens = array_append(tokens, ($1)) WHERE user_id = ($2) RETURNING *`, [token, user.rows[0].user_id])

        await pool.query('COMMIT')

        return res.status(200).send({ userId: user.rows[0].user_id, token: token })

    } catch (error) {
        
        await pool.query('ROLLBACK')

        if (error.message === 'activation') {
            return res.status(403).json({ emailErrorMessage: req.t('pleaseActiveAccount') })
        }
       
        return res.status(404).json({ message: req.t('loginError') })
    }
}

// @desc		Activate Account
// @route		GET /api/1.0/users/account-activation/:token
exports.getAccountActivation = async (req, res) => {
    
    const activation_tk = req.params.token

    if (!activation_tk) {

        return res.status(400).send()
    }

    try {
        await pool.query('BEGIN')
        const user = await pool.query('SELECT * FROM users WHERE activation_tk = ($1)', [activation_tk])

        if (user.rowCount === 0) {

            throw new Error('Invalid Token')
        }

        const dateNow = new Date(Date.now())
        const dbDate = new Date(user.rows[0].activation_tk_date)

        const isValidDate = dbDate > dateNow

        if (!isValidDate) {

            throw new Error('Invalid Token')
        }

        await pool.query('UPDATE users SET activation_tk_date = ($1), activated = ($2), activation_tk = ($3) WHERE activation_tk = ($4)', [null, true, null, activation_tk])

        await pool.query('COMMIT')
        return res.status(200).send({ message: 'OK' })

    } catch (error) {
        
        await pool.query('ROLLBACK')

        if (error.message === 'Invalid Token') {
            return res.status(400).send({ message: req.t('invalidToken') })
        }

        return res.status(500).send()
    }


}

// @desc		Resend Activation Email
// @route		POST /api/1.0/users/resend-activation-email
exports.postResendAccountActivation = async (req, res) => {
    const { user_email } = req.body
    const errors = validationResult(req)

    if (!errors.isEmpty()) {
        const validationErrors = {}
        errors.array().forEach(e => {
            validationErrors[e.param] = e.msg
        })
        return res.status(400).send({ validationErrors: validationErrors })
    }

    try {
        await pool.query('BEGIN')
        const user = await pool.query('SELECT user_email FROM users WHERE user_email = ($1)', [user_email])

        if (user.rowCount === 0) {
            throw new Error('No User Found')
        }

        await sendEmail(userEndpoints.resendAccountActivation, res, null, user_email, null, req)

    } catch (error) {

        await pool.query('ROLLBACK')

        if (error.message === 'No User Found') {
            return res.status(404).json({ message: req.t('noUserFound') })
        }
        return res.status(500).send()
    }
}

// @desc		Password Reset
// @route		POST /api/1.0/users/password-reset
exports.postSendPasswordResetEmail = async (req, res) => {

    const errors = validationResult(req)

    if (!errors.isEmpty()) {
        const validationErrors = {}
        errors.array().forEach(e => {
            validationErrors[e.param] = e.msg
        })
        return res.status(400).send({ validationErrors: validationErrors })
    }

    try {
        const { user_email } = req.body
        await pool.query('BEGIN')
        const isValidUser = await pool.query('SELECT * FROM users WHERE user_email = ($1)', [user_email])

        if (isValidUser.rowCount === 0) {
            throw new Error('Invalid Email')
        }
        
        await sendEmail(userEndpoints.passwordResetEmail, res, null, user_email, null, req)

    } catch (error) {
        await pool.query('ROLLBACK')

        if (error.message === 'Invalid Email') {
            return res.status(404).send({ validationErrors: { invalidEmail: req.t('invalidEmail') } })
        }

        return res.status(500).send()
    }

}

// @desc		Password Reset
// @route		GET /api/1.0/users/password-reset/:token
exports.getPasswordResetToken = async (req, res) => {

    const pass_token = req.params.token

    if (!pass_token) {
        return res.status(400).send()
    }

    try {
        await pool.query('BEGIN')
        const user = await pool.query('SELECT * FROM users WHERE pass_token = ($1)', [pass_token])

        if (user.rowCount === 0) {

            throw new Error('Invalid Token')
        }

        const dateNow = new Date(Date.now())
        const dbDate = new Date(user.rows[0].pass_tk_date)

        const isValidDate = dbDate > dateNow

        if (!isValidDate) {

            throw new Error('Invalid Token')
        }

        await pool.query('COMMIT')
        return res.status(200).send({ message: 'ok' })

    } catch (error) {

        await pool.query('ROLLBACK')
        if (error.message === 'Invalid Token') {
            return res.status(400).send({ message: req.t('invalidToken') })
        }

        return res.status(500).send()
    }

}
// @desc		Reset Password
// @route		POST /api/1.0/users/password-reset/:token
exports.postNewPassword = async (req, res) => {

    const errors = validationResult(req)

    if (!errors.isEmpty()) {
        const validationErrors = {}
        errors.array().forEach(e => {
            validationErrors[e.param] = e.msg
        })
        return res.status(400).send({ validationErrors: validationErrors })
    }
    const pass_token = req.params.token

    if (!pass_token) {

        return res.status(404).send({ message: req.t('invalidToken') })
    }

    const { new_password } = req.body

    try {
        await pool.query('BEGIN')
        const user = await pool.query('SELECT user_id FROM users WHERE pass_token = ($1)', [pass_token])

        if (user.rowCount === 0) {

            throw new Error('User not Found')
        }

        const hashedPass = await bcrypt.hash(new_password, 12)

        await pool.query('UPDATE users SET password = ($1), pass_token = ($2), pass_tk_date = ($3) WHERE user_id = ($4)', [hashedPass, null, null, user.rows[0].user_id])

        await pool.query('COMMIT')
        return res.status(200).send({ message: 'ok' })

    } catch (error) {

        await pool.query('ROLLBACK')
        if (error.message === 'User not Found') {
            return res.status(404).send({ message: req.t('invalidToken') })
        }

        return res.status(500).send()
    }
}

// @desc		Logs user out
// @route		POST /api/1.0/users/logout
exports.postLogout = async (req, res) => {

    const user_id = req.user_id
    try {
        await pool.query('BEGIN')
        await pool.query('UPDATE users set tokens = array_remove(tokens, ($1)) WHERE user_id = ($2)', [req.token, user_id])
        await pool.query('COMMIT')
        return res.send({ message: 'ok' })
    
    } catch (error) {
        await pool.query('ROLLBACK')
        return res.status(500).send()
    }
}

// @desc		Logs all devices out
// @route		POST /api/1.0/users/logout-all
exports.postLogoutAll = async (req, res) => {

    const user_id = req.user_id
    try {
        await pool.query('BEGIN')
        await pool.query('UPDATE users set tokens = ($1) where user_id = ($2)', ['{}', user_id])
        await pool.query('COMMIT')
        return res.send({ message: 'ok' })
    } catch (error) {
        await pool.query('ROLLBACK')
        return res.status(500).send()
    }
}

//OTHER AVAILABLE ROUTES FOR TEMPLATING

exports.getUserRegistration = async (req, res) => {
    return res.status(200).send()
}

exports.getEmailSent = (req, res) => {
    return res.send()
}

exports.getLogin = async (req, res) => {
    return res.send()
}

exports.getResendAccountActivation = async (req, res) => {
    return res.status(200).send()
}

exports.getSendPasswordResetEmail = async (req, res) => {
    return res.status(200).send()
}
