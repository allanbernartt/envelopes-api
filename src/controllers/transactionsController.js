const { validationResult } = require('express-validator')
const pool = require('../../config/index')
const { transactionQueries, transactionsEndpoints, envelopeTransactionsQuery } = require('../utils/queryUtils')

//DEPOSIT

// @desc		Add deposit to envelope
// @route		POST /api/1.0/transactions/:id/deposit
exports.postDepositEnvelopeById = async (req, res) => {

    const errors = validationResult(req)

    if (!errors.isEmpty()) {
        const validationErrors = {}
        errors.array().forEach(e => {
            validationErrors[e.param] = e.msg
        })
        return res.status(400).send({ validationErrors: validationErrors })
    }

    const envelopeDestinationId = req.params.id
    const budget = parseFloat(req.body.budget);

    try {
        await pool.query('BEGIN')
        const result = await envelopeTransactionsQuery(transactionsEndpoints.depositEndpoint, budget, req.user_id, envelopeDestinationId)
        if (result.rows.length > 0) {
            const total_budget = await setOrUpdateTotalBudget(req.user_id, budget)
            await transactionQueries(transactionsEndpoints.depositEndpoint, req.user_id, budget, result.rows[0].env_id)
            await pool.query('COMMIT')
            return res.status(202).send({ destinationEnvelope: result.rows[0], totalBudget: total_budget })
        } else {
            throw new Error('not found')
        }
    } catch (error) {

        await pool.query('ROLLBACK')
        if (error.message === 'not found') {
            return res.status(404).send({ validationErrors: { invalidId: req.t('envelopeNotFound') } })
        }
        return res.status(500).send(error)
    }
}

//WITHDRAW

// @desc		Subtracts amount from envelope
// @route		POST /api/1.0/transactions/:id/withdraw
exports.postWithdrawEnvelopeById = async (req, res) => {

    const errors = validationResult(req)

    if (!errors.isEmpty()) {
        const validationErrors = {}
        errors.array().forEach(e => {
            validationErrors[e.param] = e.msg
        })
        return res.status(400).send({ validationErrors: validationErrors })
    }

    const envelopeDestinationId = req.params.id
    const budget = parseFloat(req.body.budget);

    try {
        await pool.query('BEGIN')

        const oldTotalBudget = await pool.query('SELECT * FROM total_budget WHERE user_id = ($1)', [req.user_id])

        if (oldTotalBudget.rowCount === 0) {
            throw new Error('no deposits')
        }

        if (oldTotalBudget.rows[0].total_budget < budget) {
            throw new Error('Total Budget less than withdraw amount')
        }

        const getEnvelopeBudgetquery = `SELECT budget FROM envelopes WHERE user_id = ($1) AND env_id =  ($2);`
        const envelope = await pool.query(getEnvelopeBudgetquery, [req.user_id, envelopeDestinationId])

        if (envelope.rows.length === 0) {
            throw new Error('not found')
        }

        if (parseFloat(envelope.rows[0].budget) < budget) {
            await pool.query('ROLLBACK')
            return res.status(400).send({ validationErrors: { insufficientFunds: req.t('insufficientFunds') } })
        }
        const result = await envelopeTransactionsQuery(transactionsEndpoints.withdrawEndpoint, budget, req.user_id, envelopeDestinationId)
        const total_budget = await setOrUpdateTotalBudget(req.user_id, budget, transactionsEndpoints.withdrawEndpoint)

        await transactionQueries(transactionsEndpoints.withdrawEndpoint, req.user_id, budget, result.rows[0].env_id)
        await pool.query('COMMIT')
        return res.status(202).send({ destinationEnvelope: result.rows[0], totalBudget: total_budget })

    } catch (error) {

        await pool.query('ROLLBACK')

        if (error.message === 'not found') {

            return res.status(404).send({ validationErrors: { invalidId: req.t('envelopeNotFound') } })
        } else if (error.message === 'Total Budget less than withdraw amount') {
            return res.status(400).send({ validationErrors: { insufficientFunds: req.t('noFundsWithdraw') } })
        } else if (error.message === 'no deposits') {
            return res.status(400).send({ validationErrors: { insufficientFunds: req.t('noDepositsYet') } })
        }

        return res.status(500).send(error)
    }
}

//TRANSFER
// @desc		Add deposit to envelope
// @route		GET /api/1.0/transactions/:id/transfer
exports.getTransferById = async (req, res) => {
    const id = req.params.id
    try {
        await pool.query('BEGIN')
        const result = await pool.query('SELECT * FROM envelopes WHERE user_id = ($1) AND env_id = ($2)', [req.user_id, id])

        if (result.rows.length > 0) {
            const destinationEnvelopes = await pool.query('SELECT * FROM envelopes WHERE user_id = ($1) AND env_id NOT IN ($2)', [req.user_id, id])
            if (destinationEnvelopes.rowCount > 0) {
                const destinationEnvelopesArray = [...destinationEnvelopes.rows]

                await pool.query('COMMIT')
                return res.status(200).send({ sourceEnvelope: result.rows[0], destinationEnvelopesArray })

            } else {
                throw new Error('No Destination Envelopes')
            }

        } else {
            throw new Error('Envelope Not Found')
        }

    } catch (error) {
        await pool.query('ROLLBACK')

        if (error.message === 'Envelope Not Found') {
            return res.status(404).send({ validationErrors: { invalidId: req.t('envelopeNotFound') } })
        }

        if (error.message === 'No Destination Envelopes') {
            return res.status(400).send({ message: req.t('noDestinationEnvelope') })
        }

        return res.status(500).send()
    }
}

