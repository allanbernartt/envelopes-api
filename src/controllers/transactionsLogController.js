const pool = require('../../config/index')
const {joinTransactionsQuery} = require('../utils/queryUtils')

// @desc		All Transactions made
// @route		GET /api/1.0/transactions-log
exports.getTransactionsLog = async (req, res) => {
    try {
        await pool.query('BEGIN')
        const logs = await joinTransactionsQuery(req.user_id)
      
        if(logs.length > 0) {
            await pool.query('COMMIT')
            
            return res.status(200).send({data: logs})
        } else {
            await pool.query('COMMIT')
            return res.status(200).send({data: []})
        }        
        
    } catch (error) {
        
        await pool.query('ROLLBACK')
        return res.status(500).send()
    }
   
}