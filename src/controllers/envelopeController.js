const { validationResult } = require('express-validator')
const { v4: uuidv4 } = require('uuid')
const pool = require('../../config/index')

// @desc		Get all Envelopes
// @route		GET /api/1.0/envelopes
exports.getEnvelope = async (req, res) => {
    
    try {
        await pool.query('BEGIN')
        const result = await pool.query('SELECT * FROM envelopes WHERE user_id = ($1) ORDER BY created_at ASC', [req.user_id])
        const total_budget = await pool.query('SELECT total_budget FROM total_budget WHERE user_id = ($1)', [req.user_id])

        await pool.query('COMMIT')
        return res.status(200).send({ envelopes: result.rows, total_budget: total_budget.rows[0] })

    } catch (error) {
        await pool.query('ROLLBACK')
        return res.status(500).send()
    }
}

// @desc		Get an Envelope
// @route		GET /api/1.0/envelopes/:id

exports.getEnvelopeById = async (req, res) => {

    const id = req.params.id
    const user_id = req.user_id

    try {
        await pool.query('BEGIN')
        const result = await pool.query('SELECT * FROM envelopes WHERE user_id = ($1) AND env_id = ($2)', [user_id, id])
        const total_budget = await pool.query('SELECT total_budget FROM total_budget WHERE user_id = ($1)', [user_id])
        await pool.query('COMMIT')
        if (result.rows.length > 0) {
            return res.status(200).send({ envelopes: result.rows[0], totalBudget: total_budget.rows[0] || '0.00' })
        } else {
            return res.status(404).send({ validationErrors: { invalidId: req.t('envelopeNotFound') } })
        }
    } catch (error) {
        await pool.query('ROLLBACK')
        return res.status(500).send()
    }
}

// @desc		Create an Envelope
// @route		POST /api/1.0/envelopes
exports.postEnvelope = async (req, res) => {

    const errors = validationResult(req)
    if (!errors.isEmpty()) {
        const validationErrors = {}

        errors.array().forEach(e => {
            validationErrors[e.param] = e.msg
        })

        return res.status(400).send({ validationErrors: validationErrors })
    }

    const { title } = req.body
    const user_id = req.user_id
    const env_id = uuidv4();
    const postQuery = 'INSERT INTO envelopes(env_id, user_id, title) VALUES($1, $2, $3) RETURNING env_id'
    const values = [env_id, user_id, title]
    try {
        const result = await pool.query(postQuery, values)
        const id = result.rows[0].env_id

        return res.status(201).send({ message: `Envelope created with id ${id}` })

    } catch (error) {
        return res.status(500).send()
    }
}

// @desc		Update an Envelope
// @route		PUT /api/1.0/envelopes/:id
exports.updateEnvelope = async (req, res) => {

    const errors = validationResult(req)
    if (!errors.isEmpty()) {
        const validationErrors = {}
        errors.array().forEach(e => {
            validationErrors[e.param] = e.msg
        })

        return res.status(400).send({ validationErrors: validationErrors })
    }
    const id = req.params.id
    const { title } = req.body
    try {

        const envelope = await pool.query('UPDATE envelopes SET title = ($1) WHERE user_id = ($2) AND env_id=$3', [title, req.user_id, id])

        if (envelope.rowCount === 0) {

            return res.status(404).send({ validationErrors: { message: req.t('envelopeNotFound') } })
        }
        return res.status(200).send({ message: 'ok' })
    } catch (error) {

        return res.status(500).send(error)
    }
}

// @desc		Delete an Envelope
// @route		DELETE /api/1.0/envelopes/:id
exports.deleteEnvelope = async (req, res) => {

    const id = req.params.id

    try {
        await pool.query('BEGIN')
        const deleteQuery = 'DELETE FROM envelopes WHERE env_id = ($1) RETURNING *';
        const removedEnvelope = await pool.query(deleteQuery, [id])
        if (removedEnvelope.rowCount < 1) {
            throw new Error('Envelope Not Found')
        }
        await pool.query('UPDATE total_budget SET total_budget = total_budget - $1', [removedEnvelope.rows[0].budget])
        await pool.query('COMMIT')

        return res.status(202).send({ message: `Envelope with id ${removedEnvelope.rows[0].env_id} was succesfully removed` })
    } catch (error) {

        await pool.query('ROLLBACK')
        if (error.message === 'Envelope Not Found') {
            return res.status(404).send({ validationErrors: { message: req.t('envelopeNotFound') } })
        }
        return res.status(500).send({ message: req.t('genericError') })
    }
}