// @desc		Add deposit to envelope
// @route		POST /api/1.0/transactions/:id/transfer
exports.postTransferEnvelopeById = async (req, res) => {

    const errors = validationResult(req)

    if (!errors.isEmpty()) {
        const validationErrors = {}
        errors.array().forEach(e => {
            validationErrors[e.param] = e.msg
        })
        return res.status(400).send({ validationErrors: validationErrors })
    }
    const envelopeSourceId = req.params.id
    const { budget, destinationId } = req.body

    try {
        await pool.query('BEGIN')
        const result = await pool.query('SELECT * FROM envelopes WHERE user_id = ($1) AND env_id = ($2)', [req.user_id, envelopeSourceId])

        if (result.rowCount === 0) {
            throw new Error('source not found')
        }

        if (parseFloat(result.rows[0].budget) >= parseFloat(budget)) {

            const validDestination = await envelopeTransactionsQuery(transactionsEndpoints.transferEndpoint, budget, req.user_id, destinationId, envelopeSourceId)

            if (validDestination.rowCount === 0) {

                throw new Error('destination not found')
            }

            await transactionQueries(transactionsEndpoints.transferEndpoint, req.user_id, budget, validDestination.rows[0].env_id, envelopeSourceId)
            await pool.query('COMMIT')
            return res.status(200).send({ message: 'ok' })
        } else {
            throw new Error('insuficcient funds')
        }

    } catch (error) {

        await pool.query('ROLLBACK')

        if (error.message === 'insuficcient funds') {

            return res.status(400).send({ validationErrors: { insufficientFunds: req.t('noFundsSource') } })
        }

        if (error.message === 'source not found') {
            return res.status(404).send({ validationErrors: { source: req.t('noSourceEnvelope') } })
        }

        if (error.message === 'destination not found') {
            return res.status(404).send({ validationErrors: { source: req.t('destinationNotFound') } })
        }

        return res.status(500).send()
    }
}

//BUDGET UTIL FUNCTION
const setOrUpdateTotalBudget = async (user_id, budget, transactionType) => {

    const queryTotalBudget = 'SELECT * FROM total_budget WHERE user_id = ($1)'

    const total_budget = await pool.query(queryTotalBudget, [user_id])

    let updatedTotalBuget;
    if (total_budget.rowCount === 0) {

        const setTotalBudgetQuery = 'INSERT INTO total_budget (total_budget, user_id) VALUES($1, $2) RETURNING *'
        const insertTotalBudget = await pool.query(setTotalBudgetQuery, [budget, user_id])
        updatedTotalBuget = insertTotalBudget.rows[0]

    } else {

        let updateTotalBudgetQuery;

        if (transactionType && transactionType === transactionsEndpoints.withdrawEndpoint) {
            updateTotalBudgetQuery = 'UPDATE total_budget SET total_budget = (total_budget - $1) WHERE user_id = ($2) AND id = ($3) RETURNING *'
        
        } else {
            updateTotalBudgetQuery = 'UPDATE total_budget SET total_budget = total_budget + $1 WHERE user_id = ($2) AND id = ($3) RETURNING *'
        }

        const updateTotal = await pool.query(updateTotalBudgetQuery, [budget, user_id, total_budget.rows[0].id])

        updatedTotalBuget = updateTotal.rows[0]
    }

    return updatedTotalBuget
}


//OTHER AVAILABLE ROUTES FOR TEMPLATING


exports.getDepositEnvelopeById = async (req, res) => {

    const id = req.params.id
    try {

        const result = await pool.query('SELECT * FROM envelopes WHERE user_id = ($1) AND env_id = ($2)', [req.user_id, id])

        if (result.rows.length > 0) {
            return res.status(200).send({ destinationEnvelope: result.rows[0] })
        
        } else {
            return res.status(404).send({ validationErrors: { invalidId: req.t('envelopeNotFound') } })
        }

    } catch (error) {

        return res.status(500).send()
    }

}

exports.getWithdrawEnvelopeById = async (req, res) => {
    const id = req.params.id
    try {
        const result = await pool.query('SELECT * FROM envelopes WHERE user_id = ($1) AND env_id = ($2)', [req.user_id, id])

        if (result.rows.length > 0) {


            return res.status(200).send({ destinationEnvelope: result.rows[0] })
        } else {
            return res.status(404).send({ validationErrors: { invalidId: req.t('envelopeNotFound') } })
        }
    
    } catch (error) {
        return res.status(500).send()
    }
}
