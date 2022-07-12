const express = require('express')
const { check } = require('express-validator')
const {auth} = require('../middleware/auth')
const { getDepositEnvelopeById, postDepositEnvelopeById, getWithdrawEnvelopeById, postWithdrawEnvelopeById, getTransferById, postTransferEnvelopeById } = require('../controllers/transactionsController')
const router = express.Router()

//deposit

/**
 * @swagger
 * /api/1.0/transactions/{id}/deposit:
 *    post:
 *      summary: Deposit Transaction
 *      produces:
 *        - application/json
 *      tags:
 *        - Transactions
 *      parameters:
 *        - in: path
 *          name: id
 *          description: envelope ID
 *          type: string
 *          required: true
 *          example: 2g5flx8a-3res-9999-1s0z-ns3n91h2kl71
 *      requestBody:
 *        description: Adds amount to Envelope
 *        required: true
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                budget:
 *                  type: float/integer                
 *              example:
 *                budget: 100.00               
 *      responses:
 *        "202":
 *          description: Returns updated Total Budget and Envelope budget
 *        "400":
 *          description: Request Body Errors
 *        "403":
 *          description: Authentication Error 
 *        "404":
 *          description: Envelope not found
 *        "500":
 *          description: Internal server error
 */
router.post('/:id/deposit', 
auth,
check('budget').notEmpty().withMessage((value, {req})=> {
    return req.t('emptyField')
}).bail()
.isNumeric().withMessage((value, {req})=> {
    return req.t('numericField')
}),
postDepositEnvelopeById);

//withdraw

/**
 * @swagger
 * /api/1.0/transactions/{id}/withdraw:
 *    post:
 *      summary: Withdraw Transaction
 *      produces:
 *        - application/json
 *      tags:
 *        - Transactions
 *      parameters:
 *        - in: path
 *          name: id
 *          description: envelope ID
 *          type: string
 *          required: true
 *          example: 2g5flx8a-3res-9999-1s0z-ns3n91h2kl71
 *      requestBody:
 *        description: Subtracts amount from Envelope
 *        required: true
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                budget:
 *                  type: float/integer                
 *              example:
 *                budget: 100.00               
 *      responses:
 *        "202":
 *          description: Returns updated Total Budget and Envelope data
 *        "400":
 *          description: Request Body Errors
 *        "403":
 *          description: Authentication Error 
 *        "404":
 *          description: Envelope not found
 *        "500":
 *          description: Internal server error
 */
router.post('/:id/withdraw', 
auth,
check('budget').trim().notEmpty().withMessage((value, {req})=> {
    return req.t('emptyField')
}).bail()
.isNumeric().withMessage((value, {req})=> {
    return req.t('numericField')
}),
postWithdrawEnvelopeById)


//transfer

/**
 * @swagger
 * /api/1.0/transactions/{id}/transfer:
 *    get:
 *      summary: Transfer Transaction
 *      produces:
 *        - application/json
 *      tags:
 *        - Transactions
 *      parameters:
 *        - in: path
 *          name: id
 *          description: envelope ID
 *          type: string
 *          required: true
 *          example: 2g5flx8a-3res-9999-1s0z-ns3n91h2kl71                 
 *      responses:
 *        "200":
 *          description: Returns Source Envelope and Array with Possible destination Envelopes
 *        "400":
 *          description: Request Body Errors
 *        "403":
 *          description: Authentication Error   
 *        "404":
 *          description: Envelope not found
 *        "500":
 *          description: Internal server error
 */
router.get('/:id/transfer', auth, getTransferById)


/**
 * @swagger
 * /api/1.0/transactions/{id}/transfer:
 *    post:
 *      summary: Transfer Transaction
 *      produces:
 *        - application/json
 *      tags:
 *        - Transactions
 *      parameters:
 *        - in: path
 *          name: id
 *          description: Source envelope ID
 *          type: string
 *          required: true
 *          example: 2g5flx8a-3res-9999-1s0z-ns3n91h2kl71
 *      requestBody:
 *        description: Transfer an amount from Source Envelope to Destination Envelope
 *        required: true
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                destinationId: string
 *                budget:
 *                  type: integer                
 *              example:
 *                destinatonId: 10a-34s
 *                budget: 100.00                  
 *      responses:
 *        "202":
 *          description: Returns success message 
 *        "400":
 *          description: Request Body Errors
 *        "403":
 *          description: Authentication Error 
 *        "404":
 *          description: Envelope not found
 *        "500":
 *          description: Internal server error
 */
router.post('/:id/transfer', auth, 
check('budget').trim().notEmpty().withMessage((value, {req})=> {
    return req.t('emptyField')
}).bail()
.isNumeric().withMessage((value, {req})=> {
    return req.t('numericField')
}),
check('destinationId').notEmpty().withMessage((value, {req})=> {
    return req.t('selectDestination')
}),
postTransferEnvelopeById)

//OTHER AVAILABLE ROUTES FOR TEMPLATING
router.get('/:id/deposit', auth, getDepositEnvelopeById);
router.get('/:id/withdraw', auth, getWithdrawEnvelopeById);

module.exports = router






