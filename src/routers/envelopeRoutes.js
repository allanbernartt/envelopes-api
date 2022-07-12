const express = require('express')
const { check } = require('express-validator')
const {auth} = require('../middleware/auth')
const { getEnvelope, postEnvelope, updateEnvelope, getEnvelopeById, deleteEnvelope } = require('../controllers/envelopeController')
const router = express.Router()

/**
 * @swagger
 * /api/1.0/envelopes:
 *    get:
 *      summary: Get all envelopes
 *      produces:
 *        - application/json
 *      tags:
 *        - Envelopes
 *      responses:
 *        "200":
 *          description: Returns array with all envelopes
 *        "403":
 *          description: Auth Error message
 *        "500":
 *          description: Internal server error
 *
 */
router.get('/', auth, getEnvelope)


/**
 * @swagger
 * /api/1.0/envelopes/{id}:
 *    get:
 *      summary: Get an envelope by ID
 *      produces:
 *        - application/json
 *      tags:
 *        - Envelopes
 *      parameters:
 *        - in: path
 *          name: id
 *          description: envelope id
 *          type: string
 *          required: true
 *          example: 2g5flx8a-3res-9999-1s0z-ns3n91h2kl71
 *      responses:
 *        "200":
 *          description: Returns envelope data and current Total Budget
 *        "403":
 *          description: Auth Error message
 *        "404":
 *          description: Envelope not found
 *        "500":
 *          description: Internal server error
 */
router.get('/:id', auth, getEnvelopeById)


/**
 * @swagger
 * /api/1.0/envelopes:
 *    post:
 *      summary: Creates a new envelope
 *      produces:
 *        - application/json
 *      tags:
 *        - Envelopes
 *      requestBody:
 *        description: Data for new envelope
 *        required: true
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                title:
 *                  type: string                
 *              example:
 *                title: Groceries                
 *      responses:
 *        "201":
 *          description: Returns success message and envelope id
 *        "400":
 *          description: Request Body Errors
 *        "403":
 *          description: Authentication Error   
 *        "500":
 *          description: Internal server error
 */
router.post('/', auth,
check('title').trim().notEmpty().withMessage((value, {req}) => {
    return req.t('emptyField')
}).bail()
.isLength({min:2, max:14}).withMessage((value, {req})=> {
    return req.t('titleError')
}),
postEnvelope)

/**
 * @swagger
 * /api/1.0/envelopes/{id}:
 *    put:
 *      summary: Updates the title of an existing envelope
 *      produces:
 *        - application/json
 *      tags:
 *        - Envelopes
 *      parameters:
 *        - in: path
 *          name: id
 *          description: envelope ID
 *          type: string
 *          required: true
 *          example: 2g5flx8a-3res-9999-1s0z-ns3n91h2kl71
 *      requestBody:
 *        description: New title for existing envelope
 *        required: true
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                title:
 *                  type: string                
 *              example:
 *                title: Groceries               
 *      responses:
 *        "200":
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
router.put('/:id', auth,
check('title').trim().notEmpty().withMessage((value, {req}) => {
    return req.t('emptyField')
}).bail()
.isLength({min:2, max:14}).withMessage((value, {req})=> {
    return req.t('titleError')
}),
updateEnvelope)

/**
 * @swagger
 * /api/1.0/envelopes/{id}:
 *    delete:
 *      summary: Deletes an individual envelope
 *      produces:
 *        - application/json
 *      tags:
 *        - Envelopes
 *      parameters:
 *        - in: path
 *          name: id
 *          description: Envelope ID to delete
 *          type: string
 *          required: true
 *          example: 2g5flx8a-3res-9999-1s0z-ns3n91h2kl71
 *      responses:
 *        "202":
 *          description: Success message with Id of deleted Envelope
 *        "403":
 *          description: Authentication Error   
 *        "404":
 *          description: Envelope not found
 *        "500":
 *          description: Internal server error *       
 */
router.delete('/:id', auth, deleteEnvelope)

module.exports = router