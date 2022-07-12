const express = require('express')
const { check } = require('express-validator')
const {auth} = require('../middleware/auth')
const {getTransactionsLog} = require('../controllers/transactionsLogController')
const router = express.Router()

/**
 * @swagger
 * /api/1.0/transactions-log:
 *    get:
 *      summary: Get all transactions made for a existing envelope
 *      produces:
 *        - application/json
 *      tags:
 *        - Transactions Log      
 *      responses:
 *        "200":
 *          description: Returns array with Transactions Object
 *        "403":
 *          description: Auth Error message
 *        "500":
 *          description: Internal server error
 */
router.get('/', auth, getTransactionsLog)

module.exports = router